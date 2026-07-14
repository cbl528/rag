package com.caobolun.business.rag.rerank;

import com.caobolun.ai.rag.model.RetrievedChunk;

import java.util.List;

/**
 * 重排序服务：对向量检索结果进行精排，提高 Top-N 结果的相关性。
 * <p>
 * 默认实现根据开关配置走 Noop（按分数截断）或后续接入的 Rerank API。
 * 与 QueryRewriteService 配合构成完整 RAG 检索预处理链路。
 * </p>
 */
public interface RerankService {

    /**
     * 对检索候选结果重新排序
     *
     * @param query      用户查询（改写后的查询）
     * @param candidates Milvus 检索出的候选文档片段（已含完整文本）
     * @return 精排后的文档片段列表
     */
    List<RetrievedChunk> rerank(String query, List<RetrievedChunk> candidates);
}
