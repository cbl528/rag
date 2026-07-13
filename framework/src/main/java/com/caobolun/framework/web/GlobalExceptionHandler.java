package com.caobolun.framework.web;

import cn.dev33.satoken.exception.NotLoginException;
import cn.dev33.satoken.exception.NotRoleException;
import com.caobolun.framework.convention.Result;
import com.caobolun.framework.errorcode.BaseErrorCode;
import com.caobolun.framework.exception.AbstractException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    /**
     * 拦截应用内抛出的异常
     */
    @ExceptionHandler(value = {AbstractException.class})
    public Result<Void> abstractException(HttpServletRequest request, AbstractException ex) {
        if (ex.getCause() != null) {
            log.error("[{}] {} [ex] {}", request.getMethod(), request.getRequestURL().toString(), ex, ex.getCause());
            return Results.failure(ex);
        }
        log.error("[{}] {} [ex] {}: {}", request.getMethod(), request.getRequestURL().toString(),
                ex.getClass().getSimpleName(), ex.getErrorMessage());
        return Results.failure(ex);
    }

    /**
     * 拦截未登录异常
     */
    @ExceptionHandler(value = NotLoginException.class)
    public void notLoginException(HttpServletRequest request, HttpServletResponse response, NotLoginException ex) throws Exception {
        log.warn("[{}] {} [auth] 未登录: {}", request.getMethod(), request.getRequestURL().toString(), ex.getMessage());

        String accept = request.getHeader("Accept");
        boolean isSse = accept != null && accept.contains("text/event-stream");

        if (isSse) {
            // SSE 请求：返回 SSE 格式错误事件，避免 Spring 尝试用 JSON 渲染 text/event-stream
            response.setContentType("text/event-stream;charset=UTF-8");
            response.getWriter().write("event: error\ndata: 未登录或登录已过期\n\n");
            response.getWriter().flush();
        } else {
            // 普通请求：返回标准 JSON
            response.setContentType("application/json;charset=UTF-8");
            ObjectMapper mapper = new ObjectMapper();
            mapper.writeValue(response.getWriter(),
                    Results.failure(BaseErrorCode.CLIENT_ERROR.code(), "未登录或登录已过期"));
        }
    }

    /**
     * 拦截无角色权限异常
     */
    @ExceptionHandler(value = NotRoleException.class)
    public Result<Void> notRoleException(HttpServletRequest request, NotRoleException ex) {
        log.warn("[{}] {} [auth] 权限不足: {}", request.getMethod(), request.getRequestURL().toString(), ex.getMessage());
        return Results.failure(BaseErrorCode.CLIENT_ERROR.code(), "权限不足");
    }

    /**
     * 拦截未捕获异常（兜底）
     */
    @ExceptionHandler(value = Throwable.class)
    public Result<Void> defaultErrorHandler(HttpServletRequest request, Throwable throwable) {
        log.error("[{}] {} ", request.getMethod(), request.getRequestURL().toString(), throwable);
        return Results.failure();
    }
}