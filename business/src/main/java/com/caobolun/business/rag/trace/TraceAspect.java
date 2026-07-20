package com.caobolun.business.rag.trace;

import cn.hutool.core.util.IdUtil;
import cn.hutool.core.util.StrUtil;
import com.caobolun.business.rag.config.TraceProperties;
import com.caobolun.business.rag.dao.entity.TraceNodeDO;
import com.caobolun.business.rag.service.SystemConfigService;
import com.caobolun.business.rag.service.TraceRecordService;
import com.caobolun.framework.trace.TraceContext;
import com.caobolun.framework.trace.TraceNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.lang.reflect.Method;
import java.time.LocalDateTime;

@Slf4j
@Aspect
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
@RequiredArgsConstructor
public class TraceAspect {

    private static final String STATUS_RUNNING = "RUNNING";
    private static final String STATUS_SUCCESS = "SUCCESS";
    private static final String STATUS_ERROR = "ERROR";

    private final TraceRecordService traceRecordService;
    private final TraceProperties traceProperties;
    private final SystemConfigService systemConfigService;

    @Around("@annotation(traceNode)")
    public Object aroundNode(ProceedingJoinPoint joinPoint, TraceNode traceNode) throws Throwable {
        // 如果未开启链路追踪（优先读取动态配置，回退到静态值）
        if (!systemConfigService.getBoolean("rag.trace.enabled", traceProperties.isEnabled())) {
            return joinPoint.proceed();
        }
        // 获取当前链路ID
        String traceId = TraceContext.getTraceId();
        if (StrUtil.isBlank(traceId)) {
            return joinPoint.proceed();
        }
        // 获取方法签名
        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        // 根据签名获取方法
        Method method = signature.getMethod();
        // 生成节点ID
        String nodeId = IdUtil.getSnowflakeNextIdStr();
        // 获取父节点ID
        String parentNodeId = TraceContext.currentNodeId();
        // 获取节点的深度
        int depth = TraceContext.depth();
        LocalDateTime startTime = LocalDateTime.now();
        long startMillis = System.currentTimeMillis();

        traceRecordService.startNode(TraceNodeDO.builder()
                .traceId(traceId)
                .nodeId(nodeId)
                .parentNodeId(parentNodeId)
                .depth(depth)
                .nodeType(StrUtil.blankToDefault(traceNode.type(), "METHOD"))
                .nodeName(StrUtil.blankToDefault(traceNode.name(), method.getName()))
                .className(method.getDeclaringClass().getName())
                .methodName(method.getName())
                .status(STATUS_RUNNING)
                .startTime(startTime)
                .build());

        TraceContext.pushNode(nodeId);
        try {
            Object result = joinPoint.proceed();
            traceRecordService.finishNode(traceId, nodeId, STATUS_SUCCESS, null,
                    LocalDateTime.now(), System.currentTimeMillis() - startMillis);
            return result;
        } catch (Throwable ex) {
            traceRecordService.finishNode(traceId, nodeId, STATUS_ERROR,
                    truncateError(ex), LocalDateTime.now(), System.currentTimeMillis() - startMillis);
            throw ex;
        } finally {
            TraceContext.popNode();
        }
    }

    private String truncateError(Throwable throwable) {
        if (throwable == null) return null;
        String msg = throwable.getClass().getSimpleName() + ": "
                + StrUtil.blankToDefault(throwable.getMessage(), "");
        int max = traceProperties.getMaxErrorLength();
        return msg.length() <= max ? msg : msg.substring(0, max);
    }
}
