package com.caobolun.ai.rag.rerank;

import com.caobolun.ai.config.RerankProperties;
import com.caobolun.ai.rag.model.RetrievedChunk;
import com.caobolun.framework.exception.ServiceException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import okhttp3.*;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@Slf4j
@Component
@RequiredArgsConstructor
public class HttpRerankClient implements RerankClient {

    private final ObjectMapper objectMapper;
    private final RerankProperties properties;
    private final OkHttpClient httpClient = new OkHttpClient().newBuilder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(60, TimeUnit.SECONDS)
            .build();

    @Override
    public List<RetrievedChunk> rerank(String query, List<RetrievedChunk> candidates, int topN) {
        // 1. 提取文档文本列表
        List<String> documents = candidates.stream()
                .map(RetrievedChunk::getContent)
                .toList();

        try {
            // 2. 构建请求体
            String json = objectMapper.writeValueAsString(Map.of(
                    "model", properties.getModel(),
                    "query", query,
                    "documents", documents,
                    "top_n", topN,
                    "return_documents", false
            ));

            // 3. POST 到 {baseUrl}/rerank
            Request request = new Request.Builder()
                    .url(properties.getBaseUrl() + "/rerank")
                    .header("Authorization", "Bearer " + properties.getApiKey())
                    .header("Content-Type", "application/json")
                    .post(RequestBody.create(json, MediaType.parse("application/json")))
                    .build();

            try (Response response = httpClient.newCall(request).execute()) {
                String body = response.body() != null ? response.body().string() : "";

                if (!response.isSuccessful()) {
                    log.error("Rerank API 调用失败：status={}， body={}", response.code(), body);
                    throw new ServiceException("Rerank API 调用失败" + response.code());
                }

                JsonNode root = objectMapper.readTree(body);
                JsonNode results = root.get("results");

                if (results == null || !results.isArray() || results.isEmpty()) {
                    log.warn("Rerank API 返回空结果：query='{}'", query);
                    return List.of();
                }

                List<RetrievedChunk> reranked = new ArrayList<>();
                for (JsonNode item : results) {
                    int index = item.get("index").asInt();
                    float score = (float) item.get("relevance_score").asDouble();
                    RetrievedChunk retrievedChunk = candidates.get(index);
                    retrievedChunk.setScore(score);
                    reranked.add(retrievedChunk);
                }
                log.info("Rerank 完成（硅基流动）：query='{}', candidates={}, final={}",
                        query, candidates.size(), reranked.size());
                return reranked;
            }
        } catch (Exception e) {
            log.error("Rerank 失败", e);
            throw new ServiceException("Rerank服务失败");
        }
    }
}