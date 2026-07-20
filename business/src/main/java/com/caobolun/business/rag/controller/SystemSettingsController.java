package com.caobolun.business.rag.controller;

import cn.dev33.satoken.stp.StpUtil;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.caobolun.business.rag.dao.entity.SystemConfigDO;
import com.caobolun.business.rag.dto.response.SettingsVO;
import com.caobolun.business.rag.service.SystemConfigService;
import com.caobolun.framework.convention.Result;
import com.caobolun.framework.web.Results;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

/**
 * 系统设置
 * <p>
 * 只读展示当前配置总览 + 动态配置（DB 覆盖）管理
 */
@RestController
@RequiredArgsConstructor
public class SystemSettingsController {

    private final SystemConfigService systemConfigService;

    /**
     * 获取聚合配置（静态 + DB 覆盖），全量返回
     */
    @GetMapping("/api/v1/admin/settings")
    public Result<SettingsVO> settings() {
        StpUtil.checkRole("admin");
        return Results.success(systemConfigService.getAggregatedSettings());
    }

    /**
     * 分页查询 DB 配置条目
     */
    @GetMapping("/api/v1/admin/system-configs")
    public Result<IPage<SystemConfigDO>> pageConfigs(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "50") int size) {
        StpUtil.checkRole("admin");
        return Results.success(systemConfigService.pageConfigs(page, size));
    }

    /**
     * 新增/更新 DB 配置
     */
    @PostMapping("/api/v1/admin/system-configs")
    public Result<Void> saveConfig(@RequestBody SystemConfigDO config) {
        StpUtil.checkRole("admin");
        systemConfigService.saveConfig(config);
        return Results.success();
    }

    /**
     * 修改配置值
     */
    @PutMapping("/api/v1/admin/system-configs/{id}")
    public Result<Void> updateConfig(@PathVariable Long id, @RequestBody SystemConfigDO body) {
        StpUtil.checkRole("admin");
        systemConfigService.updateConfig(id, body.getConfigValue());
        return Results.success();
    }

    /**
     * 切换启用/禁用
     */
    @PutMapping("/api/v1/admin/system-configs/{id}/toggle")
    public Result<Void> toggleConfig(@PathVariable Long id) {
        StpUtil.checkRole("admin");
        systemConfigService.toggleConfig(id);
        return Results.success();
    }

    /**
     * 删除 DB 配置（回退到静态值）
     */
    @DeleteMapping("/api/v1/admin/system-configs/{id}")
    public Result<Void> deleteConfig(@PathVariable Long id) {
        StpUtil.checkRole("admin");
        systemConfigService.deleteConfig(id);
        return Results.success();
    }
}
