package com.caobolun.framework.web;

import com.caobolun.framework.convention.Result;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@Slf4j
  @RestControllerAdvice
  public class GlobalExceptionHandler {

      /**
       * 捕获 Sa-Token 未登录异常
       */
      @ExceptionHandler(NotLoginException.class)
      public Result<Void> handleNotLogin(NotLoginException e) {
          log.warn("未登录访问: {}", e.getMessage());
          return new Result<Void>()
                  .setCode("401")
                  .setMessage("未登录或登录已过期");
      }

      /**
       * 捕获已知业务异常
       */
      @ExceptionHandler(ClientException.class)
      public Result<Void> handleClientException(ClientException e) {
          log.warn("业务异常: {} - {}", e.getErrorCode(), e.getMessage());
          return new Result<Void>()
                  .setCode(e.getErrorCode())
                  .setMessage(e.getMessage());
      }

      /**
       * 捕获未知异常（兜底）
       */
      @ExceptionHandler(Exception.class)
      public Result<Void> handleException(Exception e) {
          log.error("系统异常", e);
          return new Result<Void>()
                  .setCode("500")
                  .setMessage("服务器内部错误");
      }
  }