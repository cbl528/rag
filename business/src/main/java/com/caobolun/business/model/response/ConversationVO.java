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
public class ConversationVO {

    private String sessionId;

    private String title;

    private LocalDateTime lastTime;

    private LocalDateTime createTime;
}