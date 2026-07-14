package com.caobolun.ai.rag.chunk;

import cn.hutool.core.util.IdUtil;
import com.caobolun.ai.rag.model.VectorChunk;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * Level 3：固定大小 + 边界感知分片器
 * <p>
 * 切分策略：
 * 1. 先做文本归一化（URL修复、换行修复）
 * 2. 按 chunkSize 定位目标切分点
 * 3. 在 [target - overlap, target] 范围内寻找自然边界
 * 优先级：换行符 > 中文句末标点(。！？) > 英文句点(.!? 后接空白)
 * 4. 相邻 chunk 保留 overlap 长度的重叠
 */
@Slf4j
@Component
public class FixedSizeBoundaryChunker implements ChunkStrategy {

    @Override
    public ChunkMode getType() {
        return ChunkMode.FIXED_SIZE_BOUNDARY;
    }

    @Override
    public List<VectorChunk> chunk(String text, int chunkSize, int overlap) {
        if (text == null || text.isBlank()) {
            return List.of();
        }

        // 1. 归一化,去除多余的符号，以及一些文本的切断
        String normalized = TextNormalizer.normalize(text);

        // 2. 参数校验
        // 分块大小必须大于1
        int actualChunkSize = Math.max(1, chunkSize);
        // 重叠部分必须大于0
        int actualOverlap = Math.max(0, overlap);
        // 如果重叠部分大于1，但是不能大于等于分片长度，否则会陷入无限切分的问题
        if (actualChunkSize > 1) {
            actualOverlap = Math.min(actualOverlap, actualChunkSize - 1);
        } else {
            actualOverlap = 0;
        }

        // 3. 切分
        int len = normalized.length();
        List<VectorChunk> chunks = new ArrayList<>();
        int index = 0;
        int start = 0;
        int lastEnd = -1;

        while (start < len) {
            // 预期切割终点：当前起点 + 块大小，不超过文本总长
            int targetEnd = Math.min(start + actualChunkSize, len);
            // 核心方法：向前回溯找语义边界，修正真实切割终点
            int end = adjustToBoundary(normalized, start, targetEnd, actualOverlap);

            // 安全防护：防止回退过头导致死循环
            if (end <= start || end <= lastEnd) {
                end = targetEnd;
            }

            String content = normalized.substring(start, end);
            if (!content.isBlank()) {
                chunks.add(VectorChunk.builder()
                        .chunkId(IdUtil.getSnowflakeNextIdStr())
                        .index(index++)
                        .content(content)
                        .build());
            }

            lastEnd = end;
            if (end >= len) break;

            // 计算下一个 chunk 的起始位置（带重叠）
            int nextStart = Math.max(0, end - actualOverlap);
            if (nextStart <= start) {
                nextStart = end;
            }
            start = nextStart;
        }

        log.debug("chunk: textLen={}, chunkSize={}, overlap={}, chunks={}",
                len, actualChunkSize, actualOverlap, chunks.size());
        return chunks;
    }

    /**
     * 在 [targetEnd - maxLookBack, targetEnd] 范围内寻找自然边界
     * 优先级：换行符 > 中文句末标点 > 英文句末标点(后接空白)
     */
    static int adjustToBoundary(String text, int start, int targetEnd, int overlap) {
        if (targetEnd <= start) return targetEnd;

        int maxLookBack = Math.min(overlap, targetEnd - start);
        if (maxLookBack <= 0) return targetEnd;

        // 1) 换行符
        for (int i = 0; i <= maxLookBack; i++) {
            int pos = targetEnd - i - 1;
            if (pos <= start) break;
            if (text.charAt(pos) == '\n') return pos + 1;
        }

        // 2) 中文句末标点
        for (int i = 0; i <= maxLookBack; i++) {
            int pos = targetEnd - i - 1;
            if (pos <= start) break;
            char c = text.charAt(pos);
            if (c == '。' || c == '！' || c == '？') return pos + 1;
        }

        // 3) 英文句末标点（需后接空白或结尾，避免切烂 URL/缩写）
        for (int i = 0; i <= maxLookBack; i++) {
            int pos = targetEnd - i - 1;
            if (pos <= start) break;
            char c = text.charAt(pos);
            if (c == '.' || c == '!' || c == '?') {
                int next = pos + 1;
                if (next >= text.length()) return next;
                if (Character.isWhitespace(text.charAt(next))) return next;
            }
        }

        return targetEnd;
    }
}