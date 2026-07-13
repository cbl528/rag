package com.caobolun.business.rag.service.impl;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.caobolun.business.rag.dao.entity.ChatMessageDO;
import com.caobolun.business.rag.dao.entity.ChatSessionDO;
import com.caobolun.business.rag.dao.mapper.ChatMessageMapper;
import com.caobolun.business.rag.dao.mapper.ChatSessionMapper;
import com.caobolun.business.rag.dto.response.ConversationMessageVO;
import com.caobolun.business.rag.dto.response.ConversationVO;
import com.caobolun.business.rag.service.ConversationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ConversationServiceImpl implements ConversationService {

    private final ChatSessionMapper chatSessionMapper;
    private final ChatMessageMapper chatMessageMapper;

    @Override
    public List<ConversationVO> listSessions() {
        List<ChatSessionDO> records = chatSessionMapper.selectList(
                new LambdaQueryWrapper<ChatSessionDO>()
                        .orderByDesc(ChatSessionDO::getLastTime)
        );
        return records.stream()
                .map(this::toConversationVO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteSession(String sessionId) {
        // 逻辑删除会话
        LambdaQueryWrapper<ChatSessionDO> sessionWrapper = new LambdaQueryWrapper<ChatSessionDO>()
                .eq(ChatSessionDO::getSessionId, sessionId);
        ChatSessionDO session = chatSessionMapper.selectOne(sessionWrapper);
        if (session != null) {
            chatSessionMapper.deleteById(session.getId());
        }

        // 逻辑删除该会话下的所有消息
        chatMessageMapper.delete(
                new LambdaQueryWrapper<ChatMessageDO>()
                        .eq(ChatMessageDO::getSessionId, sessionId)
        );
    }

    @Override
    public void renameSession(String sessionId, String title) {
        if (StrUtil.isBlank(title)) {
            return;
        }
        LambdaQueryWrapper<ChatSessionDO> wrapper = new LambdaQueryWrapper<ChatSessionDO>()
                .eq(ChatSessionDO::getSessionId, sessionId);
        ChatSessionDO session = chatSessionMapper.selectOne(wrapper);
        if (session != null) {
            session.setTitle(title.trim());
            chatSessionMapper.updateById(session);
        }
    }

    @Override
    public List<ConversationMessageVO> listMessages(String sessionId) {
        List<ChatMessageDO> records = chatMessageMapper.selectList(
                new LambdaQueryWrapper<ChatMessageDO>()
                        .eq(ChatMessageDO::getSessionId, sessionId)
                        .orderByAsc(ChatMessageDO::getCreateTime)
        );
        return records.stream()
                .map(this::toConversationMessageVO)
                .collect(Collectors.toList());
    }

    private ConversationVO toConversationVO(ChatSessionDO entity) {
        return ConversationVO.builder()
                .sessionId(entity.getSessionId())
                .title(entity.getTitle())
                .lastTime(entity.getLastTime())
                .createTime(entity.getCreateTime())
                .build();
    }

    private ConversationMessageVO toConversationMessageVO(ChatMessageDO entity) {
        return ConversationMessageVO.builder()
                .id(entity.getId().toString())
                .role(entity.getRole())
                .content(entity.getContent())
                .thinkingContent(entity.getThinkingContent())
                .thinkingDuration(entity.getThinkingDuration())
                .createTime(entity.getCreateTime())
                .build();
    }
}