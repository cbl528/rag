package com.caobolun.framework.context;

import com.alibaba.ttl.TransmittableThreadLocal;

/**
 * 用户上下文容器（基于 TransmittableThreadLocal 存储当前登录用户 ID）
 * <p>
 * 使用 TransmittableThreadLocal 而非普通 ThreadLocal，以确保在线程池环境中
 * 父线程的 UserContext 能正确传递给子线程。
 * </p>
 */
public final class UserContext {

    private static final TransmittableThreadLocal<String> CONTEXT = new TransmittableThreadLocal<>();

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