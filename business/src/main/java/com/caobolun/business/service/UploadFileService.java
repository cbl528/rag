package com.caobolun.business.service;

import cn.hutool.core.util.IdUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.caobolun.business.model.entity.DocumentDO;
import com.caobolun.business.mapper.DocumentMapper;
import com.caobolun.business.model.response.DocumentListResponse;
import com.caobolun.business.model.response.UploadFileResponse;
import com.caobolun.business.service.MinioService;
import com.caobolun.framework.exception.ClientException;
import com.caobolun.framework.exception.ServiceException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.List;
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
    private final MinioService minioService;

    private static final int DEFAULT_CHUNK_SIZE = 512;
    private static final int DEFAULT_CHUNK_OVERLAP = 128;


    /**
     * 上传文档：读取文件 → 保存原始文件到 MinIO → 保存记录 → 异步分片索引
     *
     * @param file      上传的文件
     * @param chunkSize 分片大小，null 则使用默认值 512
     * @param overlap   分片重叠，null 则使用默认值 128
     * @return 上传结果
     */
    public UploadFileResponse upload(MultipartFile file, Integer chunkSize, Integer overlap) {
        int actualChunkSize = chunkSize != null ? chunkSize : DEFAULT_CHUNK_SIZE;
        int actualOverlap = overlap != null ? overlap : DEFAULT_CHUNK_OVERLAP;

        // 1. 读取原始文本（用于后续分片索引）
        String text = readFileContent(file);

        // 2. 创建文档记录
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

        // 3. 上传原始文件到 MinIO（在分片索引之前，确保文件已持久化）
        String objectName = docId + "." + doc.getFileType();
        String fileUrl = null;
        try (var stream = file.getInputStream()) {
            fileUrl = minioService.uploadFile(objectName, stream, file.getSize());
        } catch (IOException e) {
            log.warn("读取上传流异常: {}", e.getMessage());
            throw new ServiceException("文件上传失败");
        }
        doc.setFileUrl(fileUrl);
        if (fileUrl != null) {
            log.info("文档原始文件已上传到 MinIO: {}", fileUrl);
        } else {
            log.warn("文档原始文件未上传到 MinIO（MinIO 不可用或异常），预览将不可用");
        }
        documentMapper.insert(doc);

        // 4. 异步索引（DocumentService 内部处理所有状态更新 + 异常兜底）
        CompletableFuture.runAsync(() -> {
            documentService.indexDocument(docId, text, actualChunkSize, actualOverlap);
            log.info("文档上传/索引任务完成: docId={}", docId);
        }, documentIndexExecutor);

        // 5. 立即返回
        return UploadFileResponse.builder()
                .docId(docId)
                .fileName(file.getOriginalFilename())
                .chunkCount(0)
                .status("uploading")
                .fileUrl(fileUrl)
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

    // ========== 文档查询 ==========

    /**
     * 获取文档状态详情
     */
    public UploadFileResponse getDocumentStatus(String docId) {
        DocumentDO doc = documentMapper.selectOne(
                new LambdaQueryWrapper<DocumentDO>()
                        .eq(DocumentDO::getDocId, docId));
        if (doc == null) {
            throw new ClientException("文档不存在");
        }
        return UploadFileResponse.builder()
                .docId(doc.getDocId())
                .fileName(doc.getFileName())
                .chunkCount(doc.getChunkCount() != null ? doc.getChunkCount() : 0)
                .status(doc.getStatus())
                .errorMessage(doc.getErrorMessage())
                .fileUrl(doc.getFileUrl())
                .build();
    }

    /**
     * 获取文档列表（按创建时间倒序）
     */
    public List<DocumentListResponse> listDocuments() {
        List<DocumentDO> docs = documentMapper.selectList(
                Wrappers.<DocumentDO>lambdaQuery()
                        .orderByDesc(DocumentDO::getCreateTime));

        return docs.stream()
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
    }

    /**
     * 获取文档详情
     */
    public DocumentListResponse getDocument(String docId) {
        DocumentDO doc = documentMapper.selectOne(
                new LambdaQueryWrapper<DocumentDO>()
                        .eq(DocumentDO::getDocId, docId));
        if (doc == null) {
            throw new ClientException("文档不存在");
        }
        return DocumentListResponse.builder()
                .docId(doc.getDocId())
                .fileName(doc.getFileName())
                .fileType(doc.getFileType())
                .fileSize(doc.getFileSize())
                .chunkCount(doc.getChunkCount() != null ? doc.getChunkCount() : 0)
                .status(doc.getStatus())
                .errorMessage(doc.getErrorMessage())
                .fileUrl(doc.getFileUrl())
                .createTime(doc.getCreateTime())
                .build();
    }
}
