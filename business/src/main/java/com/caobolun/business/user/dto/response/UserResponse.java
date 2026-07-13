package com.caobolun.business.user.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserResponse {
    private Long id;
    private String userId;
    private String username;
    private String nickname;
    private String role;
    private String avatar;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
}