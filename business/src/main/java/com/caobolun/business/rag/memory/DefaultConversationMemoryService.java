package com.caobolun.business.rag.memory;

import cn.hutool.core.util.StrUtil;
import com.caobolun.framework.convention.ChatMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * 记忆对话业务层默认实现类
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DefaultConversationMemoryService implements ConversationMemoryStore{

    private final JdbcConversationMemoryStore memoryStore;

    @Override
    public List<ChatMessage> loadHistory(String sessionId) {
        if (StrUtil.isBlank(sessionId)) {
            return List.of();
        }
        try {
            List<ChatMessage> history = memoryStore.loadHistory(sessionId);
            return history != null ? history : List.of();
        } catch (Exception e) {
            log.error("加载对话历史失败 - sessionId: {}", sessionId, e);
            return List.of();
        }
    }

    @Override
    public String append(String sessionId, ChatMessage message) {
        if (StrUtil.isBlank(sessionId) || message == null) {
            return null;
        }
        try {
            return memoryStore.append(sessionId, message);
        } catch (Exception e) {
            log.error("保存消息失败 - sessionId: {}, role: {}",
                    sessionId, message.getRole(), e);
            return null;
        }
    }
}
