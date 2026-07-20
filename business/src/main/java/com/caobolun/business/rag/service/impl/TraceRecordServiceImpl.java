package com.caobolun.business.rag.service.impl;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.caobolun.business.rag.dao.entity.TraceNodeDO;
import com.caobolun.business.rag.dao.entity.TraceRunDO;
import com.caobolun.business.rag.dao.mapper.TraceNodeMapper;
import com.caobolun.business.rag.dao.mapper.TraceRunMapper;
import com.caobolun.business.rag.service.TraceRecordService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TraceRecordServiceImpl implements TraceRecordService {

    private final TraceRunMapper runMapper;
    private final TraceNodeMapper nodeMapper;

    @Override
    public void startRun(TraceRunDO run) {
        runMapper.insert(run);
    }

    @Override
    public void finishRun(String traceId, String status, String errorMessage,
                          LocalDateTime endTime, long durationMs) {
        runMapper.update(null, Wrappers.lambdaUpdate(TraceRunDO.class)
                .eq(TraceRunDO::getTraceId, traceId)
                .set(TraceRunDO::getStatus, status)
                .set(TraceRunDO::getErrorMessage, errorMessage)
                .set(TraceRunDO::getEndTime, endTime)
                .set(TraceRunDO::getDurationMs, durationMs));
    }

    @Override
    public void startNode(TraceNodeDO node) {
        nodeMapper.insert(node);
    }

    @Override
    public void finishNode(String traceId, String nodeId, String status,
                           String errorMessage, LocalDateTime endTime, long durationMs) {
        nodeMapper.update(null, Wrappers.lambdaUpdate(TraceNodeDO.class)
                .eq(TraceNodeDO::getTraceId, traceId)
                .eq(TraceNodeDO::getNodeId, nodeId)
                .set(TraceNodeDO::getStatus, status)
                .set(TraceNodeDO::getErrorMessage, errorMessage)
                .set(TraceNodeDO::getEndTime, endTime)
                .set(TraceNodeDO::getDurationMs, durationMs));
    }

    @Override
    public IPage<TraceRunDO> pageRuns(int page, int size, String traceId) {
        Page<TraceRunDO> pageParam = new Page<>(page, size);
        return runMapper.selectPage(pageParam,
                Wrappers.lambdaQuery(TraceRunDO.class)
                        .eq(traceId != null && !traceId.isBlank(), TraceRunDO::getTraceId, traceId)
                        .orderByDesc(TraceRunDO::getStartTime));
    }

    @Override
    public List<TraceNodeDO> listNodes(String traceId) {
        return nodeMapper.selectList(
                Wrappers.lambdaQuery(TraceNodeDO.class)
                        .eq(TraceNodeDO::getTraceId, traceId)
                        .orderByAsc(TraceNodeDO::getStartTime));
    }

    @Override
    public TraceRunDO getRunByTraceId(String traceId) {
        return runMapper.selectOne(
                Wrappers.lambdaQuery(TraceRunDO.class)
                        .eq(TraceRunDO::getTraceId, traceId));
    }

    @Override
    public void updateRunTtft(String traceId, long ttftMs) {
        runMapper.update(null, Wrappers.lambdaUpdate(TraceRunDO.class)
                .eq(TraceRunDO::getTraceId, traceId)
                .set(TraceRunDO::getTtftMs, ttftMs));
    }
}