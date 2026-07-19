package com.caobolun.business.rag.controller;

import cn.dev33.satoken.stp.StpUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.caobolun.business.rag.dao.entity.DocumentDO;
import com.caobolun.business.rag.dao.mapper.DocumentMapper;
import com.caobolun.business.rag.dto.response.DocumentListResponse;
import com.caobolun.business.rag.dto.response.UploadFileResponse;
import com.caobolun.business.rag.service.UploadFileService;
import com.caobolun.framework.convention.Result;
import com.caobolun.framework.exception.ClientException;
import com.caobolun.framework.web.Results;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * 管理端控制器
 */
@RestController
@RequiredArgsConstructor
public class AdminController {

    private final UploadFileService uploadFileService;
    private final DocumentMapper documentMapper;

    /**
     * 上传文档并执行分片索引
     *
     * @param file      上传的文件（.txt / .md）
     * @param chunkSize 分片大小（可选，默认 512）
     * @param overlap   分片重叠（可选，默认 128）
     */
    @PostMapping("/api/v1/admin/document/upload")
    public Result<UploadFileResponse> uploadDocument(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "chunkSize", required = false) Integer chunkSize,
            @RequestParam(value = "overlap", required = false) Integer overlap) {
        // 校验 admin 角色
        StpUtil.checkRole("admin");

        // 校验文件类型
        String fileName = file.getOriginalFilename();
        if (fileName == null || (!fileName.endsWith(".txt") && !fileName.endsWith(".md"))) {
            throw new ClientException("仅支持 .txt 和 .md 文件");
        }

        // 执行上传和索引
        UploadFileResponse result = uploadFileService.upload(file, chunkSize, overlap);

        return Results.success(result);
    }

    @GetMapping("/api/v1/admin/document/status/{docId}")
    public Result<UploadFileResponse> getDocumentStatus(@PathVariable String docId) {
        StpUtil.checkRole("admin");

        DocumentDO doc = documentMapper.selectOne(
                new LambdaQueryWrapper<DocumentDO>()
                        .eq(DocumentDO::getDocId, docId));
        if (doc == null) {
            throw new ClientException("文档不存在");
        }

        return Results.success(UploadFileResponse.builder()
                .docId(doc.getDocId())
                .fileName(doc.getFileName())
                .chunkCount(doc.getChunkCount() != null ? doc.getChunkCount() : 0)
                .status(doc.getStatus())
                .errorMessage(doc.getErrorMessage())
                .fileUrl(doc.getFileUrl())
                .build());
    }

    /**
     * 获取文档列表（全部文档，按创建时间倒序）
     */
    @GetMapping("/api/v1/admin/documents")
    public Result<List<DocumentListResponse>> listDocuments() {
        StpUtil.checkRole("admin");

        List<DocumentDO> docs = documentMapper.selectList(
                Wrappers.<DocumentDO>lambdaQuery()
                        .orderByDesc(DocumentDO::getCreateTime));

        List<DocumentListResponse> result = docs.stream()
                .map(doc -> DocumentListResponse.builder()
                        .docId(doc.getDocId())
                        .fileName(doc.getFileName())
                        .fileType(doc.getFileType())
                        .fileSize(doc.getFileSize())
                        .chunkCount(doc.getChunkCount() != null ? doc.getChunkCount() : 0)
                        .status(doc.getStatus())
                        .errorMessage(doc.getErrorMessage())
                        .fileUrl(doc.getFileUrl())
                        .createTime(doc.getCreateTime())
                        .build())
                .toList();

        return Results.success(result);
    }

    /**
     * 获取文档详情（含 MinIO 预览 URL）
     */
    @GetMapping("/api/v1/admin/document/{docId}")
    public Result<DocumentListResponse> getDocument(@PathVariable String docId) {
        StpUtil.checkRole("admin");

        DocumentDO doc = documentMapper.selectOne(
                new LambdaQueryWrapper<DocumentDO>()
                        .eq(DocumentDO::getDocId, docId));
        if (doc == null) {
            throw new ClientException("文档不存在");
        }

        return Results.success(DocumentListResponse.builder()
                .docId(doc.getDocId())
                .fileName(doc.getFileName())
                .fileType(doc.getFileType())
                .fileSize(doc.getFileSize())
                .chunkCount(doc.getChunkCount() != null ? doc.getChunkCount() : 0)
                .status(doc.getStatus())
                .errorMessage(doc.getErrorMessage())
                .fileUrl(doc.getFileUrl())
                .createTime(doc.getCreateTime())
                .build());
    }
}
