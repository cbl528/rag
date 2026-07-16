package com.caobolun.business.rag.service;

import cn.hutool.core.util.IdUtil;
import com.caobolun.business.rag.dao.entity.DocumentDO;
import com.caobolun.business.rag.dao.mapper.DocumentMapper;
import com.caobolun.business.rag.dto.response.UploadFileResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;

/**
 * 管理端文档上传服务
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class UploadFileService {

    private final DocumentMapper documentMapper;
    private final DocumentService documentService;
    private final Executor documentIndexExecutor;

    private static final int DEFAULT_CHUNK_SIZE = 512;
    private static final int DEFAULT_CHUNK_OVERLAP = 128;


    /**
     * 上传文档：读取文件 → 保存记录 → 分片索引
     *
     * @param file      上传的文件
     * @param chunkSize 分片大小，null 则使用默认值 512
     * @param overlap   分片重叠，null 则使用默认值 128
     * @return 上传结果
     */
    public UploadFileResponse upload(MultipartFile file, Integer chunkSize, Integer overlap) {
        int actualChunkSize = chunkSize != null ? chunkSize : DEFAULT_CHUNK_SIZE;
        int actualOverlap = overlap != null ? overlap : DEFAULT_CHUNK_OVERLAP;

        String text = readFileContent(file);

        // 创建文档记录
        String docId = IdUtil.fastSimpleUUID();
        DocumentDO doc = new DocumentDO();
        doc.setDocId(docId);
        doc.setFileName(file.getOriginalFilename());
        doc.setFileSize(file.getSize());
        doc.setFileType(extractExtension(file.getOriginalFilename()));
        doc.setChunkCount(0);
        doc.setChunkSize(actualChunkSize);
        doc.setChunkOverlap(actualOverlap);
        doc.setStatus("uploading");
        documentMapper.insert(doc);

        // ★ 异步索引（DocumentService 内部处理所有状态更新 + 异常兜底）
        CompletableFuture.runAsync(() -> {
            documentService.indexDocument(docId, text, actualChunkSize, actualOverlap);
            log.info("文档上传/索引任务完成: docId={}", docId);
        }, documentIndexExecutor);

        // 立即返回
        return UploadFileResponse.builder()
                .docId(docId)
                .fileName(file.getOriginalFilename())
                .chunkCount(0)
                .status("uploading")
                .build();
    }

    /**
     * 读取上传文件内容（支持 .txt 和 .md）
     */
    private String readFileContent(MultipartFile file) {
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                sb.append(line).append("\n");
            }
            return sb.toString();
        } catch (Exception e) {
            throw new RuntimeException("文件读取失败: " + e.getMessage(), e);
        }
    }

    /**
     * 提取文件扩展名
     */
    private String extractExtension(String fileName) {
        if (fileName == null) return "txt";
        int idx = fileName.lastIndexOf('.');
        return idx >= 0 ? fileName.substring(idx + 1).toLowerCase() : "txt";
    }
}
