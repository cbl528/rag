package com.caobolun.ai.rag.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

/**
 * 检索结果
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RetrievedChunk {

    private String chunkId;

    private String content;

    private String sectionContext;

    private Float score;

    private String blockType;

    @Builder.Default
    private List<String> outlinePath = new ArrayList<>();

    public String toContextText() {
        StringBuilder sb = new StringBuilder();
        if (outlinePath != null && !outlinePath.isEmpty()) {
            sb.append(String.join(" > ", outlinePath)).append("\n");
        }
        if (sectionContext != null && !sectionContext.isEmpty()) {
            sb.append("[").append(sectionContext).append("]\n");
        }
        sb.append(content);
        return sb.toString();
    }
}