package com.caobolun.business.rag.callback;

/**
 *  流式调用回调接口
 */
public interface StreamCallback {
    // 每收到一个增量 token 累计文本 + 推 SSE 给前端
    void onContent(String content);
    // 模型正在思考（deepseek-r1 有） │ 推送思考过程
    default void onThinking(String content) {}   // 默认空实现
    // 模型回答完毕 │ 关闭 SSE 连接
    void onComplete();
    // 连接断开 / 异常  │ 通知前端错误
    void onError(Throwable error);
}
