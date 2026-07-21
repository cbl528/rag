package com.caobolun.business.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.caobolun.business.model.entity.TraceNodeDO;
import com.caobolun.business.model.entity.TraceRunDO;

import java.time.LocalDateTime;
import java.util.List;

public interface TraceRecordService {

    void startRun(TraceRunDO run);

    void finishRun(String traceId, String status, String errorMessage,
                   LocalDateTime endTime, long durationMs);

    void startNode(TraceNodeDO node);

    void finishNode(String traceId, String nodeId, String status,
                    String errorMessage, LocalDateTime endTime, long durationMs);

    /**
     * 分页查询链路运行记录
     */
    IPage<TraceRunDO> pageRuns(int page, int size, String traceId);

    /**
     * 查询链路的所有节点
     */
    List<TraceNodeDO> listNodes(String traceId);

    /**
     * 根据 traceId 查询链路运行记录
     */
    TraceRunDO getRunByTraceId(String traceId);

    /**
     * 更新首包耗时（仅设置 ttftMs）
     */
    void updateRunTtft(String traceId, long ttftMs);
}