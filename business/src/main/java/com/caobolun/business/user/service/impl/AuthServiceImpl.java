package com.caobolun.business.user.service.impl;

import cn.dev33.satoken.stp.StpUtil;
import cn.hutool.core.util.StrUtil;
import cn.hutool.crypto.digest.BCrypt;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.caobolun.business.user.dao.entity.UserEntity;
import com.caobolun.business.user.dao.mapper.UserMapper;
import com.caobolun.business.user.dto.request.LoginRequest;
import com.caobolun.business.user.dto.response.LoginResponse;
import com.caobolun.business.user.dto.response.UserInfoResponse;
import com.caobolun.business.user.service.AuthService;
import com.caobolun.framework.exception.ClientException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserMapper userMapper;

    @Override
    public LoginResponse login(LoginRequest request) {
        // 参数校验
        if (request == null || StrUtil.isBlank(request.getUsername()) || StrUtil.isBlank(request.getPassword())) {
            throw new ClientException("用户名或密码不能为空");
        }
        // 查询用户
        UserEntity user = userMapper.selectOne(
                new LambdaQueryWrapper<UserEntity>()
                        .eq(UserEntity::getUsername, request.getUsername())
        );
        if (user == null) {
            throw new ClientException("用户不存在");
        }
        // 密码校验
        if (!BCrypt.checkpw(request.getPassword(), user.getPassword())) {
            throw new ClientException("密码错误");
        }
        StpUtil.login(user.getUserId());
        String token = StpUtil.getTokenValue();

        return LoginResponse.builder()
                .token(token)
                .userId(user.getUserId())
                .username(user.getUsername())
                .role(user.getRole())
                .avatar(user.getAvatar())
                .build();
    }

    @Override
    public void logout() {
        StpUtil.logout();
    }

    @Override
    public UserInfoResponse me() {
        String userId = StpUtil.getLoginIdAsString();
        UserEntity user = userMapper.selectOne(
                new LambdaQueryWrapper<UserEntity>()
                        .eq(UserEntity::getUserId, userId)
        );
        if (user == null) {
            throw new ClientException("用户不存在");
        }
        return UserInfoResponse.builder()
                .userId(user.getUserId())
                .username(user.getUsername())
                .nickname(user.getNickname())
                .role(user.getRole())
                .avatar(user.getAvatar())
                .build();
    }
}
