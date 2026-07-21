package com.caobolun.business.model.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@TableName("t_system_config")
public class SystemConfigDO {

    @TableId(type = IdType.AUTO)
    private Long id;

    /** 配置键，如 rag.rerank.enabled */
    private String configKey;

    /** 配置值（字符串形式） */
    private String configValue;

    /** 配置分组：rag/model/milvus/upload */
    private String configGroup;

    /** 配置说明 */
    private String description;

    /** 是否启用覆盖（1=启用，0=禁用） */
    private Integer enabled;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createTime;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updateTime;

    @TableLogic
    private Integer deleted;
}
