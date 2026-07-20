package com.caobolun.business.rag.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.caobolun.business.rag.dao.entity.SystemConfigDO;
import com.caobolun.business.rag.dto.response.SettingsVO;

/**
 * 系统配置服务
 * <p>
 * 提供三层能力：
 * 1. 配置聚合 — 合并 static + DB 覆盖，供前端展示
 * 2. DB 配置 CRUD — 管理 t_system_config 条目
 * 3. 运行时读取 — 供其他服务在运行时获取动态配置
 */
public interface SystemConfigService {

    // ========== 配置聚合 ==========

    /**
     * 获取聚合后的全部配置（静态 + DB 覆盖）
     */
    SettingsVO getAggregatedSettings();

    // ========== DB 配置 CRUD ==========

    /**
     * 分页查询 DB 配置条目
     */
    IPage<SystemConfigDO> pageConfigs(int page, int size);

    /**
     * 创建或更新 DB 配置（key 重复则更新）
     */
    void saveConfig(SystemConfigDO config);

    /**
     * 修改配置值
     */
    void updateConfig(Long id, String value);

    /**
     * 切换启用/禁用状态
     */
    void toggleConfig(Long id);

    /**
     * 删除 DB 配置（回退到静态值）
     */
    void deleteConfig(Long id);

    // ========== 运行时读取（供其他服务调用） ==========

    /**
     * 获取指定配置的生效值（DB enabled → static 兜底）
     */
    String getConfigValue(String key);

    /**
     * 获取布尔型配置
     */
    boolean getBoolean(String key, boolean defaultValue);

    /**
     * 获取整型配置
     */
    int getInt(String key, int defaultValue);
}
