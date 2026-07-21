package com.caobolun.business.controller;

import cn.dev33.satoken.stp.StpUtil;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.caobolun.business.model.entity.SampleQuestionDO;
import com.caobolun.business.mapper.SampleQuestionMapper;
import com.caobolun.framework.convention.Result;
import com.caobolun.framework.exception.ClientException;
import com.caobolun.framework.web.Results;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 建议问题管理
 */
@RestController
@RequiredArgsConstructor
public class SampleQuestionController {

    private final SampleQuestionMapper sampleQuestionMapper;

    /**
     * 公开接口：获取启用的建议问题列表（欢迎页使用）
     */
    @GetMapping("/api/v1/sample-questions")
    public Result<List<SampleQuestionDO>> listEnabled() {
        List<SampleQuestionDO> list = sampleQuestionMapper.selectList(
                Wrappers.<SampleQuestionDO>lambdaQuery()
                        .eq(SampleQuestionDO::getEnabled, 1)
                        .orderByAsc(SampleQuestionDO::getSortOrder)
                        .orderByAsc(SampleQuestionDO::getId));
        return Results.success(list);
    }

    // ==================== 管理端接口 ====================

    /**
     * 分页查询（管理端）
     */
    @GetMapping("/api/v1/admin/sample-questions")
    public Result<IPage<SampleQuestionDO>> pageQuery(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size) {
        StpUtil.checkRole("admin");
        Page<SampleQuestionDO> pageParam = new Page<>(page, size);
        IPage<SampleQuestionDO> result = sampleQuestionMapper.selectPage(pageParam,
                Wrappers.<SampleQuestionDO>lambdaQuery()
                        .orderByAsc(SampleQuestionDO::getSortOrder)
                        .orderByAsc(SampleQuestionDO::getId));
        return Results.success(result);
    }

    /**
     * 新增
     */
    @PostMapping("/api/v1/admin/sample-questions")
    public Result<Void> create(@RequestBody SampleQuestionDO body) {
        StpUtil.checkRole("admin");
        if (body.getTitle() == null || body.getTitle().isBlank()) {
            throw new ClientException("标题不能为空");
        }
        if (body.getQuestion() == null || body.getQuestion().isBlank()) {
            throw new ClientException("问题内容不能为空");
        }
        SampleQuestionDO entity = SampleQuestionDO.builder()
                .title(body.getTitle().trim())
                .question(body.getQuestion().trim())
                .sortOrder(body.getSortOrder() != null ? body.getSortOrder() : 0)
                .enabled(body.getEnabled() != null ? body.getEnabled() : 1)
                .build();
        sampleQuestionMapper.insert(entity);
        return Results.success();
    }

    /**
     * 修改
     */
    @PutMapping("/api/v1/admin/sample-questions/{id}")
    public Result<Void> update(@PathVariable Long id, @RequestBody SampleQuestionDO body) {
        StpUtil.checkRole("admin");
        SampleQuestionDO existing = sampleQuestionMapper.selectById(id);
        if (existing == null) {
            throw new ClientException("记录不存在");
        }
        SampleQuestionDO update = new SampleQuestionDO();
        update.setId(id);
        if (body.getTitle() != null) update.setTitle(body.getTitle().trim());
        if (body.getQuestion() != null) update.setQuestion(body.getQuestion().trim());
        if (body.getSortOrder() != null) update.setSortOrder(body.getSortOrder());
        if (body.getEnabled() != null) update.setEnabled(body.getEnabled());
        sampleQuestionMapper.updateById(update);
        return Results.success();
    }

    /**
     * 删除
     */
    @DeleteMapping("/api/v1/admin/sample-questions/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        StpUtil.checkRole("admin");
        sampleQuestionMapper.deleteById(id);
        return Results.success();
    }
}
