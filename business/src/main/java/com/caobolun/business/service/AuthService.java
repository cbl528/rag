package com.caobolun.business.service;

import com.caobolun.business.model.request.BatchIdsDTO;
import com.caobolun.business.model.request.BatchStatusDTO;
import com.caobolun.business.model.request.LoginDTO;
import com.caobolun.business.model.request.PasswordUpdateDTO;
import com.caobolun.business.model.request.ProfileUpdateDTO;
import com.caobolun.business.model.request.UserUpdateDTO;
import com.caobolun.business.model.response.LoginVO;
import com.caobolun.business.model.response.UserInfoVO;
import com.caobolun.business.model.response.UserVO;

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
