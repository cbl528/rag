package com.caobolun.framework.trace;

import com.alibaba.ttl.TransmittableThreadLocal;

import java.util.ArrayDeque;
import java.util.Deque;

/**
 * Trace 上下文：基于 TTL 在异步线程池中透传 traceId 与节点栈
 */
public final class TraceContext {

    private static final TransmittableThreadLocal<String> TRACE_ID = new TransmittableThreadLocal<>();
    private static final TransmittableThreadLocal<Deque<String>> NODE_STACK = new TransmittableThreadLocal<>() {
        @Override
        public Deque<String> copy(Deque<String> parentValue) {
            return parentValue == null ? null : new ArrayDeque<>(parentValue);
        }
    };

    private TraceContext() {
    }

    public static String getTraceId() {
        return TRACE_ID.get();
    }

    public static void setTraceId(String traceId) {
        TRACE_ID.set(traceId);
    }

    public static String currentNodeId() {
        Deque<String> stack = NODE_STACK.get();
        return stack == null ? null : stack.peek();
    }

    public static int depth() {
        Deque<String> stack = NODE_STACK.get();
        return stack == null ? 0 : stack.size();
    }

    public static void pushNode(String nodeId) {
        Deque<String> stack = NODE_STACK.get();
        if (stack == null) {
            stack = new ArrayDeque<>();
            NODE_STACK.set(stack);
        }
        stack.push(nodeId);
    }

    public static void popNode() {
        Deque<String> stack = NODE_STACK.get();
        if (stack == null || stack.isEmpty()) return;
        stack.pop();
        if (stack.isEmpty()) NODE_STACK.remove();
    }

    public static void clear() {
        TRACE_ID.remove();
        NODE_STACK.remove();
    }
}