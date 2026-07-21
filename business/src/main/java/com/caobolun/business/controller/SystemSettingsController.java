package com.caobolun.business.controller;

import cn.dev33.satoken.stp.StpUtil;
import com.caobolun.business.model.entity.ModelConfigDO;
import com.caobolun.business.model.entity.SystemConfigDO;
import com.caobolun.business.service.SystemConfigService;
import com.caobolun.framework.convention.Result;
import com.caobolun.framework.web.Results;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 系统设置
 * <p>
 * 系统配置管理（非模型类配置）+ 模型配置管理
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/admin")
public class SystemSettingsController {

    private final SystemConfigService systemConfigService;

    // ===================== 系统配置（其他配置） =====================

    /**
     * 获取非模型类系统配置列表
     */
    @GetMapping("/system-configs")
    public Result<List<SystemConfigDO>> listOtherConfigs() {
        StpUtil.checkRole("admin");
        return Results.success(systemConfigService.listOtherConfigs());
    }

    /**
     * 根据 configKey 获取配置
     */
    @GetMapping("/system-configs/by-key")
    public Result<SystemConfigDO> getConfigByKey(@RequestParam String configKey) {
        StpUtil.checkRole("admin");
        return Results.success(systemConfigService.getConfigByKey(configKey));
    }

    /**
     * 根据 configKey 修改配置值
     */
    @PutMapping("/system-configs/by-key")
    public Result<Void> updateConfigByKey(@RequestParam String configKey, @RequestBody SystemConfigDO body) {
        StpUtil.checkRole("admin");
        systemConfigService.updateConfigByKey(configKey, body.getConfigValue(), body.getEnabled());
        return Results.success();
    }

    // ===================== 模型配置 CRUD =====================

    /**
     * 获取全部模型配置
     */
    @GetMapping("/model-configs")
    public Result<List<ModelConfigDO>> listModelConfigs() {
        StpUtil.checkRole("admin");
        return Results.success(systemConfigService.listModelConfigs());
    }

    /**
     * 获取单个模型配置
     */
    @GetMapping("/model-configs/{id}")
    public Result<ModelConfigDO> getModelConfig(@PathVariable Long id) {
        StpUtil.checkRole("admin");
        return Results.success(systemConfigService.getModelConfig(id));
    }

    /**
     * 新增模型配置
     */
    @PostMapping("/model-configs")
    public Result<Void> createModelConfig(@RequestBody ModelConfigDO config) {
        StpUtil.checkRole("admin");
        systemConfigService.createModelConfig(config);
        return Results.success();
    }

    /**
     * 修改模型配置
     */
    @PutMapping("/model-configs/{id}")
    public Result<Void> updateModelConfig(@PathVariable Long id, @RequestBody ModelConfigDO config) {
        StpUtil.checkRole("admin");
        systemConfigService.updateModelConfig(id, config);
        return Results.success();
    }

    /**
     * 切换模型启用/禁用状态
     */
    @PutMapping("/model-configs/{id}/toggle-enabled")
    public Result<Void> toggleModelEnabled(@PathVariable Long id) {
        StpUtil.checkRole("admin");
        systemConfigService.toggleModelEnabled(id);
        return Results.success();
    }
}
