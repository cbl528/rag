package com.caobolun.business.user.service.impl;

import cn.hutool.core.util.StrUtil;
import cn.hutool.crypto.digest.BCrypt;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.caobolun.business.user.dao.entity.UserEntity;
import com.caobolun.business.user.dao.mapper.UserMapper;
import com.caobolun.business.user.dto.request.UserCreateRequest;
import com.caobolun.business.user.dto.request.UserPageRequest;
import com.caobolun.business.user.dto.request.UserUpdateRequest;
import com.caobolun.business.user.dto.response.UserResponse;
import com.caobolun.business.user.service.UserService;
import com.caobolun.framework.exception.ClientException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserMapper userMapper;

    @Override
    public UserResponse createUser(UserCreateRequest request) {
        // 1. 校验用户名
        if (StrUtil.isBlank(request.getUsername()) || StrUtil.isBlank(request.getPassword())) {
            throw new ClientException("用户名或密码不能为空");
        }
        // 2. 检查用户名唯一性
        Long count = userMapper.selectCount(
                new LambdaQueryWrapper<UserEntity>()
                        .eq(UserEntity::getUsername, request.getUsername())
        );
        if (count > 0) {
            throw new ClientException("用户名已存在");
        }
        // 3. 构建实体
        UserEntity user = UserEntity.builder()
                .userId(UUID.randomUUID().toString().replace("-", ""))
                .username(request.getUsername())
//                .password(BCrypt.hashpw(request.getPassword()))
                // todo: 暂时密码不做加密
                .password(request.getPassword())
                .nickname(StrUtil.isBlank(request.getNickname()) ? request.getUsername() : request.getNickname())
                .role(StrUtil.isBlank(request.getRole()) ? "user" : request.getRole())
                .avatar(StrUtil.nullToDefault(request.getAvatar(), ""))
                .build();
        userMapper.insert(user);
        return toUserResponse(user);
    }

    @Override
    public UserResponse updateUser(Long id, UserUpdateRequest request) {
        UserEntity user = userMapper.selectById(id);
        if (user == null) {
            throw new ClientException("用户不存在");
        }
        // 保护默认 admin 不被修改
        if ("admin".equals(user.getUsername())) {
            throw new ClientException("默认管理员不能修改");
        }
        // 逐字段更新（只更新非空字段）
        if (StrUtil.isNotBlank(request.getUsername())) {
            // 检查新用户名唯一性
            Long count = userMapper.selectCount(
                    new LambdaQueryWrapper<UserEntity>()
                            .eq(UserEntity::getUsername, request.getUsername())
                            .ne(UserEntity::getId, id)
            );
            if (count > 0) {
                throw new ClientException("用户名已存在");
            }
            user.setUsername(request.getUsername());
        }
        if (StrUtil.isNotBlank(request.getNickname())) {
            user.setNickname(request.getNickname());
        }
        if (StrUtil.isNotBlank(request.getRole())) {
            user.setRole(request.getRole());
        }
        if (StrUtil.isNotBlank(request.getAvatar())) {
            user.setAvatar(request.getAvatar());
        }
        userMapper.updateById(user);
        return toUserResponse(user);
    }

    @Override
    public void deleteUser(Long id) {
        UserEntity user = userMapper.selectById(id);
        if (user == null) {
            throw new ClientException("用户不存在");
        }
        // 保护默认 admin 不被删除
        if ("admin".equals(user.getUsername())) {
            throw new ClientException("默认管理员不能删除");
        }
        userMapper.deleteById(id);  // 逻辑删除（@TableLogic）
    }

    @Override
    public Page<UserResponse> pageUser(UserPageRequest request) {
        LambdaQueryWrapper<UserEntity> wrapper = new LambdaQueryWrapper<>();
        if (StrUtil.isNotBlank(request.getKeyword())) {
            wrapper.like(UserEntity::getUsername, request.getKeyword())
                    .or()
                    .like(UserEntity::getNickname, request.getKeyword());
        }
        // 按创建时间降序
        wrapper.orderByDesc(UserEntity::getCreateTime);

        Page<UserEntity> page = userMapper.selectPage(
                new Page<>(request.getPage(), request.getSize()), wrapper
        );
        // Entity -> Response 转换
        Page<UserResponse> result = new Page<>(page.getCurrent(), page.getSize(), page.getTotal());
        result.setRecords(page.getRecords().stream()
                .map(this::toUserResponse)
                .collect(Collectors.toList()));
        return result;
    }

    @Override
    public UserResponse getUserById(Long id) {
        UserEntity user = userMapper.selectById(id);
        if (user == null) {
            throw new ClientException("用户不存在");
        }
        return toUserResponse(user);
    }

    private UserResponse toUserResponse(UserEntity user) {
        return UserResponse.builder()
                .id(user.getId())
                .userId(user.getUserId())
                .username(user.getUsername())
                .nickname(user.getNickname())
                .role(user.getRole())
                .avatar(user.getAvatar())
                .createTime(user.getCreateTime())
                .updateTime(user.getUpdateTime())
                .build();
    }
}
