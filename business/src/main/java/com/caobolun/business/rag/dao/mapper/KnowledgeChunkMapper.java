package com.caobolun.business.rag.dao.mapper;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.caobolun.business.rag.dao.entity.KnowledgeChunkDO;
import org.apache.ibatis.annotations.Mapper;

import java.util.List;

@Mapper
public interface KnowledgeChunkMapper extends BaseMapper<KnowledgeChunkDO> {

    /**
     * 批量查询（MyBatis-Plus 的 BaseMapper 没有 IN 查询的默认方法）
     */
    default List<KnowledgeChunkDO> selectByChunkIds(List<String> chunkIds) {
        return selectList(new LambdaQueryWrapper<KnowledgeChunkDO>()
                .in(KnowledgeChunkDO::getChunkId, chunkIds));
    }

    default List<KnowledgeChunkDO> selectByDocId(String docId) {
        return selectList(new LambdaQueryWrapper<KnowledgeChunkDO>()
                .eq(KnowledgeChunkDO::getDocId, docId));
    }
}