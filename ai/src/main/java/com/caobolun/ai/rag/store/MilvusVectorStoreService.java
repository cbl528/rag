package com.caobolun.ai.rag.store;

import com.caobolun.ai.config.MilvusProperties;
import com.caobolun.ai.rag.model.RetrievedChunk;
import com.caobolun.ai.rag.model.VectorChunk;
import com.google.gson.Gson;
import com.google.gson.JsonObject;
import io.milvus.v2.client.MilvusClientV2;
import io.milvus.v2.service.vector.request.DeleteReq;
import io.milvus.v2.service.vector.request.InsertReq;
import io.milvus.v2.service.vector.request.SearchReq;
import io.milvus.v2.service.vector.request.data.FloatVec;
import io.milvus.v2.service.vector.response.SearchResp;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class MilvusVectorStoreService implements VectorStoreService {

    private final MilvusClientV2 milvusClient;
    private final MilvusProperties properties;
    private final Gson gson = new Gson();

    @Override
    public void upsert(VectorChunk chunk) {
        JsonObject row = new JsonObject();
        row.addProperty("chunk_id", chunk.getChunkId());
        row.add("embedding", gson.toJsonTree(chunk.getEmbedding()));

        if (chunk.getContent() != null) {
            String preview = chunk.getContent().length() > 256
                    ? chunk.getContent().substring(0, 256)
                    : chunk.getContent();
            row.addProperty("content_preview", preview);
        }
        row.addProperty("block_type", chunk.getBlockType() != null ? chunk.getBlockType() : "");
        // doc_id 从 metadata 中取
        Object docId = chunk.getMetadata() != null ? chunk.getMetadata().get("doc_id") : null;
        if (docId != null) {
            row.addProperty("doc_id", docId.toString());
        }

        milvusClient.insert(InsertReq.builder()
                .collectionName(properties.getCollectionName())
                .data(List.of(row))
                .build());
    }

    @Override
    public void batchUpsert(List<VectorChunk> chunks) {
        if (chunks.isEmpty()) return;

        List<JsonObject> rows = new ArrayList<>();
        for (VectorChunk chunk : chunks) {
            JsonObject row = new JsonObject();
            row.addProperty("chunk_id", chunk.getChunkId());
            row.add("embedding", gson.toJsonTree(chunk.getEmbedding()));

            if (chunk.getContent() != null) {
                String preview = chunk.getContent().length() > 256
                        ? chunk.getContent().substring(0, 256)
                        : chunk.getContent();
                row.addProperty("content_preview", preview);
            }
            row.addProperty("block_type", chunk.getBlockType() != null ? chunk.getBlockType() : "");
            Object docId = chunk.getMetadata() != null ? chunk.getMetadata().get("doc_id") : null;
            if (docId != null) {
                row.addProperty("doc_id", docId.toString());
            }
            rows.add(row);
        }

        milvusClient.insert(InsertReq.builder()
                .collectionName(properties.getCollectionName())
                .data(rows)
                .build());

        log.info("Batch upsert {} chunks to Milvus", chunks.size());
    }

    @Override
    public List<RetrievedChunk> search(float[] embedding, int topK, String expr) {
        SearchResp response = milvusClient.search(SearchReq.builder()
                .collectionName(properties.getCollectionName())
                .annsField("embedding")
                .data(List.of(new FloatVec(embedding)))
                .topK(topK)
                .filter(expr != null && !expr.isEmpty() ? expr : null)
                .outputFields(List.of("chunk_id", "content_preview", "block_type"))
                .build());

        List<RetrievedChunk> results = new ArrayList<>();
        if (response.getSearchResults() != null && !response.getSearchResults().isEmpty()) {
            for (SearchResp.SearchResult result : response.getSearchResults().get(0)) {
                RetrievedChunk chunk = RetrievedChunk.builder()
                        .chunkId(String.valueOf(result.getId()))
                        .score(result.getScore())
                        .build();

                if (result.getEntity() != null) {
                    Object contentPreview = result.getEntity().get("content_preview");
                    if (contentPreview != null) {
                        chunk.setContent(contentPreview.toString());
                    }
                    Object blockType = result.getEntity().get("block_type");
                    if (blockType != null) {
                        chunk.setBlockType(blockType.toString());
                    }
                }
                results.add(chunk);
            }
        }
        return results;
    }

    @Override
    public void deleteByDocId(String docId) {
        milvusClient.delete(DeleteReq.builder()
                .collectionName(properties.getCollectionName())
                .filter("doc_id == '" + docId + "'")
                .build());
        log.info("Deleted vectors for doc_id={} from Milvus", docId);
    }

    @Override
    public void deleteByChunkId(String chunkId) {
        milvusClient.delete(DeleteReq.builder()
                .collectionName(properties.getCollectionName())
                .filter("chunk_id == '" + chunkId + "'")
                .build());
    }

}