package com.caobolun.business.rag.memory;

import com.caobolun.framework.convention.ChatMessage;

import java.util.List;

/**
 * 对话记忆存储接口
 * 提供对话历史记录的加载、追加功能
 */
public interface ConversationMemoryStore {

    /**
     * 加载历史消息（按时间正序，旧→新）
     *
     * @param sessionId 会话ID
     * @return 历史消息列表
     */
    List<ChatMessage> loadHistory(String sessionId);

    /**
     * 追加消息到对话
     *
     * @param sessionId 会话ID
     * @param message   要追加的消息
     * @return 消息ID
     */
    String append(String sessionId, ChatMessage message);

    /**
     * 加载历史并同时追加新消息（便捷方法）
     * <p>
     * 先 load 历史，再 append 新消息，一次调用完成两件事。
     * 返回的是 append 之前的历史记录。
     * </p>
     */
    default List<ChatMessage> loadAndAppend(String sessionId, ChatMessage message) {
        List<ChatMessage> history = loadHistory(sessionId);
        append(sessionId, message);
        return history;
    }
}