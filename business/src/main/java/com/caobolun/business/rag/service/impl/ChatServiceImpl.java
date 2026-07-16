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
    private final Executor llmSyncExecutor;
    private final Executor ragSearchExecutor;

    @Override
    public void streamChat(String userMessage, String sessionId, SseEmitterSender sender) {
        // 1. sessionId 为空则自动生成
        String actualSessionId = StrUtil.isBlank(sessionId)
                ? IdUtil.fastSimpleUUID() : sessionId;

        // 2. 先告诉前端本次会话 ID
        sender.sendEvent("session", actualSessionId);
        ChatMessage userMsg = ChatMessage.user(userMessage);

        CompletableFuture
                // 1. 加载历史 + 保存用户信息
                .supplyAsync(() -> {
                    List<ChatMessage> history = memoryService.loadAndAppend(actualSessionId, userMsg);
                    // ★ 新会话 → 立刻异步生成标题（与主链路并行，不等回答）
                    if (history.isEmpty()) {
                        CompletableFuture.runAsync(
                                () -> generateTitleFromQuestion(actualSessionId, userMessage),
                                asyncTaskExecutor);
                    }
                    return new ChatContext(userMsg, history, history.isEmpty(), actualSessionId);
                }, chatStreamExecutor)
                // 2. 执行查询改写
                .thenApplyAsync(ctx -> {
                    ctx.searchQuery = queryRewriteService.rewrite(userMessage, ctx.history);
                    return ctx;
                }, llmSyncExecutor)
                .thenApplyAsync(ctx -> {
                    ctx.ragContext = ragSearchService.searchAsContext(ctx.searchQuery);
                    return ctx;
                }, ragSearchExecutor)
                .thenAcceptAsync(ctx -> {
                    List<ChatMessage> messages = new ArrayList<>();
                    if (!ctx.ragContext.isEmpty()) {
                        messages.add(ChatMessage.system("你是一个知识库问答助手。" +
                                "请基于以下提供的知识库文档片段回答用户问题。" +
                                "如果文档片段不足以回答问题，如实告知用户你不知道，" +
                                "不要编造信息。\n\n" + ctx.ragContext));
                    }
                    if (!ctx.historyEmpty) {
                        // 将历史会话添加到聊天信息
                        messages.addAll(ctx.history);
                    }
                    messages.add(ctx.userMsg);

                    StringBuilder fullAnswer = new StringBuilder();
                    openAICompatibleClient.streamChat(messages, new StreamCallback() {
                        @Override
                        public void onContent(String content) {
                            fullAnswer.append(content);
                            sender.sendEvent("message", content);
                        }

                        @Override
                        public void onComplete() {
                            memoryService.append(ctx.actualSessionId,
                                    ChatMessage.assistant(fullAnswer.toString()));
                            sender.sendEvent("done", "[DONE]");
                            sender.complete();
                        }

                        @Override
                        public void onError(Throwable error) {
                            log.error("流式调用失败", error);
                            sender.fail(error);
                        }
                    });
                }, chatStreamExecutor)
                .exceptionally(e -> {
                    log.error("流式对话异常", e);
                    if (e.getCause() != null) {
                        sender.fail(new RuntimeException(e.getCause()));
                    } else {
                        sender.fail(new RuntimeException(e));
                    }
                    return null;
                });

    }

    /**
     * 仅根据用户问题生成标题（不等回答，与主流程并行）
     */
    private void generateTitleFromQuestion(String sessionId, String userQuestion) {
        try {
            String title = openAICompatibleClient.chat(List.of(
                    ChatMessage.system("你是一个对话标题生成助手。"
                            + "请根据用户的问题，生成一个简短（不超过20字）的对话标题，"
                            + "不要加引号，直接输出。"),
                    ChatMessage.user(userQuestion)
            ));
            if (StrUtil.isNotBlank(title)) {
                memoryService.updateTitle(sessionId, title.trim());
                log.info("标题生成成功: sessionId={}, title={}", sessionId, title);
            }
        } catch (Exception e) {
            log.warn("标题生成失败，保持原截取标题: sessionId={}", sessionId, e);
        }
    }

    /**
     * 链式传递的上下文对象
     */
    @RequiredArgsConstructor
    private static class ChatContext {
        final ChatMessage userMsg;
        final List<ChatMessage> history;
        final boolean historyEmpty;
        final String actualSessionId;
        String searchQuery;
        String ragContext;
    }

}
