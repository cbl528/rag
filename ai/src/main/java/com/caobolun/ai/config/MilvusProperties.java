package com.caobolun.ai.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Milvus配置类
 */
@Data
@Configuration
@ConfigurationProperties(prefix = "milvus")
public class MilvusProperties {
    private String host = "124.221.110.104";
    private int port = 19530;
    private String collectionName = "rag_knowledge";
    private int dimension = 1024;
    private String metricType = "COSINE";
}