package com.caobolun.ai.client;

import com.caobolun.framework.callback.StreamCallback;
import com.caobolun.framework.convention.ChatMessage;

import java.util.List;

/**
 * LLM 客户端接口，所有模型实现此接口
 */
public interface LlmClient {
    void streamChat(List<ChatMessage> messages, StreamCallback callback);
}