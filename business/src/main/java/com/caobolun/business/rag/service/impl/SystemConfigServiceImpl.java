package com.caobolun.business.rag.service.impl;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.caobolun.business.rag.dao.entity.SystemConfigDO;
import com.caobolun.business.rag.dao.mapper.SystemConfigMapper;
import com.caobolun.business.rag.dto.response.SettingsVO;
import com.caobolun.business.rag.service.SystemConfigService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

/**
 * 系统配置服务实现
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SystemConfigServiceImpl implements SystemConfigService {

    private final SystemConfigMapper configMapper;
    private final Environment env;

    /**
     * 已知配置项的元数据
     */
    private static final List<KnownConfig> KNOWN_CONFIGS = List.of(
            // ===== 检索配置 =====
            new KnownConfig("rag.rerank.enabled", "rag", "重排序开关", "false"),
            new KnownConfig("rag.rerank.candidate-top-k", "rag", "Milvus 多取候选数", "20"),
            new KnownConfig("rag.rerank.final-top-k", "rag", "最终保留给 LLM 的段落数", "5"),
            new KnownConfig("rag.trace.enabled", "rag", "链路追踪开关", "true"),
            new KnownConfig("rag.sse-timeout-ms", "rag", "SSE 流式超时时间(毫秒)", "300000"),

            // ===== 模型配置 =====
            new KnownConfig("openai.model", "model", "对话 LLM 模型", "Qwen/Qwen3-8B"),
            new KnownConfig("openai.embedding-model", "model", "Embedding 向量化模型", "BAAI/bge-large-zh-v1.5"),
            new KnownConfig("ollama.model", "model", "Ollama 本地模型", "deepseek-r1:1.5b"),

            // ===== 向量数据库 =====
            new KnownConfig("milvus.host", "milvus", "Milvus 地址", "124.221.110.104"),
            new KnownConfig("milvus.port", "milvus", "Milvus 端口", "19530"),
            new KnownConfig("milvus.collection-name", "milvus", "Milvus 集合名", "rag_knowledge"),
            new KnownConfig("milvus.dimension", "milvus", "向量维度", "1024"),

            // ===== 上传配置 =====
            new KnownConfig("spring.servlet.multipart.max-file-size", "upload", "最大上传文件大小", "50MB")
    );

    private static final Map<String, String> GROUP_LABELS = Map.of(
            "rag", "检索配置",
            "model", "模型配置",
            "milvus", "向量数据库",
            "upload", "上传配置"
    );

    @Override
    public SettingsVO getAggregatedSettings() {
        // 1. 查询所有 DB 配置
        List<SystemConfigDO> dbConfigs = configMapper.selectList(
                Wrappers.<SystemConfigDO>lambdaQuery()
                        .orderByAsc(SystemConfigDO::getConfigGroup)
                        .orderByAsc(SystemConfigDO::getConfigKey));
        Map<String, SystemConfigDO> dbConfigMap = dbConfigs.stream()
                .collect(Collectors.toMap(SystemConfigDO::getConfigKey, c -> c, (a, b) -> b));

        // 2. 按分组构建 ConfigGroup
        Map<String, List<SettingsVO.ConfigItem>> groupedItems = new LinkedHashMap<>();

        for (KnownConfig known : KNOWN_CONFIGS) {
            // 从 Environment 读取静态值
            String staticValue = env.getProperty(known.key);
            if (staticValue == null) {
                staticValue = known.defaultValue;
            }

            // 检查 DB 覆盖
            SystemConfigDO dbConfig = dbConfigMap.get(known.key);
            boolean dbOverride = dbConfig != null;
            boolean dbEnabled = dbConfig != null && dbConfig.getEnabled() == 1;
            String effectiveValue = dbEnabled ? dbConfig.getConfigValue() : staticValue;

            SettingsVO.ConfigItem item = SettingsVO.ConfigItem.builder()
                    .key(known.key)
                    .value(effectiveValue)
                    .defaultValue(staticValue)
                    .description(known.description)
                    .dbOverride(dbOverride)
                    .dbConfigId(dbConfig != null ? dbConfig.getId() : null)
                    .dbEnabled(dbEnabled)
                    .build();

            groupedItems.computeIfAbsent(known.group, k -> new ArrayList<>()).add(item);
        }

        // 3. 转为 List<ConfigGroup>
        List<SettingsVO.ConfigGroup> groups = new ArrayList<>();
        for (Map.Entry<String, List<SettingsVO.ConfigItem>> entry : groupedItems.entrySet()) {
            groups.add(SettingsVO.ConfigGroup.builder()
                    .group(entry.getKey())
                    .groupLabel(GROUP_LABELS.getOrDefault(entry.getKey(), entry.getKey()))
                    .items(entry.getValue())
                    .build());
        }

        // 4. 构建 DB 列表
        DateTimeFormatter dtf = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
        List<SettingsVO.DbConfigItem> dbItems = dbConfigs.stream()
                .map(dc -> SettingsVO.DbConfigItem.builder()
                        .id(dc.getId())
                        .configKey(dc.getConfigKey())
                        .configValue(dc.getConfigValue())
                        .configGroup(dc.getConfigGroup())
                        .description(dc.getDescription())
                        .enabled(dc.getEnabled() == 1)
                        .createTime(dc.getCreateTime() != null ? dc.getCreateTime().format(dtf) : null)
                        .updateTime(dc.getUpdateTime() != null ? dc.getUpdateTime().format(dtf) : null)
                        .build())
                .collect(Collectors.toList());

        return SettingsVO.builder()
                .groups(groups)
                .dbConfigs(dbItems)
                .build();
    }

    @Override
    public IPage<SystemConfigDO> pageConfigs(int page, int size) {
        return configMapper.selectPage(new Page<>(page, size),
                Wrappers.<SystemConfigDO>lambdaQuery()
                        .orderByAsc(SystemConfigDO::getConfigGroup)
                        .orderByAsc(SystemConfigDO::getConfigKey));
    }

    @Override
    @Transactional
    public void saveConfig(SystemConfigDO config) {
        // key 重复则更新，否则插入
        SystemConfigDO existing = configMapper.selectOne(
                Wrappers.<SystemConfigDO>lambdaQuery()
                        .eq(SystemConfigDO::getConfigKey, config.getConfigKey()));
        if (existing != null) {
            config.setId(existing.getId());
            configMapper.updateById(config);
        } else {
            configMapper.insert(config);
        }
    }

    @Override
    @Transactional
    public void updateConfig(Long id, String value) {
        SystemConfigDO update = new SystemConfigDO();
        update.setId(id);
        update.setConfigValue(value);
        configMapper.updateById(update);
    }

    @Override
    @Transactional
    public void toggleConfig(Long id) {
        SystemConfigDO config = configMapper.selectById(id);
        if (config != null) {
            configMapper.updateById(SystemConfigDO.builder()
                    .id(id)
                    .enabled(config.getEnabled() == 1 ? 0 : 1)
                    .build());
        }
    }

    @Override
    @Transactional
    public void deleteConfig(Long id) {
        configMapper.deleteById(id);
    }

    // ========== 运行时读取 ==========

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

    /**
     * 已知配置元数据
     */
    private record KnownConfig(String key, String group, String description, String defaultValue) {
    }
}
