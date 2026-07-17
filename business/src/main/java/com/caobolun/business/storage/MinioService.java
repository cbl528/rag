package com.caobolun.business.storage;

import io.minio.BucketExistsArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.InputStream;

/**
 * MinIO 对象存储服务 —— 默认 bucket 为 avatar
 */
@Slf4j
@Component
public class MinioService {

    private static final String BUCKET_AVATAR = "avatar";

    @Value("${minio.endpoint}")
    private String endpoint;

    @Value("${minio.access-key}")
    private String accessKey;

    @Value("${minio.secret-key}")
    private String secretKey;

    private MinioClient client;

    @PostConstruct
    public void init() {
        try {
            client = MinioClient.builder()
                    .endpoint(endpoint)
                    .credentials(accessKey, secretKey)
                    .build();

            // 检查 avatar 桶是否存在，不存在则创建
            boolean exists = client.bucketExists(BucketExistsArgs.builder().bucket(BUCKET_AVATAR).build());
            if (!exists) {
                client.makeBucket(MakeBucketArgs.builder().bucket(BUCKET_AVATAR).build());
                log.info("MinIO bucket [{}] 已创建", BUCKET_AVATAR);
            } else {
                log.info("MinIO bucket [{}] 已存在，跳过创建", BUCKET_AVATAR);
            }

            log.info("MinIO 服务初始化完成, endpoint={}", endpoint);
        } catch (Exception e) {
            log.warn("MinIO 初始化失败，头像上传将使用本地兜底: {}", e.getMessage());
        }
    }

    /**
     * 上传头像到 avatar 桶
     *
     * @param objectName  对象名（如 "abc123.jpg"）
     * @param stream      文件输入流
     * @param size        文件大小
     * @param contentType MIME 类型
     * @return 可访问的 URL，失败时返回 null
     */
    public String uploadAvatar(String objectName, InputStream stream, long size, String contentType) {
        if (client == null) {
            return null;
        }
        try {
            client.putObject(PutObjectArgs.builder()
                    .bucket(BUCKET_AVATAR)
                    .object(objectName)
                    .stream(stream, size, -1)
                    .contentType(contentType)
                    .build());
            String url = endpoint + "/" + BUCKET_AVATAR + "/" + objectName;
            log.info("MinIO 上传成功: {}", url);
            return url;
        } catch (Exception e) {
            log.warn("MinIO 上传失败: {}", e.getMessage());
            return null;
        }
    }
}
