package com.caobolun.business.user.dto.request;

import lombok.Data;

@Data
public class PasswordUpdateDTO {
    private String oldPassword;
    private String newPassword;
}
