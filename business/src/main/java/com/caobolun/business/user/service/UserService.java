package com.caobolun.business.user.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.caobolun.business.user.dto.request.UserCreateRequest;
import com.caobolun.business.user.dto.request.UserPageRequest;
import com.caobolun.business.user.dto.request.UserUpdateRequest;
import com.caobolun.business.user.dto.response.UserResponse;

public interface UserService {

    UserResponse createUser(UserCreateRequest request);

    UserResponse updateUser(Long id, UserUpdateRequest request);

    void deleteUser(Long id);

    Page<UserResponse> pageUser(UserPageRequest request);

    UserResponse getUserById(Long id);

}
