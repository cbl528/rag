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
            new KnownConfig("rag.rerank.enabled", "rag", "重排序开关", "false",
                    "开启后，系统会对检索到的段落进行二次排序，将最相关的结果排在前面"),
            new KnownConfig("rag.trace.enabled", "rag", "链路追踪开关", "true",
                    "开启后记录每次检索的详细链路信息，方便调试和排查问题"),
            new KnownConfig("rag.rerank.candidate-top-k", "rag", "检索结果候选数", "20",
                    "从向量数据库中多取一些候选段落供排序挑选，值越大效果越好但速度会慢一些"),
            new KnownConfig("rag.rerank.final-top-k", "rag", "检索结果保留数", "5",
                    "经过排序后最终送入大模型作为参考的最相关段落数量"),
            new KnownConfig("rag.sse-timeout-ms", "rag", "SSE 流式超时时间(毫秒)", "300000",
                    "大模型流式响应的最长等待时间，超时后连接将自动断开"),

            // ===== 模型配置 =====
            new KnownConfig("openai.model", "model", "对话 LLM 模型", "Qwen/Qwen3-8B",
                    "用于生成对话回复的模型，需与 API 服务商提供的模型名一致"),
            new KnownConfig("openai.embedding-model", "model", "Embedding 向量化模型", "BAAI/bge-large-zh-v1.5",
                    "将文档和用户问题转化为语义向量的模型，用于后续的相似度检索"),
            new KnownConfig("ollama.model", "model", "Ollama 本地模型", "deepseek-r1:1.5b",
                    "本地部署的 Ollama 模型名称，用于离线环境下的对话生成"),
            new KnownConfig("rag.rerank.model", "model", "重排序模型名", "Qwen/Qwen3-Reranker-0.6B",
                    "用于对检索结果进行相关性评分的模型，一般使用专门的 Reranker 模型"),

            // ===== 向量数据库 =====
            new KnownConfig("milvus.host", "milvus", "Milvus 地址", "124.221.110.104",
                    "向量数据库 Milvus 的服务地址，用于存储和检索文档向量"),
            new KnownConfig("milvus.port", "milvus", "Milvus 端口", "19530",
                    "向量数据库 Milvus 的服务端口，默认 19530"),
            new KnownConfig("milvus.collection-name", "milvus", "Milvus 集合名", "rag_knowledge",
                    "Milvus 中存储文档向量的集合（相当于关系数据库中的表）"),
            new KnownConfig("milvus.dimension", "milvus", "向量维度", "1024",
                    "每个文本向量的维度数，需与 Embedding 模型输出的维度一致"),

            // ===== 上传配置 =====
            new KnownConfig("spring.servlet.multipart.max-file-size", "upload", "最大上传文件大小", "50MB",
                    "单次上传文档的大小上限，超过此大小的文件将被拒绝")
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
                    .explanation(known.explanation)
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
    private record KnownConfig(String key, String group, String description, String defaultValue, String explanation) {
    }
}
