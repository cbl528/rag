package com.caobolun.business.user.dto.request;

import lombok.Data;

@Data
public class UserPageDTO {
    private int page = 1;       // 当前页，默认第1页
    private int size = 10;      // 每页条数，默认10
    private String keyword;     // 关键字（模糊匹配 username/nickname）
}