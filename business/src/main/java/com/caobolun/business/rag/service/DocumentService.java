package com.caobolun.business.rag.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.caobolun.ai.rag.chunk.FixedSizeBoundaryChunker;
import com.caobolun.ai.rag.embedding.EmbeddingService;
import com.caobolun.ai.rag.model.VectorChunk;
import com.caobolun.ai.rag.store.VectorStoreService;
import com.caobolun.business.rag.dao.entity.DocumentDO;
import com.caobolun.business.rag.dao.entity.KnowledgeChunkDO;
import com.caobolun.business.rag.dao.mapper.DocumentMapper;
import com.caobolun.business.rag.dao.mapper.KnowledgeChunkMapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.ArrayList;
import java.util.List;


/**
 * 文档分片服务
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DocumentService {

    private final FixedSizeBoundaryChunker chunker;
    private final EmbeddingService embeddingService;
    private final VectorStoreService vectorStoreService;
    private final KnowledgeChunkMapper knowledgeChunkMapper;
    private final ObjectMapper objectMapper;
    private final TransactionTemplate transactionTemplate;
    private final DocumentMapper documentMapper;

    /**
     * 对一段文档文本进行分片、向量化并存储
     *
     * @param docId     文档 ID
     * @param text      文档原文
     * @param chunkSize 每片字符数，默认 512
     * @param overlap   重叠字符数，默认 128
     */
    public void indexDocument(String docId, String text, int chunkSize, int overlap) {

        try {
            updateDocStatus(docId, "chunking"); // 更新文件状态为 “解析中”
            // 1. 分片
            List<VectorChunk> chunks = chunker.chunk(text, chunkSize, overlap);
            if (chunks.isEmpty()) {
                log.warn("文档 {} 分片结果为空", docId);
                updateDocFailed(docId, "文档分片结果为空");
                return;
            }
            log.info("文档ID: {} 被分为 {} 块", docId, chunks.size());
            // 2. 文档向量化
            updateDocStatus(docId, "embedding");
            List<String> texts = chunks.stream()
                    .map(VectorChunk::getContent)
                    .toList();
            List<float[]> embeddings = embeddingService.embedBatch(texts);
            // 3. 设置 metadata 和 embedding
            List<KnowledgeChunkDO> entities = new ArrayList<>();
            for (int i = 0; i < chunks.size(); i++) {
                VectorChunk chunk = chunks.get(i);
                chunk.getMetadata().put("doc_id", docId);
                if (i < embeddings.size()) {
                    chunk.setEmbedding(embeddings.get(i));
                }

                // 构建数据库实体
                KnowledgeChunkDO entity = new KnowledgeChunkDO();
                entity.setChunkId(chunk.getChunkId());
                entity.setDocId(docId);
                entity.setChunkIndex(chunk.getIndex());
                entity.setContent(chunk.getContent());
                entity.setBlockType(chunk.getBlockType());
                entity.setSectionContext(chunk.getSectionContext());
                entity.setCharCount(chunk.getContent().length());
                try {
                    entity.setMetadata(objectMapper.writeValueAsString(chunk.getMetadata()));
                } catch (Exception e) {
                    entity.setMetadata("{}");
                }
                entities.add(entity);
            }

            // 4. 批量写入 MySQL
            updateDocStatus(docId, "storing");
            transactionTemplate.execute(status -> {
                try {
                    knowledgeChunkMapper.insert(entities);
                } catch (Exception e) {
                    status.setRollbackOnly();
                    throw e;
                }
                return null;
            });
            // 5. 批量写入 Milvus（只存有向量的 chunk）
            List<VectorChunk> chunksWithEmbedding = chunks.stream()
                    .filter(c -> c.getEmbedding() != null && c.getEmbedding().length > 0)
                    .toList();
            if (!chunksWithEmbedding.isEmpty()) {
                try {
                    vectorStoreService.batchUpsert(chunksWithEmbedding);
                } catch (Exception e) {
                    log.error("Milvus写入失败，开始回滚Mysql chunk数据", e);
                    knowledgeChunkMapper.delete(new LambdaQueryWrapper<KnowledgeChunkDO>()
                            .eq(KnowledgeChunkDO::getDocId, docId));
                    updateDocFailed(docId, "Milvus存储失败" + e.getMessage());
                }
            }
            int chunkCount = chunks.size();
            DocumentDO update = new DocumentDO();
            update.setDocId(docId);
            update.setChunkCount(chunkCount);
            update.setStatus("indexed");
            documentMapper.update(update,
                    new LambdaQueryWrapper<DocumentDO>()
                            .eq(DocumentDO::getDocId, docId));

            log.info("文档 {} 分为: {} 块, {} 向量块",
                    docId, entities.size(), chunksWithEmbedding.size());
        } catch (Exception e) {
            // 兜底：捕获所有未处理异常
            log.error("文档索引异常: docId={}", docId, e);
            updateDocFailed(docId, "索引异常: " + e.getMessage());
        }
    }

    /**
     * 删除文档及其向量
     */
    @Transactional
    public void deleteDocument(String docId) {
        // 1. 先删 Milvus（不带事务，失败也不影响后续）
        try {
            vectorStoreService.deleteByDocId(docId);
        } catch (Exception e) {
            log.warn("Milvus 删除失败（幂等，可重试）: docId={}", docId, e);
        }

        // 2. 再删 MySQL（事务内，保证一定成功）
        knowledgeChunkMapper.delete(
                new LambdaQueryWrapper<KnowledgeChunkDO>()
                        .eq(KnowledgeChunkDO::getDocId, docId));

        log.info("Document {} deleted", docId);
    }

    /**
     * 获取文档的分片数量
     */
    public int getChunkCount(String docId) {
        Long count = knowledgeChunkMapper.selectCount(
                new LambdaQueryWrapper<KnowledgeChunkDO>()
                        .eq(KnowledgeChunkDO::getDocId, docId));
        return count != null ? count.intValue() : 0;
    }

    /**
     * 更新文档状态
     */
    private void updateDocStatus(String docId, String status) {
        DocumentDO update = new DocumentDO();
        update.setDocId(docId);
        update.setStatus(status);
        documentMapper.update(update,
                new LambdaQueryWrapper<DocumentDO>()
                        .eq(DocumentDO::getDocId, docId));
    }

    /**
     * 更新文档为失败状态
     */
    private void updateDocFailed(String docId, String errorMessage) {
        DocumentDO update = new DocumentDO();
        update.setDocId(docId);
        update.setStatus("failed");
        update.setErrorMessage(errorMessage);
        documentMapper.update(update,
                new LambdaQueryWrapper<DocumentDO>()
                        .eq(DocumentDO::getDocId, docId));
    }
}
