package com.caobolun.business.service;

import com.caobolun.framework.web.SseEmitterSender;

public interface ChatService {

    /**
     * 流式对话
     * @param userMessage 用户消息
     * @param sender     由 Controller 创建的 SseEmitter，在这里往里面推送事件
     */
    void streamChat(String userMessage, String sessionId, SseEmitterSender sender);

}
