package com.caobolun.ai.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Data
@Configuration
@ConfigurationProperties(prefix = "openai")
public class OpenAIProperties {
    /** 兼容 OpenAI 格式的 API 地址（硅基流动 / DeepSeek / 通义等） */
    private String baseUrl = "https://api.siliconflow.cn/v1";
    /** API Key */
    private String apiKey;
    /** 模型名，硅基流动示例：deepseek-ai/DeepSeek-V3、Qwen/Qwen2.5-72B-Instruct */
    private String model = "Qwen/Qwen2.5-72B-Instruct";
    /** 流式读超时，0 不超时 */
    private long readTimeout = 0;

    private String embeddingModel = "BAAI/bge-large-zh-v1.5";
}
