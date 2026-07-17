package com.caobolun.business.user.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.caobolun.business.user.dto.request.UserCreateDTO;
import com.caobolun.business.user.dto.request.UserPageDTO;
import com.caobolun.business.user.dto.request.UserUpdateDTO;
import com.caobolun.business.user.dto.response.UserVO;
import org.springframework.web.multipart.MultipartFile;

public interface UserService {

    UserVO createUser(UserCreateDTO request);

    UserVO updateUser(Long id, UserUpdateDTO request);

    void deleteUser(Long id);

    Page<UserVO> pageUser(UserPageDTO request);

    UserVO getUserById(Long id);

    /**
     * 上传头像：优先 MinIO，失败则本地兜底，并更新用户头像字段
     *
     * @param file 上传的图片文件
     * @return 可访问的头像 URL
     */
    String uploadAvatar(MultipartFile file);

}
