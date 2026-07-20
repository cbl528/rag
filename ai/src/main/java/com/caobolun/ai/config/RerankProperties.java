package com.caobolun.ai.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Data
@Configuration
@ConfigurationProperties(prefix = "rag.rerank")
public class RerankProperties {
    /** 重排序开关 */
    private boolean enabled = false;
}