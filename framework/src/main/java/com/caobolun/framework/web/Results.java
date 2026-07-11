package com.caobolun.framework.web;

import com.caobolun.framework.convention.Result;

public class Results {

    public static <T> Result<T> success() {
        return new Result<T>()
                .setCode(Result.SUCCESS_CODE)
                .setMessage("操作成功");
    }

    public static <T> Result<T> success(T data) {
        return new Result<T>()
                .setCode(Result.SUCCESS_CODE)
                .setMessage("操作成功")
                .setData(data);
    }

    public static <T> Result<T> failure(String code, String message) {
        return new Result<T>()
                .setCode(code)
                .setMessage(message);
    }

}
