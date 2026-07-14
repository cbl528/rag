package com.caobolun.business.rag.controller;

import cn.dev33.satoken.stp.StpUtil;
import com.caobolun.business.rag.dto.response.UploadFileResponse;
import com.caobolun.business.rag.service.UploadFileService;
import com.caobolun.framework.convention.Result;
import com.caobolun.framework.exception.ClientException;
import com.caobolun.framework.web.Results;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * 管理端控制器
 */
@RestController
@RequiredArgsConstructor
public class AdminController {

    private final UploadFileService uploadFileService;

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
}
