package com.caobolun.business.controller;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.caobolun.business.model.entity.TraceNodeDO;
import com.caobolun.business.model.entity.TraceRunDO;
import com.caobolun.business.model.response.TraceDetailVO;
import com.caobolun.business.service.TraceRecordService;
import com.caobolun.framework.convention.Result;
import com.caobolun.framework.web.Results;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class TraceController {

    private final TraceRecordService traceRecordService;

    /**
     * 分页查询链路运行记录
     */
    @GetMapping("/api/v1/traces")
    public Result<IPage<TraceRunDO>> pageTraces(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String traceId) {
        return Results.success(traceRecordService.pageRuns(page, size, traceId));
    }

    /**
     * 查询链路详情（含所有节点）
     */
    @GetMapping("/api/v1/traces/{traceId}")
    public Result<TraceDetailVO> traceDetail(@PathVariable String traceId) {
        List<TraceNodeDO> nodes = traceRecordService.listNodes(traceId);
        TraceRunDO run = traceRecordService.getRunByTraceId(traceId);
        return Results.success(TraceDetailVO.builder()
                .run(run)
                .nodes(nodes)
                .build());
    }
}
