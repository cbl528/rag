package com.caobolun.business.controller;

import com.caobolun.business.model.response.ConversationMessageVO;
import com.caobolun.business.model.response.ConversationVO;
import com.caobolun.business.service.ConversationService;
import com.caobolun.framework.convention.Result;
import com.caobolun.framework.web.Results;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class ConversationController {
    private final ConversationService conversationService;

    /**
     * 获取会话列表
     */
    @GetMapping("/api/v1/conversation")
    public Result<List<ConversationVO>> listSessions() {
        return Results.success(conversationService.listSessions());
    }

    /**
     * 重命名会话
     */
    @PutMapping("/api/v1/conversation/{sessionId}")
    public Result<Void> renameSession(@PathVariable String sessionId,
                                      @RequestParam String title) {
        conversationService.renameSession(sessionId, title);
        return Results.success();
    }

    /**
     * 删除会话
     */
    @DeleteMapping("/api/v1/conversation/{sessionId}")
    public Result<Void> deleteSession(@PathVariable String sessionId) {
        conversationService.deleteSession(sessionId);
        return Results.success();
    }

    /**
     * 获取会话消息列表
     */
    @GetMapping("/api/v1/conversation/{sessionId}/messages")
    public Result<List<ConversationMessageVO>> listMessages(@PathVariable String sessionId) {
        return Results.success(conversationService.listMessages(sessionId));
    }

    /**
     * 根据标题搜索对话
     */
    @GetMapping("/api/v1/conversation/search/{keyWord}")
    public Result<List<ConversationVO>> searchConversation(@PathVariable String keyWord){
        return Results.success(conversationService.searchConversation(keyWord));
    }
}
