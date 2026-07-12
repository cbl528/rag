package com.caobolun.business.user.service;

import com.caobolun.business.user.dto.request.LoginRequest;
import com.caobolun.business.user.dto.response.LoginResponse;
import com.caobolun.business.user.dto.response.UserInfoResponse;

public interface AuthService {

    LoginResponse login(LoginRequest request);

    void logout();

    UserInfoResponse me();

}
