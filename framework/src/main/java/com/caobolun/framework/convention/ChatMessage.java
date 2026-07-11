package com.caobolun.framework.convention;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 聊天消息类
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class ChatMessage {

    public enum Role {
        SYSTEM, USER, ASSISTANT
    }

    private Role role;
    private String content;
    private String thinkingContent;    // 深度思考内容
    private Integer thinkingDuration;  // 深度思考耗时（秒）

    public ChatMessage(Role role, String content){
        this.role = role;
        this.content = content;
    }

    public static ChatMessage system(String content) {
        return new ChatMessage(Role.SYSTEM, content);
    }
    public static ChatMessage user(String content) {
        return new ChatMessage(Role.USER, content);
    }
    public static ChatMessage assistant(String content) {
        return new ChatMessage(Role.ASSISTANT, content);
    }

}
