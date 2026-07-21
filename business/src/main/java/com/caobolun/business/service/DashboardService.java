package com.caobolun.business.service;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.caobolun.business.model.entity.ChatMessageDO;
import com.caobolun.business.model.entity.ChatSessionDO;
import com.caobolun.business.model.entity.DocumentDO;
import com.caobolun.business.model.entity.TraceRunDO;
import com.caobolun.business.mapper.*;
import com.caobolun.business.model.response.DashboardResponse;
import com.caobolun.business.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

/**
 * 控制台仪表盘服务
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DashboardService {

    private final UserMapper userMapper;
    private final DocumentMapper documentMapper;
    private final ChatSessionMapper chatSessionMapper;
    private final ChatMessageMapper chatMessageMapper;
    private final TraceRunMapper traceRunMapper;
    private final KnowledgeChunkMapper knowledgeChunkMapper;
    private final DashboardMapper dashboardMapper;

    private static final DateTimeFormatter DAY_FMT = DateTimeFormatter.ofPattern("MM-dd");

    /**
     * 获取仪表盘全量数据
     *
     * @param trendDays 趋势天数（范围 1-90，默认 14）
     * @return 仪表盘响应
     */
    public DashboardResponse getDashboard(int trendDays) {
        int days = Math.min(Math.max(trendDays, 1), 90);

        DashboardResponse.Overview overview = buildOverview();
        DashboardResponse.Performance performance = buildPerformance();
        DashboardResponse.TrendSeries trends = buildTrends(days);

        return DashboardResponse.builder()
                .overview(overview)
                .performance(performance)
                .trends(trends)
                .build();
    }

    /**
     * 构建总览统计数据
     */
    private DashboardResponse.Overview buildOverview() {
        long totalUsers = userMapper.selectCount(Wrappers.emptyWrapper());
        long totalDocuments = documentMapper.selectCount(
                Wrappers.<DocumentDO>lambdaQuery().eq(DocumentDO::getStatus, "indexed"));
        long totalSessions = chatSessionMapper.selectCount(Wrappers.emptyWrapper());
        long totalMessages = chatMessageMapper.selectCount(Wrappers.emptyWrapper());
        long totalChunks = knowledgeChunkMapper.selectCount(Wrappers.emptyWrapper());
        long totalTraces = traceRunMapper.selectCount(Wrappers.emptyWrapper());

        LocalDateTime todayStart = LocalDateTime.of(LocalDate.now(), LocalTime.MIN);
        long todaySessions = chatSessionMapper.selectCount(
                Wrappers.<ChatSessionDO>lambdaQuery().ge(ChatSessionDO::getCreateTime, todayStart));
        long todayMessages = chatMessageMapper.selectCount(
                Wrappers.<ChatMessageDO>lambdaQuery().ge(ChatMessageDO::getCreateTime, todayStart));

        return DashboardResponse.Overview.builder()
                .totalUsers(totalUsers)
                .totalDocuments(totalDocuments)
                .totalSessions(totalSessions)
                .totalMessages(totalMessages)
                .todaySessions(todaySessions)
                .todayMessages(todayMessages)
                .totalTraces(totalTraces)
                .totalChunks(totalChunks)
                .build();
    }

    /**
     * 构建性能数据
     */
    private DashboardResponse.Performance buildPerformance() {
        List<TraceRunDO> completedRuns = traceRunMapper.selectList(
                Wrappers.<TraceRunDO>lambdaQuery()
                        .in(TraceRunDO::getStatus, "SUCCESS", "ERROR")
                        .isNotNull(TraceRunDO::getDurationMs));

        long totalRuns = completedRuns.size();
        long successRuns = completedRuns.stream()
                .filter(r -> "SUCCESS".equalsIgnoreCase(r.getStatus()))
                .count();
        long failedRuns = totalRuns - successRuns;

        double avgLatencyMs = completedRuns.stream()
                .mapToLong(r -> r.getDurationMs() != null ? r.getDurationMs() : 0L)
                .filter(v -> v > 0)
                .average()
                .orElse(0);

        double avgTtftMs = completedRuns.stream()
                .filter(r -> r.getTtftMs() != null && r.getTtftMs() > 0)
                .mapToLong(TraceRunDO::getTtftMs)
                .average()
                .orElse(0);

        double successRate = totalRuns > 0 ? (double) successRuns / totalRuns * 100 : 0;

        return DashboardResponse.Performance.builder()
                .avgLatencyMs(Math.round(avgLatencyMs * 100.0) / 100.0)
                .avgTtftMs(Math.round(avgTtftMs * 100.0) / 100.0)
                .successRate(Math.round(successRate * 10.0) / 10.0)
                .totalRuns(totalRuns)
                .successRuns(successRuns)
                .failedRuns(failedRuns)
                .build();
    }

    /**
     * 构建趋势数据
     */
    private DashboardResponse.TrendSeries buildTrends(int days) {
        LocalDateTime since = LocalDateTime.of(LocalDate.now().minusDays(days - 1), LocalTime.MIN);

        List<DashboardResponse.TrendPoint> sessionsRaw = aggregateDaily(
                dashboardMapper.countSessionsByDay(since), days);
        List<DashboardResponse.TrendPoint> messagesRaw = aggregateDaily(
                dashboardMapper.countMessagesByDay(since), days);
        List<DashboardResponse.TrendPoint> tracesRaw = aggregateDaily(
                dashboardMapper.countTracesByDay(since), days);

        List<String> dates = new ArrayList<>();
        List<Long> sessionVals = new ArrayList<>();
        List<Long> messageVals = new ArrayList<>();
        List<Long> traceVals = new ArrayList<>();
        for (int i = 0; i < days; i++) {
            LocalDate d = LocalDate.now().minusDays(days - 1 - i);
            String dateStr = d.format(DAY_FMT);
            dates.add(dateStr);
            sessionVals.add(findValue(sessionsRaw, dateStr));
            messageVals.add(findValue(messagesRaw, dateStr));
            traceVals.add(findValue(tracesRaw, dateStr));
        }

        return DashboardResponse.TrendSeries.builder()
                .dates(dates)
                .sessions(sessionVals)
                .messages(messageVals)
                .traces(traceVals)
                .build();
    }

    private List<DashboardResponse.TrendPoint> aggregateDaily(
            List<Map<String, Object>> raw, int days) {
        Set<String> dateSet = new HashSet<>();
        List<DashboardResponse.TrendPoint> result = new ArrayList<>();
        for (Map<String, Object> row : raw) {
            Object dateObj = row.get("date");
            LocalDate date;
            if (dateObj instanceof java.sql.Date) {
                date = ((java.sql.Date) dateObj).toLocalDate();
            } else if (dateObj instanceof LocalDate) {
                date = (LocalDate) dateObj;
            } else {
                continue;
            }
            String key = date.format(DAY_FMT);
            dateSet.add(key);
            long value = row.get("value") != null ? ((Number) row.get("value")).longValue() : 0;
            result.add(DashboardResponse.TrendPoint.builder()
                    .date(key)
                    .value(value)
                    .build());
        }
        return result;
    }

    private long findValue(List<DashboardResponse.TrendPoint> list, String dateStr) {
        return list.stream()
                .filter(p -> p.getDate().equals(dateStr))
                .mapToLong(DashboardResponse.TrendPoint::getValue)
                .findFirst()
                .orElse(0);
    }
}
