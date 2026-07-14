package com.caobolun.ai.config;

import io.milvus.v2.client.MilvusClientV2;
import io.milvus.v2.common.DataType;
import io.milvus.v2.common.IndexParam;
import io.milvus.v2.service.collection.request.CreateCollectionReq;
import io.milvus.v2.service.collection.request.HasCollectionReq;
import io.milvus.v2.service.collection.request.LoadCollectionReq;
import io.milvus.v2.service.index.request.CreateIndexReq;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Milvus 集合初始化器
 * <p>
 * 在应用启动完成后自动检查并创建 rag_knowledge 集合。
 * 作为独立的 {@link Component}，Spring 保证注入的 MilvusClientV2 已就绪。
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class MilvusCollectionInitializer {

    private final MilvusClientV2 milvusClient;
    private final MilvusProperties properties;

    @PostConstruct
    public void init() {
        String collectionName = properties.getCollectionName();

        // 检查集合是否已存在
        boolean exists = milvusClient.hasCollection(
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

        // 创建集合
        milvusClient.createCollection(CreateCollectionReq.builder()
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
        milvusClient.createIndex(CreateIndexReq.builder()
                .collectionName(collectionName)
                .indexParams(indexes)
                .build());

        // 加载到内存
        milvusClient.loadCollection(LoadCollectionReq.builder()
                .collectionName(collectionName)
                .build());

        log.info("Milvus collection '{}' loaded", collectionName);
    }
}
