package com.caobolun.business.user.config;

import cn.dev33.satoken.stp.StpInterface;
import cn.hutool.core.util.ObjectUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.caobolun.business.user.dao.entity.UserEntity;
import com.caobolun.business.user.dao.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
public class SaTokenStpInterfaceImpl implements StpInterface {

    private final UserMapper userMapper;

    @Override
    public List<String> getRoleList(Object loginId, String loginType) {
        // 根据 userId 查询用户，返回角色列表
        LambdaQueryWrapper<UserEntity> wrapper = Wrappers.lambdaQuery(UserEntity.class).eq(UserEntity::getUserId, loginId.toString());
        UserEntity userEntity = userMapper.selectOne(wrapper);
        if (!ObjectUtil.isEmpty(userEntity)) {
            return List.of(userEntity.getRole());
        }
        return List.of();
    }

    @Override
    public List<String> getPermissionList(Object loginId, String loginType) {
        // 暂不使用权限系统
        return List.of();
    }
}