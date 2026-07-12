package com.caobolun.business.rag.memory;

import cn.hutool.core.collection.CollUtil;
import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.caobolun.business.rag.dao.entity.ChatMessageEntity;
import com.caobolun.business.rag.dao.entity.ChatSessionEntity;
import com.caobolun.business.rag.dao.mapper.ChatMessageMapper;
import com.caobolun.business.rag.dao.mapper.ChatSessionMapper;
import com.caobolun.framework.convention.ChatMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 对话记忆存储实现类
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class JdbcConversationMemoryStore implements ConversationMemoryStore {

    /** 保留最近 20 轮对话（40 条消息） */
    private static final int MAX_HISTORY_TURNS = 20;

    private final ChatMessageMapper chatMessageMapper;
    private final ChatSessionMapper chatSessionMapper;

    @Override
    public List<ChatMessage> loadHistory(String sessionId) {
        // 1. 查最新 N 条消息（逻辑删除条件由 @TableLogic 自动追加）
        LambdaQueryWrapper<ChatMessageEntity> wrapper = new LambdaQueryWrapper<ChatMessageEntity>()
                .eq(ChatMessageEntity::getSessionId, sessionId)
                .orderByDesc(ChatMessageEntity::getCreateTime);

        Page<ChatMessageEntity> page = new Page<>(1, MAX_HISTORY_TURNS * 2, false);
        List<ChatMessageEntity> records = chatMessageMapper.selectPage(page, wrapper).getRecords();

        if (CollUtil.isEmpty(records)) {
            return List.of();
        }

        // 2. 转成 ChatMessage，收集到可变列表以便 reverse
        List<ChatMessage> messageList = records.stream()
                .map(this::toChatMessage)
                .filter(item -> item != null
                        && StrUtil.isNotBlank(item.getContent())
                        && (item.getRole() == ChatMessage.Role.USER
                        || item.getRole() == ChatMessage.Role.ASSISTANT))
                .collect(Collectors.toCollection(ArrayList::new));

        // 3. 反转成正序（旧 → 新）
        Collections.reverse(messageList);

        // 4. 去掉开头多余的 ASSISTANT 消息
        return normalizeHistory(messageList);
    }

    @Override
    public String append(String sessionId, ChatMessage message) {
        ChatMessageEntity entity = toChatMessageEntity(sessionId, message);
        chatMessageMapper.insert(entity);

        if (message.getRole() == ChatMessage.Role.USER) {
            createOrUpdateSession(sessionId, message.getContent());
        }

        return entity.getId().toString();
    }

    /**
     * 创建或更新会话
     */
    private void createOrUpdateSession(String sessionId, String userMessage) {
        LambdaQueryWrapper<ChatSessionEntity> wrapper = new LambdaQueryWrapper<ChatSessionEntity>()
                .eq(ChatSessionEntity::getSessionId, sessionId);

        ChatSessionEntity session = chatSessionMapper.selectOne(wrapper);

        if (session == null) {
            // 新会话：取用户消息前 50 字作为标题
            String title = userMessage.length() > 50
                    ? userMessage.substring(0, 50) + "…"
                    : userMessage;

            ChatSessionEntity newSession = ChatSessionEntity.builder()
                    .sessionId(sessionId)
                    .title(title)
                    .lastTime(LocalDateTime.now())
                    .build();
            chatSessionMapper.insert(newSession);
        } else {
            session.setLastTime(LocalDateTime.now());
            chatSessionMapper.updateById(session);
        }
    }

    /**
     * 去掉开头多余的 ASSISTANT 消息（会话不应该以 assistant 开头）
     */
    private List<ChatMessage> normalizeHistory(List<ChatMessage> messages) {
        int start = 0;
        while (start < messages.size()
                && messages.get(start).getRole() == ChatMessage.Role.ASSISTANT) {
            start++;
        }
        if (start >= messages.size()) {
            return List.of();
        }
        return messages.subList(start, messages.size());
    }

    /**
     * ChatMessage → ChatMessageEntity
     */
    private ChatMessageEntity toChatMessageEntity(String sessionId, ChatMessage message) {
        ChatMessageEntity entity = new ChatMessageEntity();
        entity.setSessionId(sessionId);
        entity.setRole(message.getRole().name().toLowerCase());
        entity.setContent(message.getContent());
        entity.setThinkingContent(message.getThinkingContent());
        entity.setThinkingDuration(message.getThinkingDuration());
        return entity;
    }

    /**
     * ChatMessageEntity → ChatMessage
     */
    private ChatMessage toChatMessage(ChatMessageEntity entity) {
        if (entity == null || StrUtil.isBlank(entity.getContent())) {
            return null;
        }
        try {
            ChatMessage.Role role = ChatMessage.Role.valueOf(entity.getRole().toUpperCase());
            return new ChatMessage(role, entity.getContent());
        } catch (IllegalArgumentException e) {
            log.warn("未知消息角色: {}, 跳过此消息", entity.getRole());
            return null;
        }
    }
}
