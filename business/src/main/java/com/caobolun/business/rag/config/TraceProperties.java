package com.caobolun.business.rag.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "rag.trace")
public class TraceProperties {

    /**
     * 是否启用链路追踪
     */
    private boolean enabled = true;

    /**
     * 错误信息最大长度
     */
    private int maxErrorLength = 500;
}