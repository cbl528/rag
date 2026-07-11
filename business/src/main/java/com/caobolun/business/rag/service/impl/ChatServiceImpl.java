package com.caobolun.business.rag.service.impl;

import com.caobolun.ai.client.OpenAICompatibleClient;
import com.caobolun.business.rag.service.ChatService;
import com.caobolun.framework.callback.StreamCallback;
import com.caobolun.framework.convention.ChatMessage;
import com.caobolun.framework.web.SseEmitterSender;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChatServiceImpl implements ChatService {

    private final OpenAICompatibleClient openAICompatibleClient;

    @Override
    public void streamChat(String userMessage, SseEmitterSender sender) {
        List<ChatMessage> userMessages = List.of(ChatMessage.user(userMessage));
        openAICompatibleClient.streamChat(userMessages, new StreamCallback() {
            @Override
            public void onContent(String content) {
                try{
                    sender.sendEvent("message", content);
                } catch (Exception e) {
                    log.warn("SSE 推送失败，客户端可能已断开", e);
                }
            }

            @Override
            public void onComplete() {
                try {
                    sender.sendEvent("done","[DONE]");
                    sender.complete();
                } catch (Exception e) {
                    log.warn("发送结束事件失败", e);
                }
            }

            @Override
            public void onError(Throwable error) {
                log.error("Ollama 流式调用失败", error);
                sender.fail(error);
            }
        });
    }
}
