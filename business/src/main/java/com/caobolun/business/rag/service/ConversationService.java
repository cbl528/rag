package com.caobolun.business.rag.service;

import com.caobolun.business.rag.dto.response.ConversationMessageVO;
import com.caobolun.business.rag.dto.response.ConversationVO;

import java.util.List;

public interface ConversationService {

      /**
       * 获取所有会话列表（按最后活跃时间倒序）
       */
      List<ConversationVO> listSessions();

      /**
       * 删除会话（逻辑删除，同时删除其所有消息）
       */
      void deleteSession(String sessionId);

      /**
       * 重命名会话
       */
      void renameSession(String sessionId, String title);

      /**
       * 获取会话的消息列表（按时间正序）
       */
      List<ConversationMessageVO> listMessages(String sessionId);

      List<ConversationVO> searchConversation(String keyWord);
}