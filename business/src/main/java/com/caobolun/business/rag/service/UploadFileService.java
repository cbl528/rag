package com.caobolun.business.rag.service;

import cn.hutool.core.util.IdUtil;
import com.caobolun.business.rag.dao.entity.DocumentDO;
import com.caobolun.business.rag.dao.mapper.DocumentMapper;
import com.caobolun.business.rag.dto.response.UploadFileResponse;
import com.caobolun.framework.exception.ServiceException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
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
    @Transactional
    public UploadFileResponse upload(MultipartFile file, Integer chunkSize, Integer overlap) {
        int actualChunkSize = chunkSize != null ? chunkSize : DEFAULT_CHUNK_SIZE;
        int actualOverlap = overlap != null ? overlap : DEFAULT_CHUNK_OVERLAP;

        // 1. 读取文件内容
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
        documentMapper.insert(doc);

        // 异步执行文档索引化任务
        CompletableFuture.runAsync(() -> {
            try {
                // 3. 调用 DocumentService 进行分片、向量化并存储
                documentService.indexDocument(docId, text, actualChunkSize, actualOverlap);

                // 4. 获取分片数并更新文档状态
                int chunkCount = documentService.getChunkCount(docId);
                doc.setChunkCount(chunkCount);
                doc.setStatus("indexed");
                documentMapper.updateById(doc);

                log.info("Document uploaded successfully: docId={}, fileName={}, chunks={}",
                        docId, file.getOriginalFilename(), chunkCount);
            } catch (Exception e) {
                doc.setStatus("failed");
                doc.setErrorMessage(e.getMessage());
                documentMapper.updateById(doc);
                log.error("Document indexing failed: docId={}, fileName={}", docId, file.getOriginalFilename(), e);
                throw new ServiceException("文档索引失败: " + e.getMessage());
            }
        }, documentIndexExecutor);

        // 立即返回结果
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
