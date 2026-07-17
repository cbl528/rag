package com.caobolun.business.user.service.impl;

import cn.dev33.satoken.stp.StpUtil;
import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.caobolun.business.user.dao.entity.UserDO;
import com.caobolun.business.user.dao.mapper.UserMapper;
import com.caobolun.business.user.dto.request.LoginDTO;
import com.caobolun.business.user.dto.request.PasswordUpdateDTO;
import com.caobolun.business.user.dto.request.ProfileUpdateDTO;
import com.caobolun.business.user.dto.response.LoginVO;
import com.caobolun.business.user.dto.response.UserInfoVO;
import com.caobolun.business.user.service.AuthService;
import com.caobolun.framework.exception.ClientException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserMapper userMapper;

    @Override
    public LoginVO login(LoginDTO request) {
        // 参数校验
        if (request == null || StrUtil.isBlank(request.getUsername()) || StrUtil.isBlank(request.getPassword())) {
            throw new ClientException("用户名或密码不能为空");
        }
        // 查询用户
        UserDO user = userMapper.selectOne(
                new LambdaQueryWrapper<UserDO>()
                        .eq(UserDO::getUsername, request.getUsername())
        );
        if (user == null) {
            throw new ClientException("用户不存在");
        }
        // 账号状态校验（0=正常，1=禁用）
        if (Integer.valueOf(1).equals(user.getStatus())) {
            throw new ClientException("账号已被禁用，请联系管理员");
        }
        // 密码校验
//        if (!BCrypt.checkpw(request.getPassword(), user.getPassword())) {
//            throw new ClientException("密码错误");
//        }
        // todo: 密码暂时不加密
        if(!StrUtil.equals(request.getPassword(), user.getPassword())){
            throw new ClientException("密码错误");
        }
        StpUtil.login(user.getUserId());
        String token = StpUtil.getTokenValue();

        // 更新上次登录时间
        user.setLastLogin(LocalDateTime.now());
        userMapper.updateById(user);

        return LoginVO.builder()
                .token(token)
                .userId(user.getUserId())
                .username(user.getUsername())
                .nickname(user.getNickname())
                .role(user.getRole())
                .avatar(user.getAvatar())
                .build();
    }

    @Override
    public void logout() {
        StpUtil.logout();
    }

    @Override
    public UserInfoVO me() {
        UserDO user = getCurrentUser();
        return toUserInfoVO(user);
    }

    @Override
    public void updateProfile(ProfileUpdateDTO request) {
        UserDO user = getCurrentUser();
        if (StrUtil.isNotBlank(request.getNickname())) {
            user.setNickname(request.getNickname());
        }
        if (request.getAvatar() != null) {
            user.setAvatar(request.getAvatar());
        }
        userMapper.updateById(user);
    }

    @Override
    public void updatePassword(PasswordUpdateDTO request) {
        if (StrUtil.isBlank(request.getOldPassword()) || StrUtil.isBlank(request.getNewPassword())) {
            throw new ClientException("旧密码和新密码不能为空");
        }
        UserDO user = getCurrentUser();
        // todo: 密码暂时不加密
        if (!StrUtil.equals(request.getOldPassword(), user.getPassword())) {
            throw new ClientException("旧密码错误");
        }
        user.setPassword(request.getNewPassword());
        userMapper.updateById(user);
    }

    private UserDO getCurrentUser() {
        String userId = StpUtil.getLoginIdAsString();
        UserDO user = userMapper.selectOne(
                new LambdaQueryWrapper<UserDO>()
                        .eq(UserDO::getUserId, userId)
        );
        if (user == null) {
            throw new ClientException("用户不存在");
        }
        return user;
    }

    private UserInfoVO toUserInfoVO(UserDO user) {
        return UserInfoVO.builder()
                .userId(user.getUserId())
                .username(user.getUsername())
                .nickname(user.getNickname())
                .role(user.getRole())
                .avatar(user.getAvatar())
                .build();
    }
}
