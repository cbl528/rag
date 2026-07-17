package com.caobolun.business.user.service;

import com.caobolun.business.user.dto.request.LoginDTO;
import com.caobolun.business.user.dto.request.PasswordUpdateDTO;
import com.caobolun.business.user.dto.request.ProfileUpdateDTO;
import com.caobolun.business.user.dto.response.LoginVO;
import com.caobolun.business.user.dto.response.UserInfoVO;

public interface AuthService {

    LoginVO login(LoginDTO request);

    void logout();

    UserInfoVO me();

    void updateProfile(ProfileUpdateDTO request);

    void updatePassword(PasswordUpdateDTO request);

}
