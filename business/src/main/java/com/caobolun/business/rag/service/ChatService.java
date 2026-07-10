package com.caobolun.business.rag.service;

import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

public interface ChatService {

    /**
     * 流式对话
     * @param userMessage 用户消息
     * @param emitter     由 Controller 创建的 SseEmitter，在这里往里面推送事件
     */
    void streamChat(String userMessage, SseEmitter emitter);

}
