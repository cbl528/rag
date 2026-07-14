package com.caobolun.ai.client;

import com.caobolun.ai.config.OpenAIProperties;
import com.caobolun.framework.callback.StreamCallback;
import com.caobolun.framework.convention.ChatMessage;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import okhttp3.*;
import okio.BufferedSource;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 *  OPENAI兼容的客户端接口
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class OpenAICompatibleClient implements LlmClient {

    private final OkHttpClient okHttpClient;
    private final OpenAIProperties properties;
    private final ObjectMapper objectMapper;

    @Override
    public void streamChat(List<ChatMessage> messages, StreamCallback callback) {
        doChat(messages, true, callback);
    }

    /**
     * 非流式调用：等待完整回复后一次性返回
     *
     * @param messages 消息列表
     * @return LLM 的完整回复文本
     */
    public String chat(List<ChatMessage> messages) {
        StringBuilder fullContent = new StringBuilder();
        try {
            fullContent.append(doSyncChat(messages));
        } catch (Exception e) {
            log.error("非流式调用 LLM 失败", e);
            throw new RuntimeException("LLM 调用失败", e);
        }
        return fullContent.toString();
    }

    /**
     * 发送同步（非流式）请求，返回完整响应文本
     */
    private String doSyncChat(List<ChatMessage> messages) throws Exception {
        Map<String, Object> body = buildRequestBody(messages, false);
        String json = objectMapper.writeValueAsString(body);

        Request request = new Request.Builder()
                .url(properties.getBaseUrl() + "/chat/completions")
                .addHeader("Authorization", "Bearer " + properties.getApiKey())
                .post(RequestBody.create(json, MediaType.get("application/json")))
                .build();

        try (Response response = okHttpClient.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                String errBody = response.body() != null ? response.body().string() : "";
                throw new RuntimeException("API 返回错误，HTTP " + response.code() + ": " + errBody);
            }
            ResponseBody responseBody = response.body();
            if (responseBody == null) {
                throw new RuntimeException("API 返回结果为空");
            }
            String responseStr = responseBody.string();
            JsonNode root = objectMapper.readTree(responseStr);
            JsonNode choices = root.get("choices");
            if (choices == null || !choices.isArray() || choices.isEmpty()) {
                throw new RuntimeException("API 返回 choices 为空: " + responseStr);
            }
            JsonNode message = choices.get(0).get("message");
            if (message == null || message.get("content") == null) {
                throw new RuntimeException("API 返回 message.content 为空");
            }
            return message.get("content").asText();
        }
    }

    private Map<String, Object> buildRequestBody(List<ChatMessage> messages, boolean stream) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", properties.getModel());
        body.put("messages", messages.stream()
                .map(msg -> {
                    Map<String, String> map = new LinkedHashMap<>();
                    map.put("role", msg.getRole().name().toLowerCase());
                    map.put("content", msg.getContent());
                    return map;
                }).collect(Collectors.toList()));
        body.put("stream", stream);
        return body;
    }

    /**
     * 流式调用共享逻辑
     */
    private void doChat(List<ChatMessage> messages, boolean stream, StreamCallback callback) {
        Map<String, Object> body = buildRequestBody(messages, true);

        String json;
        try{
            json = objectMapper.writeValueAsString(body);
        } catch (JsonProcessingException e){
            callback.onError(e);
            return;
        }

        // 发送请求
        Request request = new Request.Builder()
                .url(properties.getBaseUrl() + "/chat/completions")
                .addHeader("Authorization", "Bearer " + properties.getApiKey())
                .post(RequestBody.create(json, MediaType.get("application/json")))
                .build();

        try(Response response =okHttpClient.newCall(request).execute()){
            if(!response.isSuccessful()){
                callback.onError(new RuntimeException("API 返回错误，HTTP" + response.code()));
                return;
            }
            ResponseBody responseBody = response.body();
            if(responseBody == null){
                callback.onError(new RuntimeException("API返回结果为空"));
                return;
            }
            BufferedSource source = responseBody.source();
            String line;
            while((line = source.readUtf8Line()) != null){
                if(!line.startsWith("data: ")) continue;
                String data = line.substring(6).trim();
                if(data.isEmpty() || "[DONE]".equals(data)) continue;

                JsonNode jsonNode = objectMapper.readTree(data);
                JsonNode choices = jsonNode.get("choices");

                if(choices == null || !choices.isArray() || choices.isEmpty()) continue;
                JsonNode delta = choices.get(0).get("delta");
                if (delta == null) continue;

                JsonNode contentNode = delta.get("content");
                if (contentNode != null && !contentNode.asText().isEmpty()) {
                    callback.onContent(contentNode.asText());
                }

                JsonNode finishReason = choices.get(0).get("finish_reason");
                if(finishReason != null && !"null".equals(finishReason.asText()) && !finishReason.isEmpty()){
                    callback.onComplete();
                    return;
                }
            }
            callback.onComplete();
        } catch (Exception e){
            callback.onError(e);
            log.warn("调用大模型服务错误", e);
        }
    }
}
