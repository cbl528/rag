package com.caobolun.business.user.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserInfoResponse {
    private String userId;
    private String username;
    private String nickname;
    private String role;
    private String avatar;
}