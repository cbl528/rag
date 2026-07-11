package com.caobolun.business.rag.controller;

import com.caobolun.business.rag.service.ChatService;
import com.caobolun.framework.web.SseEmitterSender;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;

    @GetMapping(value = "/api/chat", produces = "text/event-stream;charset=UTF-8")
    public SseEmitter chat(@RequestParam String message){
        SseEmitter emitter = new SseEmitter(300000L);
        SseEmitterSender sender = new SseEmitterSender(emitter);
        chatService.streamChat(message, sender);
        return emitter;
    }

}
