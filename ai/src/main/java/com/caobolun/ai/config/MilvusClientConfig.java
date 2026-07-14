package com.caobolun.ai.config;

import io.milvus.v2.client.ConnectConfig;
import io.milvus.v2.client.MilvusClientV2;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Milvus 客户端配置
 * <p>
 * 职责：声明 MilvusClientV2 Bean，生命周期由 Spring 管理（自动调用 close() 关闭连接）。
 * 集合初始化由 {@link MilvusCollectionInitializer} 负责。
 */
@Slf4j
@Configuration
@RequiredArgsConstructor
public class MilvusClientConfig {

    private final MilvusProperties properties;

    @Bean
    public MilvusClientV2 milvusClient() {
        ConnectConfig config = ConnectConfig.builder()
                .uri("http://" + properties.getHost() + ":" + properties.getPort())
                .build();
        log.info("Milvus 客户端链接至 {}:{}", properties.getHost(), properties.getPort());
        return new MilvusClientV2(config);
    }
}
