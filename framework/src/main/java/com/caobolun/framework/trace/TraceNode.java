package com.caobolun.framework.trace;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * 标记 RAG 链路中的追踪节点
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface TraceNode {

    /**
     * 节点名称（用于展示）
     */
    String name() default "";

    /**
     * 节点类型（REWRITE/INTENT/RETRIEVE/LLM 等）
     */
    String type() default "METHOD";
}