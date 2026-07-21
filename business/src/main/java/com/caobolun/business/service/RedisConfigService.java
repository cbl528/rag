package com.caobolun.business.service;

import cn.hutool.core.util.StrUtil;
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
 * Redis 配置同步与读取服务
 * <p>
 * 系统配置和模型配置写入 Redis 的 key 格式：<br>
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
     * 应用启动时，将 DB 中的启用的系统配置和模型配置全量同步到 Redis
     */
    @PostConstruct
    public void init() {
        syncAllConfigs();
    }

    /**
     * 全量同步所有配置到 Redis
     */
    public void syncAllConfigs() {
        log.info("开始同步系统配置到 Redis...");

        // 同步 t_system_config
        List<SystemConfigDO> systemConfigs = systemConfigMapper.selectList(null);
        int sysCount = 0;
        for (SystemConfigDO config : systemConfigs) {
            String redisKey = config.getConfigKey().replace(".", ":");
            if (config.getEnabled() == 1 && StrUtil.isNotBlank(config.getConfigValue())) {
                redisTemplate.opsForValue().set(redisKey, config.getConfigValue());
                sysCount++;
            } else {
                // enabled=0 或值为空时删除 Redis 中的旧值
                redisTemplate.delete(redisKey);
            }
        }
        log.info("已同步 {} 条系统配置到 Redis", sysCount);

        // 同步 t_model_config
        List<ModelConfigDO> modelConfigs = modelConfigMapper.selectList(null);
        int modelCount = 0;
        for (ModelConfigDO model : modelConfigs) {
            String prefix = model.getType();
            redisTemplate.opsForValue().set(prefix + ":model",   StrUtil.nullToDefault(model.getModelName(), ""));
            redisTemplate.opsForValue().set(prefix + ":baseUrl", StrUtil.nullToDefault(model.getBaseUrl(), ""));
            redisTemplate.opsForValue().set(prefix + ":apiKey",  StrUtil.nullToDefault(model.getApiKey(), ""));
            modelCount++;
        }
        log.info("已同步 {} 条模型配置到 Redis", modelCount);
    }

    // ======================== 系统配置读写 ========================

    @Override
    public String getConfig(String configKey) {
        String redisKey = configKey.replace(".", ":");
        return redisTemplate.opsForValue().get(redisKey);
    }

    /**
     * 更新单个系统配置到 Redis
     */
    public void setConfig(String configKey, String value) {
        String redisKey = configKey.replace(".", ":");
        if (StrUtil.isNotBlank(value)) {
            redisTemplate.opsForValue().set(redisKey, value);
        } else {
            redisTemplate.delete(redisKey);
        }
    }

    /**
     * 删除单个系统配置的 Redis 缓存
     */
    public void deleteConfig(String configKey) {
        String redisKey = configKey.replace(".", ":");
        redisTemplate.delete(redisKey);
    }

    // ======================== 模型配置读写 ========================

    @Override
    public String getModelConfig(String type, String field) {
        return redisTemplate.opsForValue().get(type + ":" + field);
    }

    /**
     * 同步单个模型配置到 Redis（覆盖写入三个字段）
     */
    public void setModelConfig(ModelConfigDO model) {
        String prefix = model.getType();
        // 无论 enabled 是什么都写入，前端或后端按需判断启用状态
        redisTemplate.opsForValue().set(prefix + ":model",   StrUtil.nullToDefault(model.getModelName(), ""));
        redisTemplate.opsForValue().set(prefix + ":baseUrl", StrUtil.nullToDefault(model.getBaseUrl(), ""));
        redisTemplate.opsForValue().set(prefix + ":apiKey",  StrUtil.nullToDefault(model.getApiKey(), ""));
    }

    /**
     * 删除模型配置的 Redis 缓存
     */
    public void deleteModelConfig(String type) {
        redisTemplate.delete(type + ":model");
        redisTemplate.delete(type + ":baseUrl");
        redisTemplate.delete(type + ":apiKey");
    }
}
