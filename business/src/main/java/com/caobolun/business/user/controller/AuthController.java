package com.caobolun.business.user.controller;

import cn.dev33.satoken.stp.StpUtil;
import com.caobolun.business.user.dto.request.BatchIdsDTO;
import com.caobolun.business.user.dto.request.BatchStatusDTO;
import com.caobolun.business.user.dto.request.LoginDTO;
import com.caobolun.business.user.dto.request.PasswordUpdateDTO;
import com.caobolun.business.user.dto.request.ProfileUpdateDTO;
import com.caobolun.business.user.dto.request.UserUpdateDTO;
import com.caobolun.business.user.dto.response.LoginVO;
import com.caobolun.business.user.dto.response.UserInfoVO;
import com.caobolun.business.user.dto.response.UserVO;
import com.caobolun.business.user.service.AuthService;
import com.caobolun.framework.convention.Result;
import com.caobolun.framework.web.Results;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/api/v1/auth/login")
    public Result<LoginVO> login(@RequestBody LoginDTO request) {
        return Results.success(authService.login(request));
    }

    @PostMapping("/api/v1/auth/logout")
    public Result<Void> logout() {
        authService.logout();
        return Results.success();
    }

    @GetMapping("/api/v1/auth/me")
    public Result<UserInfoVO> me() {
        return Results.success(authService.me());
    }

    @PutMapping("/api/v1/auth/profile")
    public Result<Void> updateProfile(@RequestBody ProfileUpdateDTO request) {
        authService.updateProfile(request);
        return Results.success();
    }

    @PutMapping("/api/v1/auth/password")
    public Result<Void> updatePassword(@RequestBody PasswordUpdateDTO request) {
        authService.updatePassword(request);
        return Results.success();
    }

    /**
     * 管理员修改用户信息（无需旧密码，可修改状态）
     */
    @PutMapping("/api/v1/auth/admin/users/{id}")
    public Result<UserVO> adminUpdateUser(@PathVariable Long id, @RequestBody UserUpdateDTO request) {
        StpUtil.checkRole("admin");
        return Results.success(authService.adminUpdateUser(id, request));
    }

    /**
     * 批量禁用/启用用户
     */
    @PutMapping("/api/v1/auth/admin/users/batch/status")
    public Result<Void> batchUpdateStatus(@RequestBody BatchStatusDTO request) {
        StpUtil.checkRole("admin");
        authService.batchUpdateStatus(request);
        return Results.success();
    }

    /**
     * 批量删除用户
     */
    @DeleteMapping("/api/v1/auth/admin/users/batch")
    public Result<Void> batchDeleteUsers(@RequestBody BatchIdsDTO request) {
        StpUtil.checkRole("admin");
        authService.batchDeleteUsers(request);
        return Results.success();
    }
}
