package com.caobolun.business.user.dao.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.caobolun.business.user.dao.entity.UserDO;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface UserMapper extends BaseMapper<UserDO> {
}
