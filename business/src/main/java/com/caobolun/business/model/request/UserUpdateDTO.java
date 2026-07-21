package com.caobolun.business.model.request;

import lombok.Data;

@Data
public class UserUpdateDTO {
    private String username;
    private String nickname;
    private String role;
    private String avatar;
    private String password;
    private String oldPassword;
    private Integer status;
}