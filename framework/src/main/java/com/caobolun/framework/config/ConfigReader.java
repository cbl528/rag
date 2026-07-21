package com.caobolun.framework.config;

/**
 * 配置读取接口 —— 从 Redis 读取系统配置和模型配置
 * <p>
 * 系统配置 key 格式：将 config_key 中的 . 替换为 :，如 rag.rerank.enabled → rag:rerank:enabled<br>
 * 模型配置 key 格式：{type}:{field}，如 chat-model:baseUrl、embedding-model:model
 * </p>
 */
public interface ConfigReader {

    /**
     * 获取系统配置值
     *
     * @param configKey 原始配置键，如 rag.rerank.enabled
     * @return 配置值，未找到返回 null
     */
    String getConfig(String configKey);

    /**
     * 获取模型配置字段值
     *
     * @param type  模型类型：chat-model / embedding-model / rerank-model
     * @param field 字段名：model / baseUrl / apiKey
     * @return 配置值，未找到返回 null
     */
    String getModelConfig(String type, String field);
}
