package com.caobolun.business.rag.client;

import com.caobolun.business.rag.callback.StreamCallback;
import com.caobolun.business.rag.config.OllamaProperties;
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

/**
 *  ollama客户端
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class OllamaClient {

    private final OkHttpClient okHttpClient;
    private final OllamaProperties properties;
    private final ObjectMapper objectMapper;  // Jackson，Spring Boot 自动提供

    public void streamChat(String userMessage, StreamCallback callback) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("model", properties.getModel());
        map.put("messages", List.of(Map.of("role", "user", "content", userMessage)));
        map.put("stream", true);
        String jsonBody = null;
        try {
            jsonBody = objectMapper.writeValueAsString(map);
        } catch (JsonProcessingException e) {
            throw new RuntimeException(e);
        }

        Request request = new Request.Builder()
                .url(properties.getBaseUrl() + "/api/chat")
                .post(RequestBody.create(jsonBody, MediaType.get("application/json")))
                .build();

        try (Response response = okHttpClient.newCall(request).execute()) {
            // 检查 HTTP 状态码
            if (!response.isSuccessful()) {
                callback.onError(new RuntimeException("Ollama 返回错误: HTTP " +
                        response.code()));
                return;
            }
            // 判空
            ResponseBody body = response.body();
            if (body == null) {
                callback.onError(new RuntimeException("Ollama 返回空响应"));
                return;
            }
            BufferedSource source = body.source();
            String line;
            while((line = source.readUtf8Line()) != null){
                JsonNode jsonNode = objectMapper.readTree(line);
                boolean done = jsonNode.get("done").asBoolean();
                if(done){
                    callback.onComplete();
                    return;
                }
                JsonNode message = jsonNode.get("message");
                if(message != null) {
                    JsonNode contentNode = message.get("content");
                    if (contentNode != null && !contentNode.asText().isEmpty()) {
                        callback.onContent(contentNode.asText());
                    }
                }
            }
            // 流异常结束（没收到 done=true 就没内容了）
            callback.onError(new RuntimeException("Ollama 流式响应异常结束"));
        } catch (Exception e) {
            callback.onError(e);
        }
    }
}
