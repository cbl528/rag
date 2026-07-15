package com.caobolun.ai.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Data
@Configuration
@ConfigurationProperties(prefix = "rag.rerank")
public class RerankProperties {
    private boolean enabled = false;
    private int candidateTopK = 20;
    private int finalTopK = 5;
    private String baseUrl = "";
    private String apiKey = "";
    private String model = "";
}