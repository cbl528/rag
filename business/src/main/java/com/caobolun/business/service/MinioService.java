package com.caobolun.business.service;

import io.minio.BucketExistsArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.SetBucketPolicyArgs;
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
    //todo: minio的桶目前是开放状态，后续看是否需要加签名校验
    private static final String BUCKET_AVATAR = "avatar";
    private static final String BUCKET_DOCUMENTS = "documents";

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

            initBucket(BUCKET_AVATAR);
            initBucket(BUCKET_DOCUMENTS);

            log.info("MinIO 服务初始化完成, endpoint={}", endpoint);
        } catch (Exception e) {
            log.warn("MinIO 初始化失败，头像上传将使用本地兜底: {}", e.getMessage());
        }
    }

    /**
     * 检查桶是否存在，不存在则创建并设为公开读
     */
    private void initBucket(String bucketName) throws Exception {
        boolean exists = client.bucketExists(BucketExistsArgs.builder().bucket(bucketName).build());
        if (!exists) {
            client.makeBucket(MakeBucketArgs.builder().bucket(bucketName).build());
            log.info("MinIO bucket [{}] 已创建", bucketName);
        }

        String policy = String.format(
            "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Principal\":{\"AWS\":[\"*\"]},\"Action\":[\"s3:GetObject\"],\"Resource\":[\"arn:aws:s3:::%s/*\"]}]}",
            bucketName);
        client.setBucketPolicy(SetBucketPolicyArgs.builder()
                .bucket(bucketName)
                .config(policy)
                .build());
        log.info("MinIO bucket [{}] 已设置为公开读", bucketName);
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

    /**
     * 上传文档原始文件到 documents 桶
     *
     * @param objectName 对象名（如 "uuid.txt"）
     * @param stream     文件输入流
     * @param size       文件大小
     * @return 可访问的 URL，失败时返回 null
     */
    public String uploadFile(String objectName, InputStream stream, long size) {
        if (client == null) {
            return null;
        }
        try {
            client.putObject(PutObjectArgs.builder()
                    .bucket(BUCKET_DOCUMENTS)
                    .object(objectName)
                    .stream(stream, size, -1)
                    .build());
            String url = endpoint + "/" + BUCKET_DOCUMENTS + "/" + objectName;
            log.info("MinIO 文档上传成功: {}", url);
            return url;
        } catch (Exception e) {
            log.warn("MinIO 文档上传失败: {}", e.getMessage());
            return null;
        }
    }
}
