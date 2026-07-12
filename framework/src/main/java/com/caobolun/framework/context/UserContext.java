package com.caobolun.framework.context;

/**
 * 用户上下文容器（基于 ThreadLocal 存储当前登录用户 ID）
 */
public final class UserContext {

    private static final ThreadLocal<String> CONTEXT = new ThreadLocal<>();

    public static void setUserId(String userId) {
        CONTEXT.set(userId);
    }

    public static String getUserId() {
        return CONTEXT.get();
    }

    public static void clear() {
        CONTEXT.remove();
    }
}