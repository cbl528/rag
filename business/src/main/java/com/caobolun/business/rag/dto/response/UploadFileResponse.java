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

    private int chunkCount; // 分块数量

    private String status; // 文件状态 uploading/indexed/fail

    private String errorMessage; // 失败原因

    private String fileUrl; // MinIO 文件访问 URL
}
