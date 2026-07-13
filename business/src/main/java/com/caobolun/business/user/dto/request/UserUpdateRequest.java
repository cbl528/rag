package com.caobolun.business.user.dto.request;

import lombok.Data;

@Data
public class UserUpdateRequest {
    private String username;
    private String nickname;
    private String role;
    private String avatar;
}