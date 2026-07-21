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

        // 同步到 Redis
        redisConfigService.setConfig(configKey, value);
    }

    // ===================== 运行时读取（Redis → Environment 兜底） =====================

    @Override
    public String getConfigValue(String key) {
        // 1. 优先从 Redis 读取
        String redisValue = redisConfigService.getConfig(key);
        if (redisValue != null) {
            return redisValue;
        }
        // 2. Redis 未命中时，查 DB 是否有启用的覆盖
        SystemConfigDO dbConfig = configMapper.selectOne(
                Wrappers.<SystemConfigDO>lambdaQuery()
                        .eq(SystemConfigDO::getConfigKey, key)
                        .eq(SystemConfigDO::getEnabled, 1));
        if (dbConfig != null && StrUtil.isNotBlank(dbConfig.getConfigValue())) {
            // 同步到 Redis
            redisConfigService.setConfig(key, dbConfig.getConfigValue());
            return dbConfig.getConfigValue();
        }
        // 3. 回退到 Environment（application.yaml 中的静态值）
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
        // 检查 type 是否已存在（每种 type 只允许一条）
        Long count = modelConfigMapper.selectCount(
                Wrappers.<ModelConfigDO>lambdaQuery()
                        .eq(ModelConfigDO::getType, config.getType()));
        if (count > 0) {
            throw new ClientException("该模型类型已存在配置，请直接编辑");
        }
        modelConfigMapper.insert(config);

        // 同步到 Redis
        redisConfigService.setModelConfig(config);
    }

    @Override
    @Transactional
    public void updateModelConfig(Long id, ModelConfigDO config) {
        ModelConfigDO existing = modelConfigMapper.selectById(id);
        if (existing == null) {
            throw new ClientException("模型配置不存在");
        }
        config.setId(id);
        // 不更新 createTime / updateTime / deleted
        modelConfigMapper.updateById(config);

        // 同步到 Redis（使用 config 中的 type 字段）
        config.setType(existing.getType());
        redisConfigService.setModelConfig(config);
    }

    @Override
    @Transactional
    public void toggleModelEnabled(Long id) {
        ModelConfigDO config = modelConfigMapper.selectById(id);
        if (config == null) {
            throw new ClientException("模型配置不存在");
        }
        ModelConfigDO update = new ModelConfigDO();
        update.setId(id);
        update.setEnabled(config.getEnabled() == 1 ? 0 : 1);
        modelConfigMapper.updateById(update);

        // 同步到 Redis（更新 enabled 后仍保留模型信息，不因禁用而删除）
        config.setEnabled(update.getEnabled());
        redisConfigService.setModelConfig(config);
    }
}
