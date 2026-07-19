package com.caobolun.business.rag.trace;

import cn.hutool.core.util.IdUtil;
import cn.hutool.core.util.StrUtil;
import com.caobolun.business.rag.config.TraceProperties;
import com.caobolun.business.rag.dao.entity.TraceRunDO;
import com.caobolun.business.rag.service.TraceRecordService;
import com.caobolun.framework.context.UserContext;
import com.caobolun.framework.trace.TraceContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * 流式对话的链路管理器
 * <p>
 * 在 ChatServiceImpl 入口调用 startRun 开启链路，
 * 在回调的 onComplete/onError 中结束链路。
 *
 * @TraceNode AOP 自动从 TraceContext 获取 traceId 写入节点。
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class StreamTraceRunner {

    private static final String TRACE_NAME = "rag-stream-chat";
    private static final String ENTRY_METHOD = "ChatServiceImpl#streamChat";
    private static final String STATUS_RUNNING = "RUNNING";
    private static final String STATUS_SUCCESS = "SUCCESS";
    private static final String STATUS_ERROR = "ERROR";

    private final TraceProperties traceProperties;
    private final TraceRecordService traceRecordService;

    /**
     * 开启一条流式对话链路
     *
     * @param question  用户问题
     * @param sessionId 会话ID
     * @return TraceSession，用于记录 TTFT 和结束链路
     */
    public TraceSession startRun(String question, String sessionId) {
        if (!traceProperties.isEnabled()) {
            return new TraceSession(null, null, 0);
        }

        String traceId = IdUtil.getSnowflakeNextIdStr();
        long startMillis = System.currentTimeMillis();

        traceRecordService.startRun(TraceRunDO.builder()
                .traceId(traceId)
                .traceName(TRACE_NAME)
                .entryMethod(ENTRY_METHOD)
                .sessionId(sessionId)
                .userId(UserContext.getUserId())
                .status(STATUS_RUNNING)
                .startTime(LocalDateTime.now())
                .question(question)
                .build());

        // 设置 traceId 到上下文，供 @TraceNode AOP 使用
        TraceContext.setTraceId(traceId);

        log.info("链路追踪开始: traceId={}, sessionId={}, question={}",
                traceId, sessionId, StrUtil.maxLength(question, 50));

        return new TraceSession(traceId, question, startMillis);
    }

    /**
     * 一条链路的会话控制
     */
    public class TraceSession {
        private final String traceId;
        private final long startMillis;
        private final AtomicBoolean ttftRecorded = new AtomicBoolean(false);
        private final AtomicBoolean finished = new AtomicBoolean(false);
        private boolean disabled;

        TraceSession(String traceId, String question, long startMillis) {
            this.traceId = traceId;
            this.startMillis = startMillis;
            this.disabled = (traceId == null);
        }

        /**
         * 首包到达时调用（幂等，仅第一次生效）
         */
        public void onFirstContent() {
            if (disabled) return;
            if (!ttftRecorded.compareAndSet(false, true)) return;

            long ttft = System.currentTimeMillis() - startMillis;
            traceRecordService.finishRun(traceId, STATUS_SUCCESS, null,
                    LocalDateTime.now(), ttft);
            // 用 finishRun 的 durationMs 字段暂存 TTFT
            // 之后最终结束时会再覆盖一次
            log.info("TTFT: traceId={}, ttftMs={}", traceId, ttft);
        }

        /**
         * 链路正常结束
         */
        public void onComplete() {
            if (disabled) return;
            if (!finished.compareAndSet(false, true)) return;

            long now = System.currentTimeMillis();
            long duration = now - startMillis;
            traceRecordService.finishRun(traceId, STATUS_SUCCESS, null,
                    LocalDateTime.now(), duration);
            TraceContext.clear();
            log.info("链路追踪结束: traceId={}, durationMs={}", traceId, duration);
        }

        /**
         * 链路异常结束
         */
        public void onError(Throwable error) {
            if (disabled) return;
            if (!finished.compareAndSet(false, true)) return;

            long now = System.currentTimeMillis();
            long duration = now - startMillis;
            String errMsg = error != null ? truncateError(error) : null;
            traceRecordService.finishRun(traceId, STATUS_ERROR, errMsg,
                    LocalDateTime.now(), duration);
            TraceContext.clear();
            log.warn("链路追踪异常结束: traceId={}, durationMs={}", traceId, duration, error);
        }
    }

    private String truncateError(Throwable throwable) {
        String msg = throwable.getClass().getSimpleName() + ": "
                + StrUtil.blankToDefault(throwable.getMessage(), "");
        int max = traceProperties.getMaxErrorLength();
        return msg.length() <= max ? msg : msg.substring(0, max);
    }
}
