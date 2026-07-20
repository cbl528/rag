package com.caobolun.business.rag.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 聚合配置响应（静态配置 + DB 覆盖）
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SettingsVO {

    /** 按分组排列的配置项列表 */
    private List<ConfigGroup> groups;

    /** DB 中的全量配置条目 */
    private List<DbConfigItem> dbConfigs;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ConfigGroup {
        /** 分组 key：rag / model / milvus / upload */
        private String group;
        /** 分组展示名 */
        private String groupLabel;
        /** 该分组下的配置项 */
        private List<ConfigItem> items;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ConfigItem {
        /** 配置键 */
        private String key;
        /** 当前生效值 */
        private String value;
        /** 静态配置默认值 */
        private String defaultValue;
        /** 配置说明 */
        private String description;
        /** 是否被 DB 覆盖 */
        private boolean dbOverride;
        /** DB 覆盖条目的 ID（为 null 表示无覆盖） */
        private Long dbConfigId;
        /** DB 覆盖是否启用 */
        private boolean dbEnabled;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class DbConfigItem {
        private Long id;
        private String configKey;
        private String configValue;
        private String configGroup;
        private String description;
        private Boolean enabled;
        private String createTime;
        private String updateTime;
    }
}
