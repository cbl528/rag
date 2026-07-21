package com.caobolun.business.rag.controller;

import cn.dev33.satoken.stp.StpUtil;
import com.caobolun.business.rag.dto.response.DashboardResponse;
import com.caobolun.business.rag.dto.response.DocumentListResponse;
import com.caobolun.business.rag.dto.response.UploadFileResponse;
import com.caobolun.business.rag.service.impl.DashboardService;
import com.caobolun.business.rag.service.impl.UploadFileService;
import com.caobolun.framework.convention.Result;
import com.caobolun.framework.exception.ClientException;
import com.caobolun.framework.web.Results;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * 管理端控制器 — 仪表盘 + 文档管理
 */
@RestController
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;
    private final UploadFileService uploadFileService;

    /**
     * 获取仪表盘全量数据
     */
    @GetMapping("/api/v1/admin/dashboard")
    public Result<DashboardResponse> dashboard(
            @RequestParam(defaultValue = "14") int trendDays) {
        StpUtil.checkRole("admin");
        return Results.success(dashboardService.getDashboard(trendDays));
    }

    /**
     * 上传文档并执行分片索引
     */
    @PostMapping("/api/v1/admin/document/upload")
    public Result<UploadFileResponse> uploadDocument(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "chunkSize", required = false) Integer chunkSize,
            @RequestParam(value = "overlap", required = false) Integer overlap) {
        StpUtil.checkRole("admin");

        // 校验文件类型
        String fileName = file.getOriginalFilename();
        if (fileName == null || (!fileName.endsWith(".txt") && !fileName.endsWith(".md"))) {
            throw new ClientException("仅支持 .txt 和 .md 文件");
        }

        return Results.success(uploadFileService.upload(file, chunkSize, overlap));
    }

    /**
     * 获取文档状态
     */
    @GetMapping("/api/v1/admin/document/status/{docId}")
    public Result<UploadFileResponse> getDocumentStatus(@PathVariable String docId) {
        StpUtil.checkRole("admin");
        return Results.success(uploadFileService.getDocumentStatus(docId));
    }

    /**
     * 获取文档列表（全部文档，按创建时间倒序）
     */
    @GetMapping("/api/v1/admin/documents")
    public Result<List<DocumentListResponse>> listDocuments() {
        StpUtil.checkRole("admin");
        return Results.success(uploadFileService.listDocuments());
    }

    /**
     * 获取文档详情（含 MinIO 预览 URL）
     */
    @GetMapping("/api/v1/admin/document/{docId}")
    public Result<DocumentListResponse> getDocument(@PathVariable String docId) {
        StpUtil.checkRole("admin");
        return Results.success(uploadFileService.getDocument(docId));
    }
}
