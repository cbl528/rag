package com.caobolun.business.rag.dao.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@TableName("t_trace_run")
public class TraceRunDO {

    @TableId(type = IdType.AUTO)
    private Long id;

    private String traceId;
    private String traceName;
    private String entryMethod;
    private String sessionId;
    private String userId;
    private String status;          // RUNNING / SUCCESS / ERROR
    private String errorMessage;
    private String question;
    private Long ttftMs;            // 首包耗时
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