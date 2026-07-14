package com.caobolun.ai.rag.rerank;

import com.caobolun.ai.rag.model.RetrievedChunk;
import lombok.extern.slf4j.Slf4j;

import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 默认 Rerank 实现：按 Milvus 原始分数排序 + 截断。
 * <p>
 * 当未配置专业 Rerank API（百炼/Jina 等）时使用此兜底实现。
 * 虽然不改变排序结果（已有 Milvus 的排序），但通过多取候选 + 截断，
 * 为后续接入真正的 Rerank API 预留了正确的数据流：
 * Milvus 取更多 → Rerank → 取 TopN
 * </p>
 */
@Slf4j
public class NoopRerankClient implements RerankClient {

    @Override
    public List<RetrievedChunk> rerank(String query, List<RetrievedChunk> candidates, int topN) {
        if (candidates == null || candidates.isEmpty()) {
            return List.of();
        }

        // 按 score 降序排列（score 高的更相关）
        List<RetrievedChunk> sorted = candidates.stream()
                .sorted(Comparator.comparing(RetrievedChunk::getScore,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();

        // 截取 topN
        List<RetrievedChunk> result = sorted.stream()
                .limit(topN > 0 ? topN : sorted.size())
                .collect(Collectors.toList());

        if (log.isDebugEnabled()) {
            log.debug("NoopRerank: {} candidates → {} results (topN={})",
                    candidates.size(), result.size(), topN);
        }

        return result;
    }
}
