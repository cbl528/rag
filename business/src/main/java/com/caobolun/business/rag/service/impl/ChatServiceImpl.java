package com.caobolun.business.rag.service.impl;

import cn.hutool.core.util.IdUtil;
import cn.hutool.core.util.StrUtil;
import com.caobolun.ai.client.OpenAICompatibleClient;
import com.caobolun.business.rag.memory.ConversationMemoryService;
import com.caobolun.business.rag.rewrite.QueryRewriteService;
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
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChatServiceImpl implements ChatService {

    private final OpenAICompatibleClient openAICompatibleClient;
    private final ConversationMemoryService memoryService;
    private final RagSearchService ragSearchService;
    private final QueryRewriteService queryRewriteService;
    // 引入动态线程池
    private final Executor chatStreamExecutor;      // SSE 流式专用
    private final Executor asyncTaskExecutor;        // fire-and-forget 任务

    @Override
    public void streamChat(String userMessage, String sessionId, SseEmitterSender sender) {
        // 1. sessionId 为空则自动生成
        String actualSessionId = StrUtil.isBlank(sessionId)
                ? IdUtil.fastSimpleUUID() : sessionId;

        // 2. 先告诉前端本次会话 ID
        sender.sendEvent("session", actualSessionId);

        CompletableFuture.runAsync(() -> {
            try {
                // 3. 加载历史 + 保存用户消息
                ChatMessage userMsg = ChatMessage.user(userMessage);
                List<ChatMessage> history = memoryService.loadAndAppend(actualSessionId, userMsg);
                boolean historyEmpty = history.isEmpty();

                // 4. 【新增】语义替换：改写用户问题，将代词替换为具体实体
                //    改写后的查询用于 RAG 检索，原始问题仍用于 LLM 对话
                String searchQuery = queryRewriteService.rewrite(userMessage, history);

                // 5. RAG 检索：使用改写后的查询（已消解代词）
                String ragContext = ragSearchService.searchAsContext(searchQuery);

                // 6. 构造完整消息列表
                List<ChatMessage> messages = new ArrayList<>();
                if (!ragContext.isEmpty()) {
                    messages.add(ChatMessage.system("你是一个知识库问答助手。" +
                            "请基于以下提供的知识库文档片段回答用户问题。" +
                            "如果文档片段不足以回答问题，如实告知用户你不知道，" +
                            "不要编造信息。\n\n" + ragContext));
                }
                if (!historyEmpty) {
                    messages.addAll(history);
                }
                messages.add(userMsg);

                // 7. 流式调用 LLM
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

                        // ★ 标题生成 → fire-and-forget 到 asyncTaskExecutor
                        //    SSE [DONE] 已发出，用户能马上看到完成，标题在后台慢慢生成
                        if (historyEmpty) {
                            CompletableFuture.runAsync(() ->
                                    generateAndUpdateTitle(
                                            actualSessionId,
                                            userMessage,
                                            fullAnswer.toString()), asyncTaskExecutor);
                        }
                    }

                    @Override
                    public void onError(Throwable error) {
                        log.error("流式调用失败", error);
                        sender.fail(error);
                    }
                });
            } catch (Exception e) {
                log.error("流式对话异常", e);
                sender.fail(e);
            }
        }, chatStreamExecutor);
    }

    /**
     * 标题生成：抽成独立方法，方便异步调用
     */
    private void generateAndUpdateTitle(String sessionId,
                                        String userMessage, String assistantMessage) {
        try {
            String title = openAICompatibleClient.chat(List.of(
                    ChatMessage.system("你是一个对话标题生成助手。请根据用户的问题和助手的回答，生成一个简短（不超过20字）的对话标题，不要加引号，直接输出。"),
                    ChatMessage.user(userMessage),
                    ChatMessage.assistant(assistantMessage)
            ));
            if (StrUtil.isNotBlank(title)) {
                memoryService.updateTitle(sessionId, title.trim());
            }
        } catch (Exception e) {
            log.warn("标题生成失败，保持原截取标题", e);
        }
    }

}
