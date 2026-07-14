package com.caobolun.business.rag.service;

import com.caobolun.ai.rag.embedding.EmbeddingService;
import com.caobolun.ai.rag.model.RetrievedChunk;
import com.caobolun.ai.rag.store.VectorStoreService;
import com.caobolun.business.rag.config.RagProperties;
import com.caobolun.business.rag.dao.entity.KnowledgeChunkDO;
import com.caobolun.business.rag.dao.mapper.KnowledgeChunkMapper;
import com.caobolun.business.rag.rerank.RerankService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * RAG检索服务
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RagSearchService {

    private final EmbeddingService embeddingService;
    private final VectorStoreService vectorStoreService;
    private final KnowledgeChunkMapper knowledgeChunkMapper;
    private final RerankService rerankService;
    private final RagProperties ragProperties;

    /**
     * 搜索与 query 最相关的文档片段
     *
     * @param query 用户问题（已改写，代词已替换）
     * @return 检索到的文档片段列表（含完整文本）
     */
    public List<RetrievedChunk> search(String query) {
        RagProperties.Rerank config = ragProperties.getRerank();
        int candidateTopK = config.isEnabled() ? config.getCandidateTopK() : config.getFinalTopK();

        return search(query, candidateTopK, null);
    }

    /**
     * 搜索并返回可用于 LLM 的 context 字符串
     *
     * @param query 用户问题（已改写，代词已替换）
     * @return 拼好的 context 文本，可直接插入 system prompt
     */
    public String searchAsContext(String query) {
        List<RetrievedChunk> chunks = search(query);
        if (chunks.isEmpty()) {
            return "";
        }

        StringBuilder context = new StringBuilder();
        context.append("以下是可能相关的知识库文档片段（按相关性排序）：\n\n");
        for (int i = 0; i < chunks.size(); i++) {
            RetrievedChunk chunk = chunks.get(i);
            context.append("---\n");
            context.append("片段").append(i + 1);
            if (chunk.getBlockType() != null) {
                context.append(" [").append(chunk.getBlockType()).append("]");
            }
            if (chunk.getScore() != null) {
                context.append(" (相关性: ").append(String.format("%.2f",
                        chunk.getScore())).append(")");
            }
            context.append("\n");
            context.append(chunk.toContextText()).append("\n");
        }
        return context.toString();
    }

    private List<RetrievedChunk> search(String query, int topK, String expr) {
        // 1. 用户问题向量化
        float[] queryEmbedding = embeddingService.embed(query);

        // 2. Milvus 向量检索（取更多候选供 Rerank 用）
        List<RetrievedChunk> milvusResults = vectorStoreService.search(queryEmbedding,
                topK, expr);
        if (milvusResults.isEmpty()) {
            return List.of();
        }

        // 3. 根据 chunk_id 从 MySQL 获取完整文本
        List<String> chunkIds = milvusResults.stream()
                .map(RetrievedChunk::getChunkId)
                .toList();
        List<KnowledgeChunkDO> entities =
                knowledgeChunkMapper.selectByChunkIds(chunkIds);

        // 4. 组装完整结果（按 Milvus 的排序返回）
        Map<String, KnowledgeChunkDO> entityMap = entities.stream()
                .collect(Collectors.toMap(KnowledgeChunkDO::getChunkId, e -> e));

        for (RetrievedChunk result : milvusResults) {
            KnowledgeChunkDO entity = entityMap.get(result.getChunkId());
            if (entity != null) {
                result.setContent(entity.getContent());
                result.setBlockType(entity.getBlockType());
                result.setSectionContext(entity.getSectionContext());
            }
        }

        // 5. 【新增】Rerank 精排
        List<RetrievedChunk> reranked = rerankService.rerank(query, milvusResults);

        if (log.isDebugEnabled()) {
            log.debug("RagSearch: query='{}', Milvus topK={}, reranked={}",
                    query, topK, reranked.size());
        }

        return reranked;
    }
}