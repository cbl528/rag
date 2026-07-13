package com.caobolun.business.user.controller;

import com.caobolun.business.user.dto.request.LoginDTO;
import com.caobolun.business.user.dto.response.LoginVO;
import com.caobolun.business.user.dto.response.UserInfoVO;
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
}