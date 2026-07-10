package com.caobolun.business.rag.config;

import okhttp3.OkHttpClient;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;

/**
 * OkHttpClient配置类
 */
@Configuration
public class OkHttpClientConfig {

    @Bean
    public OkHttpClient okHttpClient(){
        return new OkHttpClient.Builder()
                .connectTimeout(Duration.ofSeconds(30))    // 连不上 Ollama 30秒就放弃
                .readTimeout(Duration.ZERO)                // ★ 流式核心：永不超时
                .callTimeout(Duration.ZERO)                // ★ 整个调用也不设上限
                .retryOnConnectionFailure(true)            // 网络抖动自动重试
                .build();
    }
}
