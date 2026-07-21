package com.caobolun.business.service;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.caobolun.business.mapper.ModelConfigMapper;
import com.caobolun.business.mapper.SystemConfigMapper;
import com.caobolun.business.model.entity.ModelConfigDO;
import com.caobolun.business.model.entity.SystemConfigDO;
import com.caobolun.framework.config.ConfigReader;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Redis 配置缓存服务（Cache-Aside 模式）
 * <p>
 * 读：Redis → miss → DB 回填 → 返回<br>
 * 写：先写 DB，再删 Redis（下次读时自动回填）
 * <p>
 * Key 格式：<br>
 * - 系统配置：将 config_key 中的 . 替换为 :，如 rag.rerank.enabled → rag:rerank:enabled<br>
 * - 模型配置：{type}:{field}，如 chat-model:model、chat-model:baseUrl、chat-model:apiKey
 * </p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RedisConfigService implements ConfigReader {

    private final StringRedisTemplate redisTemplate;
    private final SystemConfigMapper systemConfigMapper;
    private final ModelConfigMapper modelConfigMapper;

    /**
     * 应用启动时全量预热 Redis 缓存
     */
    @PostConstruct
    public void init() {
        syncAllConfigs();
    }

    /**
     * 全量同步所有配置到 Redis（启动预热用）
     */
    public void syncAllConfigs() {
        log.info("开始预热系统配置到 Redis...");

        // 预热 t_system_config（所有配置，不分 enabled）
        List<SystemConfigDO> systemConfigs = systemConfigMapper.selectList(null);
        int sysCount = 0;
        for (SystemConfigDO config : systemConfigs) {
            if (StrUtil.isNotBlank(config.getConfigValue())) {
                String redisKey = config.getConfigKey().replace(".", ":");
                redisTemplate.opsForValue().set(redisKey, config.getConfigValue());
                sysCount++;
            }
        }
        log.info("Redis 系统配置预热完成，共 {} 条", sysCount);

        // 预热 t_model_config（仅 enabled=1 的活跃模型）
        List<ModelConfigDO> modelConfigs = modelConfigMapper.selectList(
                Wrappers.<ModelConfigDO>lambdaQuery()
                        .eq(ModelConfigDO::getEnabled, 1));
        int modelCount = 0;
        for (ModelConfigDO model : modelConfigs) {
            String prefix = model.getType();
            redisTemplate.opsForValue().set(prefix + ":model",   StrUtil.nullToDefault(model.getModelName(), ""));
            redisTemplate.opsForValue().set(prefix + ":baseUrl", StrUtil.nullToDefault(model.getBaseUrl(), ""));
            redisTemplate.opsForValue().set(prefix + ":apiKey",  StrUtil.nullToDefault(model.getApiKey(), ""));
            modelCount++;
        }
        log.info("Redis 模型配置预热完成，共 {} 条", modelCount);
    }

    // ======================== 系统配置：Cache-Aside ========================

    @Override
    public String getConfig(String configKey) {
        // 1. 查 Redis
        String redisKey = configKey.replace(".", ":");
        String value = redisTemplate.opsForValue().get(redisKey);
        if (value != null) {
            return value;
        }

        // 2. Redis miss → 从 DB 读取（不分 enabled）
        SystemConfigDO dbConfig = systemConfigMapper.selectOne(
                Wrappers.<SystemConfigDO>lambdaQuery()
                        .eq(SystemConfigDO::getConfigKey, configKey));
        if (dbConfig != null && StrUtil.isNotBlank(dbConfig.getConfigValue())) {
            redisTemplate.opsForValue().set(redisKey, dbConfig.getConfigValue());
            return dbConfig.getConfigValue();
        }

        return null;
    }

    /**
     * 删除系统配置缓存（写 DB 后调用）
     */
    public void deleteConfig(String configKey) {
        String redisKey = configKey.replace(".", ":");
        redisTemplate.delete(redisKey);
    }

    // ======================== 模型配置：Cache-Aside ========================

    @Override
    public String getModelConfig(String type, String field) {
        String redisKey = type + ":" + field;

        // 1. 查 Redis
        String value = redisTemplate.opsForValue().get(redisKey);
        if (value != null) {
            return value;
        }

        // 2. Redis miss → 从 DB 读取（仅 enabled=1 的活跃模型）
        ModelConfigDO model = modelConfigMapper.selectOne(
                Wrappers.<ModelConfigDO>lambdaQuery()
                        .eq(ModelConfigDO::getType, type)
                        .eq(ModelConfigDO::getEnabled, 1)
                        .orderByDesc(ModelConfigDO::getId)
                        .last("LIMIT 1"));
        if (model != null) {
            // 回填全部三个字段到 Redis
            redisTemplate.opsForValue().set(type + ":model",   StrUtil.nullToDefault(model.getModelName(), ""));
            redisTemplate.opsForValue().set(type + ":baseUrl", StrUtil.nullToDefault(model.getBaseUrl(), ""));
            redisTemplate.opsForValue().set(type + ":apiKey",  StrUtil.nullToDefault(model.getApiKey(), ""));
            // 返回请求的字段
            return switch (field) {
                case "model"   -> model.getModelName();
                case "baseUrl" -> model.getBaseUrl();
                case "apiKey"  -> model.getApiKey();
                default        -> null;
            };
        }

        return null;
    }

    /**
     * 删除模型配置缓存（写 DB 后调用）
     */
    public void deleteModelConfig(String type) {
        redisTemplate.delete(type + ":model");
        redisTemplate.delete(type + ":baseUrl");
        redisTemplate.delete(type + ":apiKey");
    }
}
