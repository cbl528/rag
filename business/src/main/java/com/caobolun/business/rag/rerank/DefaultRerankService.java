package com.caobolun.business.rag.rerank;

import com.caobolun.ai.config.RerankProperties;
import com.caobolun.ai.rag.model.RetrievedChunk;
import com.caobolun.ai.rag.rerank.HttpRerankClient;
import com.caobolun.ai.rag.rerank.NoopRerankClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 默认重排序服务实现。
 * <p>
 * - 当 {@code rag.rerank.enabled=true} 时，使用 Rerank 模型对候选结果精排；
 * - 当 {@code rag.rerank.enabled=false}（默认）时，按 Milvus 原始分数截断。
 * <p>
 * 后续接入真正的 Rerank API（百炼/Jina 等）时，在此处扩展即可。
 * </p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DefaultRerankService implements RerankService {

    private final RerankProperties properties;
    private final HttpRerankClient httpRerankClient;
    private final NoopRerankClient noopRerankClient;

    @Override
    public List<RetrievedChunk> rerank(String query, List<RetrievedChunk> candidates) {
        if (candidates == null || candidates.isEmpty()) {
            return List.of();
        }

        int finalTopK = Math.max(1, properties.getFinalTopK());

        if (properties.isEnabled()) {
            // 启用 Rerank — 后续接入真实 Rerank API 时替换此分支
            return doEnabledRerank(query, candidates, finalTopK);
        } else {
            // 关闭 Rerank — 按分数截断（与原有行为一致）
            return doFallbackTruncate(candidates, finalTopK);
        }
    }

    /**
     * Rerank 启用时的精排逻辑
     * <p>
     * 后续接入百炼/Jina Rerank API 时，在此方法中
     * 注入真实的 RerankClient 并调用。
     * </p>
     */
    private List<RetrievedChunk> doEnabledRerank(String query, List<RetrievedChunk> candidates, int topN) {
        // 当前兜底：使用 NoopRerankClient 做基础排序截断
        List<RetrievedChunk> result;
        // TODO 接入真实 Rerank API：调用 RerankClient.rerank(query, candidates, topN)
        try {
            result = httpRerankClient.rerank(query, candidates, topN);
        } catch (Exception e){
            log.warn("Rerank API服务调用失败, 触发兜底服务", e);
            result = noopRerankClient.rerank(query, candidates, topN);
        }
        log.info("Rerank 完成（Noop 兜底）：query='{}', candidates={}, final={}",
                query, candidates.size(), result.size());
        return result;
    }

    /**
     * Rerank 关闭时：按 score 降序截取前 topN 条
     */
    private List<RetrievedChunk> doFallbackTruncate(List<RetrievedChunk> candidates, int topN) {
        return candidates.stream()
                .sorted(Comparator.comparing(RetrievedChunk::getScore,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(topN)
                .collect(Collectors.toList());
    }
}
