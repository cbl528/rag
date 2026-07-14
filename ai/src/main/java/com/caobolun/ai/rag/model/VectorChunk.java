package com.caobolun.ai.rag.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 分片结果
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VectorChunk {

    private String chunkId;

    private Integer index;

    private String content;

    private String embeddingText;

    @Builder.Default
    private Map<String, Object> metadata = new HashMap<>();

    private float[] embedding;

    @Builder.Default
    private List<String> outlinePath = new ArrayList<>();

    private String blockType;

    private String sectionContext;
}