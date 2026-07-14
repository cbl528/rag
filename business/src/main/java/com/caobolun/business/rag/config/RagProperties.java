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

    /** Rerank 相关配置 */
    private Rerank rerank = new Rerank();

    @Data
    public static class Rerank {
        /** 是否启用 Rerank（默认关闭，走 NoopRerankClient 兜底） */
        private boolean enabled = false;

        /** Milvus 检索时多取多少条候选（供 Rerank 精排用） */
        private int candidateTopK = 20;

        /** Rerank 后最终保留多少条 */
        private int finalTopK = 5;

        /** Rerank API 提供方（预留：bailian / jina 等） */
        private String provider = "";

        /** Rerank 模型名（预留） */
        private String model = "";

        /** Rerank API Key（预留） */
        private String apiKey = "";

        /** Rerank API URL（预留） */
        private String baseUrl = "";
    }
}
