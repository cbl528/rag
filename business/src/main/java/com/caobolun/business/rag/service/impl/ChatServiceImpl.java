package com.caobolun.business.rag.service.impl;

import com.caobolun.business.rag.callback.StreamCallback;
import com.caobolun.business.rag.client.OllamaClient;
import com.caobolun.business.rag.service.ChatService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChatServiceImpl implements ChatService {

    private final OllamaClient ollamaClient;


    @Override
    public void streamChat(String userMessage, SseEmitter emitter) {
        ollamaClient.streamChat(userMessage, new StreamCallback() {
            @Override
            public void onContent(String content) {
                try{
                    emitter.send(SseEmitter.event().name("message").data(content));
                } catch (Exception e) {
                    log.warn("SSE 推送失败，客户端可能已断开", e);
                }
            }

            @Override
            public void onComplete() {
                try {
                    emitter.send(SseEmitter.event().name("done").data("[DONE]"));
                } catch (Exception e) {
                    log.warn("发送结束事件失败", e);
                }
                emitter.complete();
            }

            @Override
            public void onError(Throwable error) {
                log.error("Ollama 流式调用失败", error);
                emitter.completeWithError(error);
            }
        });
    }
}
