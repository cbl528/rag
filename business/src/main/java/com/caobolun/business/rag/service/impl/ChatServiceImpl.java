package com.caobolun.business.rag.service.impl;

import cn.hutool.core.util.IdUtil;
import cn.hutool.core.util.StrUtil;
import com.caobolun.ai.client.OpenAICompatibleClient;
import com.caobolun.business.rag.memory.ConversationMemoryService;
import com.caobolun.business.rag.service.ChatService;
import com.caobolun.business.rag.service.RagSearchService;
import com.caobolun.framework.callback.StreamCallback;
import com.caobolun.framework.convention.ChatMessage;
import com.caobolun.framework.web.SseEmitterSender;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChatServiceImpl implements ChatService {

    private final OpenAICompatibleClient openAICompatibleClient;
    private final ConversationMemoryService memoryService;
    private final RagSearchService ragSearchService;

    @Override
    public void streamChat(String userMessage, String sessionId, SseEmitterSender sender) {
        // 1. sessionId 为空则自动生成
        String actualSessionId = StrUtil.isBlank(sessionId)
                ? IdUtil.fastSimpleUUID() : sessionId;

        // 2. 先告诉前端本次会话 ID
        sender.sendEvent("session", actualSessionId);

        // 3. 加载历史 + 保存用户消息
        ChatMessage userMsg = ChatMessage.user(userMessage);
        List<ChatMessage> history = memoryService.loadAndAppend(actualSessionId, userMsg);

        // 4. RAG 检索：将相关知识注入上下文
        String ragContext = ragSearchService.searchAsContext(userMessage);

        // 5. 构造完整消息列表
        List<ChatMessage> messages = new ArrayList<>();
        if (!ragContext.isEmpty()) {
            messages.add(ChatMessage.system("你是一个知识库问答助手。" +
                    "请基于以下提供的知识库文档片段回答用户问题。" +
                    "如果文档片段不足以回答问题，如实告知用户你不知道，" +
                    "不要编造信息。\n\n" + ragContext));
        }
        if (history != null) {
            messages.addAll(history);
        }
        messages.add(userMsg);

        // 6. 流式调用 LLM
        StringBuilder fullAnswer = new StringBuilder();
        openAICompatibleClient.streamChat(messages, new StreamCallback() {
            @Override
            public void onContent(String content) {
                try {
                    fullAnswer.append(content);
                    sender.sendEvent("message", content);
                } catch (Exception e) {
                    log.warn("SSE 推送失败，客户端可能已断开", e);
                }
            }

            @Override
            public void onComplete() {
                try {
                    // 保存 assistant 回复
                    memoryService.append(actualSessionId,
                            ChatMessage.assistant(fullAnswer.toString()));
                    sender.sendEvent("done", "[DONE]");
                    sender.complete();
                } catch (Exception e) {
                    log.warn("发送结束事件失败", e);
                }
            }

            @Override
            public void onError(Throwable error) {
                log.error("流式调用失败", error);
                sender.fail(error);
            }
        });
    }
}
