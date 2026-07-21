package com.caobolun.business.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.caobolun.business.model.entity.UserDO;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface UserMapper extends BaseMapper<UserDO> {
}
