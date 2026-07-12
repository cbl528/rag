package com.caobolun.business.user.service.impl;

import com.caobolun.business.user.dao.mapper.UserMapper;
import com.caobolun.business.user.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserMapper userMapper;



}
