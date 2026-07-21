package com.caobolun.business.model.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 控制台仪表盘数据
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DashboardResponse {

    /** 总览统计数据 */
    private Overview overview;

    /** 性能数据 */
    private Performance performance;

    /** 趋势数据 */
    private TrendSeries trends;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class TrendSeries {
        private List<String> dates;
        private List<Long> sessions;
        private List<Long> messages;
        private List<Long> traces;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Overview {
        private long totalUsers;
        private long totalDocuments;
        private long totalSessions;
        private long totalMessages;
        private long todaySessions;
        private long todayMessages;
        private long totalTraces;
        private long totalChunks;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Performance {
        private Double avgLatencyMs;
        private Double avgTtftMs;
        private Double successRate;
        private long totalRuns;
        private long successRuns;
        private long failedRuns;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class TrendPoint {
        private String date;
        private long value;
    }
}
