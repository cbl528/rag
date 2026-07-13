package com.caobolun.business.user.dto.request;

import lombok.Data;

@Data
public class UserCreateDTO {
    private String username;
    private String password;
    private String nickname;
    private String role;     // "admin" 或 "user"，不传默认 "user"
    private String avatar;
}