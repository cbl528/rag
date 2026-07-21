package com.caobolun.business.controller;

import cn.dev33.satoken.stp.StpUtil;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.caobolun.business.model.request.UserCreateDTO;
import com.caobolun.business.model.request.UserPageDTO;
import com.caobolun.business.model.request.UserUpdateDTO;
import com.caobolun.business.model.response.UserVO;
import com.caobolun.business.service.UserService;
import com.caobolun.framework.convention.Result;
import com.caobolun.framework.exception.ClientException;
import com.caobolun.framework.web.Results;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

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
     * 用户自己修改个人信息（需旧密码校验）
     */
    @PutMapping("/api/v1/users/profile")
    public Result<UserVO> updateSelf(@RequestBody UserUpdateDTO request) {
        return Results.success(userService.updateSelf(request));
    }

    /**
     * 上传头像（当前用户自己）
     */
    @PostMapping("/api/v1/users/avatar")
    public Result<String> uploadAvatar(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            throw new ClientException("请选择要上传的文件");
        }
        return Results.success(userService.uploadAvatar(file));
    }
}