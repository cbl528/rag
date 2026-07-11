package com.caobolun.ai.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * ollama属性类
 */
@Data
@Configuration
@ConfigurationProperties(prefix = "ollama")
public class OllamaProperties {
    /** Ollama 服务地址，默认本地 */
    private String baseUrl = "http://localhost:11434";

    /** 使用的模型名称 */
    private String model = "qwen2.5:7b";

    /** SSE 流式请求的读超时（毫秒），0 表示永不超时 */
    private long readTimeout = 0;
}
