package com.caobolun.ai.rag.embedding;

import com.caobolun.ai.config.OpenAIProperties;
import com.caobolun.framework.exception.ServiceException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import okhttp3.*;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * 向量化服务类
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EmbeddingService {

    private final OpenAIProperties openAIProperties;
    private final ObjectMapper objectMapper;

    private OkHttpClient httpClient = new OkHttpClient().newBuilder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(60, TimeUnit.SECONDS)
            .build();

    public float[] embed(String text) {
        List<float[]> results = embedBatch(List.of(text));
        return results.isEmpty() ? new float[0] : results.get(0);
    }

    public List<float[]> embedBatch(List<String> text) {
        if (text.isEmpty()) {
            return List.of();
        }
        try {
            String url = openAIProperties.getBaseUrl() + "/embeddings";
            //构建请求体
            String json = objectMapper.writeValueAsString(
                    Map.of(
                            "model", openAIProperties.getEmbeddingModel(),
                            "input", text.size() == 1 ? text.get(0) : text
                    )
            );
            Request request = new Request.Builder()
                    .url(url)
                    .header("Authorization", "Bearer " + openAIProperties.getApiKey())
                    .header("Content-Type", "application/json")
                    .post(RequestBody.create(json, MediaType.parse("application/json")))
                    .build();
            try (Response response = httpClient.newCall(request).execute()) {
                String bodyStr = response.body() != null ? response.body().string() : "";
                if (!response.isSuccessful()) {
                    log.error("向量化模型调用失败：status={}，body={}", response.code(), bodyStr);
                    throw new ServiceException("向量化API调用失败:" + response.code());
                }
                JsonNode root = objectMapper.readTree(bodyStr);
                JsonNode data = root.get("data");

                ArrayList<float[]> embeddings = new ArrayList<>();
                if (data != null && data.isArray()) {
                    for (JsonNode item : data) {
                        JsonNode embeddingNode = item.get("embedding");
                        if (embeddingNode != null && embeddingNode.isArray()) {
                            float[] emb = new float[embeddingNode.size()];
                            for (int i = 0; i < embeddingNode.size(); i++) {
                                emb[i] = (float) embeddingNode.get(i).asDouble();
                            }
                            embeddings.add(emb);
                        }
                    }
                }
                return embeddings;
            }
        } catch (Exception e) {
            log.error("向量模型调用失败", e);
            throw new ServiceException("向量化API调用失败");
        }
    }

}
