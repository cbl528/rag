package com.caobolun.business.user.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.caobolun.business.user.dto.request.UserCreateDTO;
import com.caobolun.business.user.dto.request.UserPageDTO;
import com.caobolun.business.user.dto.request.UserUpdateDTO;
import com.caobolun.business.user.dto.response.UserVO;

public interface UserService {

    UserVO createUser(UserCreateDTO request);

    UserVO updateUser(Long id, UserUpdateDTO request);

    void deleteUser(Long id);

    Page<UserVO> pageUser(UserPageDTO request);

    UserVO getUserById(Long id);

}
