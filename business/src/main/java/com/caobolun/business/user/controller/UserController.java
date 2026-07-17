package com.caobolun.business.user.controller;

import cn.dev33.satoken.stp.StpUtil;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.caobolun.business.storage.MinioService;
import com.caobolun.business.user.dto.request.ProfileUpdateDTO;
import com.caobolun.business.user.dto.request.UserCreateDTO;
import com.caobolun.business.user.dto.request.UserPageDTO;
import com.caobolun.business.user.dto.request.UserUpdateDTO;
import com.caobolun.business.user.dto.response.UserVO;
import com.caobolun.business.user.service.AuthService;
import com.caobolun.business.user.service.UserService;
import com.caobolun.framework.convention.Result;
import com.caobolun.framework.exception.ClientException;
import com.caobolun.framework.web.Results;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Set;
import java.util.UUID;

@Slf4j
@RestController
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final AuthService authService;
    private final MinioService minioService;

    @Value("${upload.local-path:./uploads}")
    private String uploadBasePath;

    @PostMapping("/api/v1/users")
    public Result<UserVO> createUser(@RequestBody UserCreateDTO request) {
        StpUtil.checkRole("admin");
        return Results.success(userService.createUser(request));
    }

    @PutMapping("/api/v1/users/{id}")
    public Result<UserVO> updateUser(@PathVariable Long id, @RequestBody UserUpdateDTO request) {
        StpUtil.checkRole("admin");
        return Results.success(userService.updateUser(id, request));
    }

    @DeleteMapping("/api/v1/users/{id}")
    public Result<Void> deleteUser(@PathVariable Long id) {
        StpUtil.checkRole("admin");
        userService.deleteUser(id);
        return Results.success();
    }

    @GetMapping("/api/v1/users")
    public Result<Page<UserVO>> pageUser(@ModelAttribute UserPageDTO request) {
        StpUtil.checkRole("admin");
        return Results.success(userService.pageUser(request));
    }

    @GetMapping("/api/v1/users/{id}")
    public Result<UserVO> getUserById(@PathVariable Long id) {
        StpUtil.checkRole("admin");
        return Results.success(userService.getUserById(id));
    }

    /**
     * 上传头像（当前用户自己）
     */
    @PostMapping("/api/v1/users/avatar")
    public Result<String> uploadAvatar(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            throw new ClientException("请选择要上传的文件");
        }

        // 校验文件类型
        String contentType = file.getContentType();
        Set<String> allowedTypes = Set.of("image/jpeg", "image/png", "image/gif", "image/webp");
        if (contentType == null || !allowedTypes.contains(contentType)) {
            throw new ClientException("仅支持 JPG/PNG/GIF/WebP 格式的图片");
        }

        // 限制文件大小（2MB）
        if (file.getSize() > 2 * 1024 * 1024) {
            throw new ClientException("头像文件不能超过 2MB");
        }

        // 生成唯一文件名，保留扩展名
        String originalName = file.getOriginalFilename();
        String ext = "";
        if (originalName != null && originalName.contains(".")) {
            ext = originalName.substring(originalName.lastIndexOf("."));
        }
        String fileName = UUID.randomUUID().toString().replace("-", "") + ext;

        // 一次性读取文件字节（头像 ≤ 2MB，内存安全）
        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException e) {
            throw new com.caobolun.framework.exception.ServiceException("文件读取失败");
        }

        String avatarUrl = null;

        // 1. 优先使用 MinIO
        try (InputStream stream = new java.io.ByteArrayInputStream(bytes)) {
            avatarUrl = minioService.uploadAvatar(fileName, stream, bytes.length, file.getContentType());
            if (avatarUrl != null) {
                log.info("头像上传 MinIO 成功: {}", avatarUrl);
            }
        } catch (IOException e) {
            log.warn("MinIO 上传流异常: {}", e.getMessage());
        }

        // 2. MinIO 不可用 → 本地兜底
        if (avatarUrl == null) {
            try {
                Path avatarDir = Paths.get(uploadBasePath, "avatars");
                if (Files.notExists(avatarDir)) {
                    Files.createDirectories(avatarDir);
                }
                Path targetPath = avatarDir.resolve(fileName);
                Files.write(targetPath, bytes);
                avatarUrl = "/uploads/avatars/" + fileName;
                log.info("头像上传本地成功: {}", avatarUrl);
            } catch (IOException e) {
                log.error("本地头像上传失败", e);
                throw new com.caobolun.framework.exception.ServiceException("头像上传失败");
            }
        }

        // 3. 更新用户头像字段
        ProfileUpdateDTO profileUpdate = new ProfileUpdateDTO();
        profileUpdate.setAvatar(avatarUrl);
        authService.updateProfile(profileUpdate);

        return Results.success(avatarUrl);
    }
}