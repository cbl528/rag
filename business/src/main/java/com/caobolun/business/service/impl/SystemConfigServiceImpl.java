package com.caobolun.business.service.impl;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.caobolun.business.model.entity.ModelConfigDO;
import com.caobolun.business.model.entity.SystemConfigDO;
import com.caobolun.business.mapper.ModelConfigMapper;
import com.caobolun.business.mapper.SystemConfigMapper;
import com.caobolun.business.service.RedisConfigService;
import com.caobolun.business.service.SystemConfigService;
import com.caobolun.framework.exception.ClientException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class SystemConfigServiceImpl implements SystemConfigService {

    private final SystemConfigMapper configMapper;
    private final ModelConfigMapper modelConfigMapper;
    private final Environment env;
    private final RedisConfigService redisConfigService;

    // ===================== 系统配置（其他配置） =====================

    @Override
    public List<SystemConfigDO> listOtherConfigs() {
        return configMapper.selectList(
                Wrappers.<SystemConfigDO>lambdaQuery()
                        .notIn(SystemConfigDO::getConfigGroup, "chat-model", "embedding-model", "rerank-model")
                        .orderByAsc(SystemConfigDO::getConfigGroup)
                        .orderByAsc(SystemConfigDO::getConfigKey));
    }

    @Override
    public SystemConfigDO getConfigByKey(String configKey) {
        SystemConfigDO config = configMapper.selectOne(
                Wrappers.<SystemConfigDO>lambdaQuery()
                        .eq(SystemConfigDO::getConfigKey, configKey));
        if (config == null) {
            throw new ClientException("配置不存在");
        }
        return config;
    }

    @Override
    @Transactional
    public void updateConfigByKey(String configKey, String value, Integer enabled) {
        SystemConfigDO existing = configMapper.selectOne(
                Wrappers.<SystemConfigDO>lambdaQuery()
                        .eq(SystemConfigDO::getConfigKey, configKey));
        if (existing == null) {
            throw new ClientException("配置不存在");
        }
        SystemConfigDO update = new SystemConfigDO();
        update.setId(existing.getId());
        update.setConfigValue(value);
        if (enabled != null) {
            update.setEnabled(enabled);
        }
        configMapper.updateById(update);

        // 删除 Redis 缓存，下次读取时自动回填
        redisConfigService.deleteConfig(configKey);
    }

    // ===================== 运行时读取（Cache-Aside） =====================

    @Override
    public String getConfigValue(String key) {
        // 1. RedisConfigService 内部按 Cache-Aside 模式：Redis → DB 回填 → 返回
        String value = redisConfigService.getConfig(key);
        if (value != null) {
            return value;
        }
        // 2. 兜底：从 application.yaml 获取静态配置
        return env.getProperty(key);
    }

    @Override
    public boolean getBoolean(String key, boolean defaultValue) {
        String value = getConfigValue(key);
        if (value == null) return defaultValue;
        return "true".equalsIgnoreCase(value) || "1".equals(value);
    }

    @Override
    public int getInt(String key, int defaultValue) {
        String value = getConfigValue(key);
        if (value == null) return defaultValue;
        try {
            return Integer.parseInt(value);
        } catch (NumberFormatException e) {
            log.warn("配置 {} 的值 '{}' 不是有效整数，使用默认值 {}", key, value, defaultValue);
            return defaultValue;
        }
    }

    // ===================== 模型配置 CRUD =====================

    @Override
    public List<ModelConfigDO> listModelConfigs() {
        return modelConfigMapper.selectList(
                Wrappers.<ModelConfigDO>lambdaQuery()
                        .orderByAsc(ModelConfigDO::getType));
    }

    @Override
    public ModelConfigDO getModelConfig(Long id) {
        ModelConfigDO config = modelConfigMapper.selectById(id);
        if (config == null) {
            throw new ClientException("模型配置不存在");
        }
        return config;
    }

    @Override
    @Transactional
    public void createModelConfig(ModelConfigDO config) {
        modelConfigMapper.insert(config);

        // 删除 Redis 缓存，下次读取时自动回填
        redisConfigService.deleteModelConfig(config.getType());
    }

    @Override
    @Transactional
    public void updateModelConfig(Long id, ModelConfigDO config) {
        ModelConfigDO existing = modelConfigMapper.selectById(id);
        if (existing == null) {
            throw new ClientException("模型配置不存在");
        }
        config.setId(id);
        modelConfigMapper.updateById(config);

        // 删除 Redis 缓存，下次读取时自动回填
        redisConfigService.deleteModelConfig(existing.getType());
    }

    @Override
    @Transactional
    public void toggleModelEnabled(Long id) {
        ModelConfigDO config = modelConfigMapper.selectById(id);
        if (config == null) {
            throw new ClientException("模型配置不存在");
        }

        String type = config.getType();
        int newEnabled = config.getEnabled() == 1 ? 0 : 1;

        if (newEnabled == 0) {
            // 要禁用当前模型 → 检查是否还有同类型的其他已启用模型
            boolean isChatOrEmbedding = "chat-model".equals(type) || "embedding-model".equals(type);
            if (isChatOrEmbedding) {
                Long enabledCount = modelConfigMapper.selectCount(
                        Wrappers.<ModelConfigDO>lambdaQuery()
                                .eq(ModelConfigDO::getType, type)
                                .eq(ModelConfigDO::getEnabled, 1)
                                .ne(ModelConfigDO::getId, id));
                if (enabledCount == 0) {
                    throw new ClientException(String.format("%s 至少需启用一个", "chat-model".equals(type) ? "对话模型" : "向量模型"));
                }
            }
        } else {
            // 启用当前模型 → 先禁用同类型的其他已启用模型
            ModelConfigDO disableOthers = new ModelConfigDO();
            disableOthers.setEnabled(0);
            modelConfigMapper.update(disableOthers,
                    Wrappers.<ModelConfigDO>lambdaUpdate()
                            .eq(ModelConfigDO::getType, type)
                            .ne(ModelConfigDO::getId, id)
                            .eq(ModelConfigDO::getEnabled, 1));
        }

        // 启用/禁用当前模型
        ModelConfigDO update = new ModelConfigDO();
        update.setId(id);
        update.setEnabled(newEnabled);
        modelConfigMapper.updateById(update);

        // 删除 Redis 缓存，下次读取时自动回填
        redisConfigService.deleteModelConfig(type);
    }
}
