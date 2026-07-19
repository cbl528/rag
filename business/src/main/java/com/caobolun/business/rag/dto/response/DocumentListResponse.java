package com.caobolun.business.rag.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 文档列表响应
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DocumentListResponse {

    private String docId;

    private String fileName;

    private String fileType;

    private Long fileSize;

    private Integer chunkCount;

    private String status;

    private String errorMessage;

    private String fileUrl;

    private LocalDateTime createTime;
}
