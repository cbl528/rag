package com.caobolun.business.user.service.impl;

import cn.hutool.core.util.StrUtil;
import cn.hutool.crypto.digest.BCrypt;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.caobolun.business.user.dao.entity.UserDO;
import com.caobolun.business.user.dao.mapper.UserMapper;
import com.caobolun.business.user.dto.request.UserCreateDTO;
import com.caobolun.business.user.dto.request.UserPageDTO;
import com.caobolun.business.user.dto.request.UserUpdateDTO;
import com.caobolun.business.user.dto.response.UserVO;
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
    public UserVO createUser(UserCreateDTO request) {
        // 1. 校验用户名
        if (StrUtil.isBlank(request.getUsername()) || StrUtil.isBlank(request.getPassword())) {
            throw new ClientException("用户名或密码不能为空");
        }
        // 2. 检查用户名唯一性
        Long count = userMapper.selectCount(
                new LambdaQueryWrapper<UserDO>()
                        .eq(UserDO::getUsername, request.getUsername())
        );
        if (count > 0) {
            throw new ClientException("用户名已存在");
        }
        // 3. 构建实体
        UserDO user = UserDO.builder()
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
        return toUserVO(user);
    }

    @Override
    public UserVO updateUser(Long id, UserUpdateDTO request) {
        UserDO user = userMapper.selectById(id);
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
                    new LambdaQueryWrapper<UserDO>()
                            .eq(UserDO::getUsername, request.getUsername())
                            .ne(UserDO::getId, id)
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
        return toUserVO(user);
    }

    @Override
    public void deleteUser(Long id) {
        UserDO user = userMapper.selectById(id);
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
    public Page<UserVO> pageUser(UserPageDTO request) {
        LambdaQueryWrapper<UserDO> wrapper = new LambdaQueryWrapper<>();
        if (StrUtil.isNotBlank(request.getKeyword())) {
            wrapper.like(UserDO::getUsername, request.getKeyword())
                    .or()
                    .like(UserDO::getNickname, request.getKeyword());
        }
        // 按创建时间降序
        wrapper.orderByDesc(UserDO::getCreateTime);

        Page<UserDO> page = userMapper.selectPage(
                new Page<>(request.getPage(), request.getSize()), wrapper
        );
        // Entity -> VO 转换
        Page<UserVO> result = new Page<>(page.getCurrent(), page.getSize(), page.getTotal());
        result.setRecords(page.getRecords().stream()
                .map(this::toUserVO)
                .collect(Collectors.toList()));
        return result;
    }

    @Override
    public UserVO getUserById(Long id) {
        UserDO user = userMapper.selectById(id);
        if (user == null) {
            throw new ClientException("用户不存在");
        }
        return toUserVO(user);
    }

    private UserVO toUserVO(UserDO user) {
        return UserVO.builder()
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
