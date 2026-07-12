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
}