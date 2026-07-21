package com.caobolun.business.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.caobolun.business.model.entity.ModelConfigDO;
import com.caobolun.business.model.entity.SystemConfigDO;

import java.util.List;

/**
 * 系统配置 + 模型配置服务
 * <p>
 * 合并管理 t_system_config（系统开关/参数）和 t_model_config（模型连接信息）。
 */
public interface SystemConfigService {

    // ========== 系统配置 ==========

    /**
     * 分页查询系统配置
     */
    IPage<SystemConfigDO> pageConfigs(int page, int size);

    /**
     * 修改系统配置值
     *
     * @param enabled 可选，传 null 不更新 enabled
     */
    void updateConfig(Long id, String value, Integer enabled);

    /**
     * 删除系统配置（回退到静态值）
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

    // ========== 模型配置 CRUD ==========

    /**
     * 获取全部模型配置
     */
    List<ModelConfigDO> listModelConfigs();

    /**
     * 根据 ID 获取模型配置
     */
    ModelConfigDO getModelConfig(Long id);

    /**
     * 新增模型配置（如果该 type 已存在则抛出异常）
     */
    void createModelConfig(ModelConfigDO config);

    /**
     * 修改模型配置
     */
    void updateModelConfig(Long id, ModelConfigDO config);

    /**
     * 删除模型配置
     */
    void deleteModelConfig(Long id);
}
