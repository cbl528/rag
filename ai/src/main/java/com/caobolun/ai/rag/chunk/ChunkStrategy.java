package com.caobolun.ai.rag.chunk;

import com.caobolun.ai.rag.model.VectorChunk;

import java.util.List;

/**
 *  分片策略
 */
public interface ChunkStrategy {

    ChunkMode getType();

    List<VectorChunk> chunk(String text, int chunkSize, int overlap);
}