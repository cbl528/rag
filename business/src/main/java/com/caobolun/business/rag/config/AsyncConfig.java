package com.caobolun.business.rag.config;

import com.alibaba.ttl.TtlRunnable;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.task.TaskExecutor;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.ThreadPoolExecutor;

/**
 * Spring @Async 异步支持配置。
 * <p>
 * 为 {@code @Async} 注解提供 TTL 感知的线程池，确保 {@code @Async}
 * 方法也能正确传递 UserContext（TransmittableThreadLocal）。
 * </p>
 *
 * <h3>使用方式</h3>
 * <pre>
 * &#064;Async
 * public CompletableFuture&lt;String&gt; doSomethingAsync() { ... }
 * </pre>
 *
 * <h3>注意</h3>
 * <ul>
 *   <li>此配置仅影响 {@code @Async} 注解的方法</li>
 *   <li>手动注入线程池使用 {@code ThreadPoolExecutorConfig} 中的 6 个 Bean</li>
 *   <li>例如：{@code private final Executor chatStreamExecutor;}</li>
 * </ul>
 */
@Slf4j
@EnableAsync
@Configuration
public class AsyncConfig {

    /**
     * 默认异步线程池：供 {@code @Async} 注解使用
     */
    @Bean("springAsyncExecutor")
    public TaskExecutor taskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(Math.max(4, Runtime.getRuntime().availableProcessors()));
        executor.setQueueCapacity(200);
        executor.setThreadNamePrefix("async-");
        // TTL 装饰器：@Async 方法跨线程时自动传递 TransmittableThreadLocal
        executor.setTaskDecorator(TtlRunnable::get);
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(30);
        executor.initialize();
        log.info("springAsyncExecutor created: core={}, max={}, queueCapacity={}",
                executor.getCorePoolSize(), executor.getMaxPoolSize(), executor.getQueueCapacity());
        return executor;
    }
}
