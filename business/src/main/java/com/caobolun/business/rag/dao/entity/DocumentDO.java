package com.caobolun.business.rag.dao.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 上传的文档记录
 */
@Data
@TableName("t_document")
public class DocumentDO {

    @TableId(type = IdType.AUTO)
    private Long id;

    private String docId;

    private String fileName;

    private Long fileSize;

    private String fileType;

    private Integer chunkCount;

    private Integer chunkSize;

    private Integer chunkOverlap;

    private String status;

    private String errorMessage;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createTime;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updateTime;

    @TableLogic
    private Integer deleted;
}
