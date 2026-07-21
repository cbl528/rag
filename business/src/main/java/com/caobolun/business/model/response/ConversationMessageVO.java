package com.caobolun.business.model.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ConversationMessageVO {

    private String id;

    private String role;

    private String content;

    private String thinkingContent;

    private Integer thinkingDuration;

    private LocalDateTime createTime;
}