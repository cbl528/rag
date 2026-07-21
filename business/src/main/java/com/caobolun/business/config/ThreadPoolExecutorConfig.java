package com.caobolun.business.config;

import cn.hutool.core.thread.ThreadFactoryBuilder;
import com.alibaba.ttl.threadpool.TtlExecutors;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.*;

/**
 * 线程池中心配置。
 * <p>
 * 所有业务线程池在此集中定义，统一使用 TtlExecutors 包装以支持
 * TransmittableThreadLocal（UserContext）的跨线程传递。
 * </p>
 *
 * <h3>线程池职责一览</h3>
 * <pre>
 * chatStreamExecutor    SSE 流式聊天下发，释放 Tomcat 线程
 * embeddingExecutor     Embedding HTTP 调用（文档批量 + 对话查询）
 * ragSearchExecutor     RAG 检索链路（embedding→搜索→DB→rerank）
 * documentIndexExecutor 文档索引全链路（分片→embedding→双写）
 * asyncTaskExecutor     通用异步任务（标题生成、会话更新等 fire-and-forget）
 * llmSyncExecutor       LLM 同步调用（查询改写 rewrite）
 * </pre>
 */
@Slf4j
@Configuration
public class ThreadPoolExecutorConfig {

    private static final int CPU_COUNT = Runtime.getRuntime().availableProcessors();

    /**
     * 1. SSE 流式聊天下发器
     * <p>
     * 将 LLM 流式 SSE 读取循环从 Tomcat 请求线程剥离到此池，
     * 使 Tomcat 线程能快速返回 SseEmitter，大幅提升并发处理能力。
     * </p>
     * <ul>
     *   <li>SynchronousQueue：流式任务需要立即执行，不排队</li>
     *   <li>CallerRunsPolicy：极端压力下降级到 Tomcat 线程，保证不丢请求</li>
     * </ul>
     */
    @Bean
    public Executor chatStreamExecutor() {
        ThreadPoolExecutor executor = new ThreadPoolExecutor(
                Math.max(4, CPU_COUNT),
                Math.max(8, CPU_COUNT * 2),
                60L, TimeUnit.SECONDS,
                new SynchronousQueue<>(),
                new ThreadFactoryBuilder().setNamePrefix("chat-stream-").build(),
                new ThreadPoolExecutor.CallerRunsPolicy());
        log.info("chatStreamExecutor created: core={}, max={}", executor.getCorePoolSize(), executor.getMaximumPoolSize());
        return TtlExecutors.getTtlExecutor(executor);
    }

    /**
     * 2. 向量化执行器
     * <p>
     * 处理所有 Embedding HTTP 调用：文档索引时的批量 embedding、
     * 对话时的 query embedding。网络 I/O 密集型，核心数不宜过大。
     * </p>
     */
    @Bean
    public Executor embeddingExecutor() {
        ThreadPoolExecutor executor = new ThreadPoolExecutor(
                Math.max(2, CPU_COUNT >> 1),
                Math.max(2, CPU_COUNT),
                60L, TimeUnit.SECONDS,
                new LinkedBlockingQueue<>(100),
                new ThreadFactoryBuilder().setNamePrefix("embedding-").build(),
                new ThreadPoolExecutor.CallerRunsPolicy());
        log.info("embeddingExecutor created: core={}, max={}", executor.getCorePoolSize(), executor.getMaximumPoolSize());
        return TtlExecutors.getTtlExecutor(executor);
    }

    /**
     * 3. RAG 检索执行器
     * <p>
     * 在后台执行完整 RAG 检索链路（embedding → Milvus 搜索 → DB 查询 → Rerank 精排），
     * 多条网络 I/O 串行，需要专用池进行隔离，避免影响其他任务。
     * </p>
     */
    @Bean
    public Executor ragSearchExecutor() {
        ThreadPoolExecutor executor = new ThreadPoolExecutor(
                Math.max(2, CPU_COUNT),
                CPU_COUNT * 2,
                60L, TimeUnit.SECONDS,
                new LinkedBlockingQueue<>(100),
                new ThreadFactoryBuilder().setNamePrefix("rag-search-").build(),
                new ThreadPoolExecutor.CallerRunsPolicy());
        log.info("ragSearchExecutor created: core={}, max={}", executor.getCorePoolSize(), executor.getMaximumPoolSize());
        return TtlExecutors.getTtlExecutor(executor);
    }

    /**
     * 4. 文档索引执行器
     * <p>
     * 文档索引全链路（分片 → embedding → 批量写入 MySQL → 批量写入 Milvus），
     * 重量级后台操作，core=2 控制并发索引文档数，避免 DB 和 Milvus 过载。
     * </p>
     */
    @Bean
    public Executor documentIndexExecutor() {
        ThreadPoolExecutor executor = new ThreadPoolExecutor(
                2,
                Math.max(2, CPU_COUNT >> 1),
                60L, TimeUnit.SECONDS,
                new LinkedBlockingQueue<>(50),
                new ThreadFactoryBuilder().setNamePrefix("doc-index-").build(),
                new ThreadPoolExecutor.CallerRunsPolicy());
        log.info("documentIndexExecutor created: core={}, max={}", executor.getCorePoolSize(), executor.getMaximumPoolSize());
        return TtlExecutors.getTtlExecutor(executor);
    }

    /**
     * 5. 通用异步任务执行器
     * <p>
     * 标题生成（LLM 总结对话标题）、会话更新时间、非关键数据库写入等
     * fire-and-forget 任务。低优先级但可能突发，使用大队列缓冲。
     * </p>
     */
    @Bean
    public Executor asyncTaskExecutor() {
        ThreadPoolExecutor executor = new ThreadPoolExecutor(
                2,
                Math.max(4, CPU_COUNT),
                60L, TimeUnit.SECONDS,
                new LinkedBlockingQueue<>(200),
                new ThreadFactoryBuilder().setNamePrefix("async-task-").build(),
                new ThreadPoolExecutor.CallerRunsPolicy());
        log.info("asyncTaskExecutor created: core={}, max={}", executor.getCorePoolSize(), executor.getMaximumPoolSize());
        return TtlExecutors.getTtlExecutor(executor);
    }

    /**
     * 6. LLM 同步调用执行器
     * <p>
     * 查询改写（rewrite）等同步 LLM 调用。独立隔离，避免同步 LLM 调用
     * 长时间占满通用线程池，影响流式任务。
     * </p>
     */
    @Bean
    public Executor llmSyncExecutor() {
        ThreadPoolExecutor executor = new ThreadPoolExecutor(
                2,
                Math.max(4, CPU_COUNT),
                60L, TimeUnit.SECONDS,
                new LinkedBlockingQueue<>(100),
                new ThreadFactoryBuilder().setNamePrefix("llm-sync-").build(),
                new ThreadPoolExecutor.CallerRunsPolicy());
        log.info("llmSyncExecutor created: core={}, max={}", executor.getCorePoolSize(), executor.getMaximumPoolSize());
        return TtlExecutors.getTtlExecutor(executor);
    }
}
