package com.caobolun.business.user.service;

import com.caobolun.business.user.dto.request.BatchIdsDTO;
import com.caobolun.business.user.dto.request.BatchStatusDTO;
import com.caobolun.business.user.dto.request.LoginDTO;
import com.caobolun.business.user.dto.request.PasswordUpdateDTO;
import com.caobolun.business.user.dto.request.ProfileUpdateDTO;
import com.caobolun.business.user.dto.request.UserUpdateDTO;
import com.caobolun.business.user.dto.response.LoginVO;
import com.caobolun.business.user.dto.response.UserInfoVO;
import com.caobolun.business.user.dto.response.UserVO;

public interface AuthService {

    LoginVO login(LoginDTO request);

    void logout();

    UserInfoVO me();

    void updateProfile(ProfileUpdateDTO request);

    void updatePassword(PasswordUpdateDTO request);

    /**
     * 管理员修改用户信息（无需旧密码，可修改状态）
     */
    UserVO adminUpdateUser(Long id, UserUpdateDTO request);

    /**
     * 批量禁用/启用用户
     */
    void batchUpdateStatus(BatchStatusDTO request);

    /**
     * 批量删除用户
     */
    void batchDeleteUsers(BatchIdsDTO request);
}
