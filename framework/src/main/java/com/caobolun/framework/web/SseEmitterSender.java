package com.caobolun.framework.web;

import lombok.extern.slf4j.Slf4j;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.concurrent.atomic.AtomicBoolean;

@Slf4j
public class SseEmitterSender {

    private final SseEmitter sseEmitter;
    private final AtomicBoolean closed = new AtomicBoolean(false);

    public SseEmitterSender(SseEmitter sseEmitter){
        this.sseEmitter = sseEmitter;
        sseEmitter.onCompletion(() -> closed.set(true));
        sseEmitter.onTimeout(() -> closed.set(true));
        sseEmitter.onError((e) -> closed.set(true));
    }

    public void sendEvent(String eventName, Object data){
        if(closed.get()){
            return;
        }
        try{
            if(eventName == null){
                sseEmitter.send(data);
            } else {
                sseEmitter.send(SseEmitter.event().name(eventName).data(data));
            }
        } catch (Exception e){
            fail(e);
        }
    }

    public void complete(){
        if(closed.compareAndSet(false, true)){
            sseEmitter.complete();
        }
    }

    public void fail(Throwable throwable){
        if(closed.compareAndSet(false, true)){
            sseEmitter.completeWithError(throwable);
        }
        log.warn("sse 链接异常", throwable);
    }

}
