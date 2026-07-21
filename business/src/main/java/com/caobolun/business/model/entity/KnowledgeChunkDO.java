package com.caobolun.business.model.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 知识库分片对象
 */
@Data
@TableName("t_knowledge_chunk")
public class KnowledgeChunkDO {

    @TableId(type = IdType.AUTO)
    private Long id;

    private String chunkId;

    private String docId;

    private Integer chunkIndex;

    private String content;

    private String blockType;

    private String sectionContext;

    private String outlinePath;

    private Integer charCount;

    private Integer tokenCount;

    private String metadata;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createTime;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updateTime;

    @TableLogic
    private Integer deleted;
}