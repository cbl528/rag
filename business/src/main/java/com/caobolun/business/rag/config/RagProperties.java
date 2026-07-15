package com.caobolun.business.rag.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * RAG 检索配置
 */
@Data
@Configuration
@ConfigurationProperties(prefix = "rag")
public class RagProperties {

    /** SSE 超时时间（毫秒） */
    private long sseTimeoutMs = 300000;

}
