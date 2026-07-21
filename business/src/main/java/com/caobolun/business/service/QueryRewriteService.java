package com.caobolun.business.service;

import com.caobolun.framework.convention.ChatMessage;

import java.util.List;

/**
 * 查询改写服务：对用户问题进行语义替换和指代消解，
 * 将代词（它、这个、这些等）替换为对话历史中的具体实体，
 * 提高 RAG 检索的命中率。
 */
public interface QueryRewriteService {

    /**
     * 改写用户问题，将代词替换为具体内容
     *
     * @param userQuestion 原始用户问题
     * @param history      对话历史（用于指代消解）
     * @return 改写后的查询语句；如果改写失败则回退到原始问题
     */
    String rewrite(String userQuestion, List<ChatMessage> history);

    /**
     * 简单的改写，不依赖对话历史
     *
     * @param userQuestion 原始用户问题
     * @return 改写后的查询语句
     */
    default String rewrite(String userQuestion) {
        return rewrite(userQuestion, List.of());
    }
}
