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
@TableName("t_model_config")
public class ModelConfigDO {

    @TableId(type = IdType.AUTO)
    private Long id;

    /** 模型类型：chat-model / embedding-model / rerank-model */
    private String type;

    /** 模型名，如 Qwen/Qwen3-8B */
    private String modelName;

    /** API 地址 */
    private String baseUrl;

    /** API 密钥 */
    private String apiKey;

    /** 是否启用（每种类型最多一个启用） */
    private Integer enabled;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createTime;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updateTime;

    @TableLogic
    private Integer deleted;
}
