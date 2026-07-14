package com.caobolun.ai.config;

import io.milvus.v2.client.ConnectConfig;
import io.milvus.v2.client.MilvusClientV2;
import io.milvus.v2.common.DataType;
import io.milvus.v2.common.IndexParam;
import io.milvus.v2.service.collection.request.CreateCollectionReq;
import io.milvus.v2.service.collection.request.HasCollectionReq;
import io.milvus.v2.service.collection.request.LoadCollectionReq;
import io.milvus.v2.service.index.request.CreateIndexReq;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Slf4j
@Configuration
@RequiredArgsConstructor
public class MilvusClientConfig {

    private final MilvusProperties properties;
    private MilvusClientV2 client;

    @Bean
    public MilvusClientV2 milvusClient() {
        ConnectConfig config = ConnectConfig.builder()
                .uri("http://" + properties.getHost() + ":" + properties.getPort())
                .build();
        client = new MilvusClientV2(config);
        log.info("Milvus client connected to {}:{}", properties.getHost(), properties.getPort());
        return client;
    }

    @PostConstruct
    public void initCollection() {
        if (client == null) return;

        String collectionName = properties.getCollectionName();

        // 检查 collection 是否已存在
        boolean exists = client.hasCollection(
                HasCollectionReq.builder()
                        .collectionName(collectionName)
                        .build());
        if (exists) {
            log.info("Milvus collection '{}' already exists", collectionName);
            return;
        }

        // 构建字段列表
        List<CreateCollectionReq.FieldSchema> fields = new ArrayList<>();

        fields.add(CreateCollectionReq.FieldSchema.builder()
                .name("chunk_id")
                .dataType(DataType.VarChar)
                .maxLength(64)
                .isPrimaryKey(true)
                .autoID(false)
                .build());

        fields.add(CreateCollectionReq.FieldSchema.builder()
                .name("embedding")
                .dataType(DataType.FloatVector)
                .dimension(properties.getDimension())
                .build());

        fields.add(CreateCollectionReq.FieldSchema.builder()
                .name("doc_id")
                .dataType(DataType.VarChar)
                .maxLength(64)
                .build());

        fields.add(CreateCollectionReq.FieldSchema.builder()
                .name("block_type")
                .dataType(DataType.VarChar)
                .maxLength(32)
                .build());

        fields.add(CreateCollectionReq.FieldSchema.builder()
                .name("content_preview")
                .dataType(DataType.VarChar)
                .maxLength(256)
                .build());

        // 构建 schema
        CreateCollectionReq.CollectionSchema schema = CreateCollectionReq.CollectionSchema.builder()
                .enableDynamicField(true)
                .fieldSchemaList(fields)
                .build();

        // 创建 collection
        client.createCollection(CreateCollectionReq.builder()
                .collectionName(collectionName)
                .collectionSchema(schema)
                .build());

        log.info("Milvus collection '{}' created", collectionName);

        // 创建向量索引
        List<IndexParam> indexes = new ArrayList<>();
        indexes.add(IndexParam.builder()
                .fieldName("embedding")
                .indexType(IndexParam.IndexType.IVF_FLAT)
                .metricType(IndexParam.MetricType.COSINE)
                .extraParams(Map.of("nlist", "128"))
                .build());
        client.createIndex(CreateIndexReq.builder()
                .collectionName(collectionName)
                .indexParams(indexes)
                .build());

        // 加载到内存
        client.loadCollection(LoadCollectionReq.builder()
                .collectionName(collectionName)
                .build());

        log.info("Milvus collection '{}' loaded", collectionName);
    }

    @PreDestroy
    public void close() {
        if (client != null) {
            client.close();
        }
    }
}