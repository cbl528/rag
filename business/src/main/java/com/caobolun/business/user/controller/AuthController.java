package com.caobolun.business.user.controller;

import com.caobolun.business.user.dto.request.LoginRequest;
import com.caobolun.business.user.dto.response.LoginResponse;
import com.caobolun.business.user.dto.response.UserInfoResponse;
import com.caobolun.business.user.service.AuthService;
import com.caobolun.framework.convention.Result;
import com.caobolun.framework.web.Results;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public Result<LoginResponse> login(@RequestBody LoginRequest request) {
        return Results.success(authService.login(request));
    }

    @PostMapping("/logout")
    public Result<Void> logout() {
        authService.logout();
        return Results.success();
    }

    @GetMapping("/me")
    public Result<UserInfoResponse> me() {
        return Results.success(authService.me());
    }
}