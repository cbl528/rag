package com.caobolun.ai.rag.rerank;

import com.caobolun.ai.rag.model.RetrievedChunk;

import java.util.List;

/**
 * Rerank 客户端接口
 * <p>
 * 对向量检索出的候选文档片段进行精排，按与 query 的相关度重新排序，
 * 只返回前 topN 条最相关的结果。
 * </p>
 */
public interface RerankClient {

    /**
     * 对候选文档片段重新排序
     *
     * @param query      用户查询文本
     * @param candidates 待排序的候选文档片段（至少包含 chunkId 和 content）
     * @param topN       返回前 N 条最相关的结果
     * @return 重排序后的文档片段列表
     */
    List<RetrievedChunk> rerank(String query, List<RetrievedChunk> candidates, int topN);
}
