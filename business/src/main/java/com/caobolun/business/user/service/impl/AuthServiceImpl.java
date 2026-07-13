package com.caobolun.business.user.service.impl;

import cn.dev33.satoken.stp.StpUtil;
import cn.hutool.core.util.StrUtil;
import cn.hutool.crypto.digest.BCrypt;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.caobolun.business.user.dao.entity.UserDO;
import com.caobolun.business.user.dao.mapper.UserMapper;
import com.caobolun.business.user.dto.request.LoginDTO;
import com.caobolun.business.user.dto.response.LoginVO;
import com.caobolun.business.user.dto.response.UserInfoVO;
import com.caobolun.business.user.service.AuthService;
import com.caobolun.framework.exception.ClientException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

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

        return LoginVO.builder()
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
    public UserInfoVO me() {
        String userId = StpUtil.getLoginIdAsString();
        UserDO user = userMapper.selectOne(
                new LambdaQueryWrapper<UserDO>()
                        .eq(UserDO::getUserId, userId)
        );
        if (user == null) {
            throw new ClientException("用户不存在");
        }
        return UserInfoVO.builder()
                .userId(user.getUserId())
                .username(user.getUsername())
                .nickname(user.getNickname())
                .role(user.getRole())
                .avatar(user.getAvatar())
                .build();
    }
}
