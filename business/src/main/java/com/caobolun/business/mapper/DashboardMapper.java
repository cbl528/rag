package com.caobolun.business.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * 仪表盘专用 Mapper（自定义统计查询）
 */
@Mapper
public interface DashboardMapper {

    @Select("SELECT DATE(create_time) AS date, COUNT(*) AS value " +
            "FROM t_chat_session " +
            "WHERE create_time >= #{since} AND deleted = 0 " +
            "GROUP BY DATE(create_time) ORDER BY date ASC")
    List<Map<String, Object>> countSessionsByDay(@Param("since") LocalDateTime since);

    @Select("SELECT DATE(create_time) AS date, COUNT(*) AS value " +
            "FROM t_chat_message " +
            "WHERE create_time >= #{since} AND deleted = 0 " +
            "GROUP BY DATE(create_time) ORDER BY date ASC")
    List<Map<String, Object>> countMessagesByDay(@Param("since") LocalDateTime since);

    @Select("SELECT DATE(start_time) AS date, COUNT(*) AS value " +
            "FROM t_trace_run " +
            "WHERE start_time >= #{since} AND deleted = 0 " +
            "GROUP BY DATE(start_time) ORDER BY date ASC")
    List<Map<String, Object>> countTracesByDay(@Param("since") LocalDateTime since);
}
