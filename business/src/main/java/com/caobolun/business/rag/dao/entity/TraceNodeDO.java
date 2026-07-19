package com.caobolun.business.rag.dao.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@TableName("t_trace_node")
public class TraceNodeDO {

    @TableId(type = IdType.AUTO)
    private Long id;

    private String traceId;
    private String nodeId;
    private String parentNodeId;
    private Integer depth;
    private String nodeType;        // REWRITE/INTENT/RETRIEVE/LLM 等
    private String nodeName;
    private String className;
    private String methodName;
    private String status;          // RUNNING / SUCCESS / ERROR
    private String errorMessage;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private Long durationMs;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createTime;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updateTime;

    @TableLogic
    private Integer deleted;
}