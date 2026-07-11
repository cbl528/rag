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
        // 构建请求请求体
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", properties.getModel());
        body.put("messages", messages.stream()
                .map(msg -> {
                    Map<String, String> map = new LinkedHashMap<>();
                    map.put("role", msg.getRole().name().toLowerCase());
                    map.put("content", msg.getContent());
                    return map;
                }).collect(Collectors.toList()));
        body.put("stream", true);

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
