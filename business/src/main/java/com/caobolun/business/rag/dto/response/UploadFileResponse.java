package com.caobolun.business.rag.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 文档上传响应
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UploadFileResponse {

    private String docId;

    private String fileName;

    private int chunkCount;
}
