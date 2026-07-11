package com.caobolun.ai.service;

import com.caobolun.ai.client.OllamaClient;
import com.caobolun.ai.client.OpenAICompatibleClient;
import com.caobolun.framework.callback.StreamCallback;
import com.caobolun.framework.convention.ChatMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class LlmService {

    private final OpenAICompatibleClient primaryClient;
    private final OllamaClient ollamaClient;

    public void streamChat(List<ChatMessage> messages, StreamCallback callback){
        StreamCallback fallbackCallback = new StreamCallback() {
            @Override
            public void onContent(String content) {
                callback.onContent(content);
            }

            @Override
            public void onComplete() {
                callback.onComplete();
            }

            @Override
            public void onError(Throwable error) {
                log.warn("线上模型调用失败，降级本地大模型", error);
                ollamaClient.streamChat(messages, callback);
            }
        };
        primaryClient.streamChat(messages, fallbackCallback);
    }

}
