package com.caobolun.business.user.controller;

import cn.dev33.satoken.stp.StpUtil;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.caobolun.business.user.dto.request.UserCreateRequest;
import com.caobolun.business.user.dto.request.UserPageRequest;
import com.caobolun.business.user.dto.request.UserUpdateRequest;
import com.caobolun.business.user.dto.response.UserResponse;
import com.caobolun.business.user.service.UserService;
import com.caobolun.framework.convention.Result;
import com.caobolun.framework.web.Results;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
// todo： 校验身份后面看能不能优化
@RestController
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @PostMapping("/api/v1/users")
    public Result<UserResponse> createUser(@RequestBody UserCreateRequest request) {
        StpUtil.checkRole("admin");
        return Results.success(userService.createUser(request));
    }

    @PutMapping("/api/v1/users/{id}")
    public Result<UserResponse> updateUser(@PathVariable Long id, @RequestBody UserUpdateRequest request) {
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
    public Result<Page<UserResponse>> pageUser(@ModelAttribute UserPageRequest request) {
        StpUtil.checkRole("admin");
        return Results.success(userService.pageUser(request));
    }

    @GetMapping("/api/v1/users/{id}")
    public Result<UserResponse> getUserById(@PathVariable Long id) {
        StpUtil.checkRole("admin");
        return Results.success(userService.getUserById(id));
    }
}