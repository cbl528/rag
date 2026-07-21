package com.caobolun.business.controller;

import cn.dev33.satoken.stp.StpUtil;
import com.baomidou.mybatisplus.core.metadata.IPage;
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
 * 系统配置管理 + 模型配置管理
 */
@RestController
@RequiredArgsConstructor
public class SystemSettingsController {

    private final SystemConfigService systemConfigService;

    // ===================== 系统配置 =====================

    /**
     * 分页查询系统配置
     */
    @GetMapping("/api/v1/admin/system-configs")
    public Result<IPage<SystemConfigDO>> pageConfigs(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "50") int size) {
        StpUtil.checkRole("admin");
        return Results.success(systemConfigService.pageConfigs(page, size));
    }

    /**
     * 修改系统配置值（可同时更新 enabled）
     */
    @PutMapping("/api/v1/admin/system-configs/{id}")
    public Result<Void> updateConfig(@PathVariable Long id, @RequestBody SystemConfigDO body) {
        StpUtil.checkRole("admin");
        systemConfigService.updateConfig(id, body.getConfigValue(), body.getEnabled());
        return Results.success();
    }

    /**
     * 删除系统配置（回退到静态值）
     */
    @DeleteMapping("/api/v1/admin/system-configs/{id}")
    public Result<Void> deleteConfig(@PathVariable Long id) {
        StpUtil.checkRole("admin");
        systemConfigService.deleteConfig(id);
        return Results.success();
    }

    // ===================== 模型配置 CRUD =====================

    /**
     * 获取全部模型配置
     */
    @GetMapping("/api/v1/admin/model-configs")
    public Result<List<ModelConfigDO>> listModelConfigs() {
        StpUtil.checkRole("admin");
        return Results.success(systemConfigService.listModelConfigs());
    }

    /**
     * 获取单个模型配置
     */
    @GetMapping("/api/v1/admin/model-configs/{id}")
    public Result<ModelConfigDO> getModelConfig(@PathVariable Long id) {
        StpUtil.checkRole("admin");
        return Results.success(systemConfigService.getModelConfig(id));
    }

    /**
     * 新增模型配置
     */
    @PostMapping("/api/v1/admin/model-configs")
    public Result<Void> createModelConfig(@RequestBody ModelConfigDO config) {
        StpUtil.checkRole("admin");
        systemConfigService.createModelConfig(config);
        return Results.success();
    }

    /**
     * 修改模型配置
     */
    @PutMapping("/api/v1/admin/model-configs/{id}")
    public Result<Void> updateModelConfig(@PathVariable Long id, @RequestBody ModelConfigDO config) {
        StpUtil.checkRole("admin");
        systemConfigService.updateModelConfig(id, config);
        return Results.success();
    }

    /**
     * 删除模型配置
     */
    @DeleteMapping("/api/v1/admin/model-configs/{id}")
    public Result<Void> deleteModelConfig(@PathVariable Long id) {
        StpUtil.checkRole("admin");
        systemConfigService.deleteModelConfig(id);
        return Results.success();
    }
}
