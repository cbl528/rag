package com.caobolun.business.rag.service.impl;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.caobolun.business.rag.dao.entity.ModelConfigDO;
import com.caobolun.business.rag.dao.entity.SystemConfigDO;
import com.caobolun.business.rag.dao.mapper.ModelConfigMapper;
import com.caobolun.business.rag.dao.mapper.SystemConfigMapper;
import com.caobolun.business.rag.service.SystemConfigService;
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

    // ===================== 系统配置 =====================

    @Override
    public IPage<SystemConfigDO> pageConfigs(int page, int size) {
        return configMapper.selectPage(new Page<>(page, size),
                Wrappers.<SystemConfigDO>lambdaQuery()
                        .orderByAsc(SystemConfigDO::getConfigGroup)
                        .orderByAsc(SystemConfigDO::getConfigKey));
    }

    @Override
    @Transactional
    public void updateConfig(Long id, String value, Integer enabled) {
        SystemConfigDO update = new SystemConfigDO();
        update.setId(id);
        update.setConfigValue(value);
        if (enabled != null) {
            update.setEnabled(enabled);
        }
        configMapper.updateById(update);
    }

    @Override
    @Transactional
    public void deleteConfig(Long id) {
        configMapper.deleteById(id);
    }

    // ===================== 运行时读取 =====================

    @Override
    public String getConfigValue(String key) {
        // 先查 DB 是否有启用的覆盖
        SystemConfigDO dbConfig = configMapper.selectOne(
                Wrappers.<SystemConfigDO>lambdaQuery()
                        .eq(SystemConfigDO::getConfigKey, key)
                        .eq(SystemConfigDO::getEnabled, 1));
        if (dbConfig != null && StrUtil.isNotBlank(dbConfig.getConfigValue())) {
            return dbConfig.getConfigValue();
        }
        // 回退到 Environment
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
    }

    @Override
    @Transactional
    public void deleteModelConfig(Long id) {
        ModelConfigDO existing = modelConfigMapper.selectById(id);
        if (existing == null) {
            throw new ClientException("模型配置不存在");
        }
        modelConfigMapper.deleteById(id);
    }
}
