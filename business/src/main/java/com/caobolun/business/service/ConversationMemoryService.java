package com.caobolun.business.service;

import com.caobolun.framework.convention.ChatMessage;

import java.util.List;

/**
 * 对话记忆业务服务接口
 */
public interface ConversationMemoryService {

    List<ChatMessage> loadHistory(String sessionId);

    String append(String sessionId, ChatMessage message);

    default List<ChatMessage> loadAndAppend(String sessionId, ChatMessage message) {
        List<ChatMessage> history = loadHistory(sessionId);
        append(sessionId, message);
        return history;
    }

    void updateTitle(String sessionId, String title);
}