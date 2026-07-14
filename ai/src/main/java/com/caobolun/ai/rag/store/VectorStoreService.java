package com.caobolun.ai.rag.store;

import com.caobolun.ai.rag.model.RetrievedChunk;
import com.caobolun.ai.rag.model.VectorChunk;

import java.util.List;

/**
 * 向量存储服务接口
 * 当前实现：Milvus
 * 可替换实现：PgVector、Chroma 等
 */
public interface VectorStoreService {

    /**
     * 插入或更新向量
     */
    void upsert(VectorChunk chunk);

    /**
     * 批量插入
     */
    void batchUpsert(List<VectorChunk> chunks);

    /**
     * 向量检索
     *
     * @param embedding 查询向量
     * @param topK      返回条数
     * @param expr      标量过滤表达式，如 "doc_id in ['doc1','doc2']"
     */
    List<RetrievedChunk> search(float[] embedding, int topK, String expr);

    /**
     * 删除文档的所有向量
     */
    void deleteByDocId(String docId);

    /**
     * 删除指定分片
     */
    void deleteByChunkId(String chunkId);
}