import com.caobolun.ai.rag.chunk.FixedSizeBoundaryChunker;
import com.caobolun.ai.rag.model.VectorChunk;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class FixedSizeBoundaryChunkerTest {

    private final FixedSizeBoundaryChunker chunker = new FixedSizeBoundaryChunker();

    @Test
    void testNormalChunking() {
        String text = "这是第一句话。这是第二句话。这是第三句话。"
                + "这是第四句话。这是第五句话。";
        List<VectorChunk> chunks = chunker.chunk(text, 15, 3);
        assertTrue(chunks.size() > 1);
        chunks.forEach(c -> {
            assertNotNull(c.getChunkId());
            assertNotNull(c.getContent());
            System.out.println(c.getChunkId() + c.getContent() + "\n");
        });
    }

    @Test
    void testBoundaryAdjustment() {
        // 切分点刚好在句号之前，应回退到句号后
        String text = "人工智能正在改变世界。深度学习是重要分支。自然语言处理发展迅速。";
        List<VectorChunk> chunks = chunker.chunk(text, 12, 5);
        // 第一片结束应该在"。"后面，而不是从中间切断
        if (chunks.size() >= 2) {
            assertTrue(chunks.get(0).getContent().endsWith("。"));
        }
    }

    @Test
    void testNewlineBoundary() {
        String text = "第一行内容\n第二行内容\n第三行内容\n第四行内容";
        List<VectorChunk> chunks = chunker.chunk(text, 10, 3);
        // 应在换行符处切分
        chunks.forEach(c -> {
            String content = c.getContent();
            // 每片的末尾不应该有截断的中文词
            System.out.println("chunk: " + content);
        });
    }

    @Test
    void testUrlNotBroken() {
        String text = "请访问 https://exam\nple.com 查看详情。这是后续内容。";
        List<VectorChunk> chunks = chunker.chunk(text, 20, 0);
        assertTrue(chunks.stream()
                .anyMatch(c -> c.getContent().contains("https://example.com")));
    }

    @Test
    void testEmptyText() {
        assertTrue(chunker.chunk("", 100, 10).isEmpty());
        assertTrue(chunker.chunk("  ", 100, 10).isEmpty());
        assertTrue(chunker.chunk(null, 100, 10).isEmpty());
    }
}