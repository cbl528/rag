package com.caobolun.framework.convention;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.Builder.Default;

import java.util.ArrayList;
import java.util.List;

/**
 * 聊天请求类
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatRequest {

    @Default
    private List<ChatMessage> messages = new ArrayList<>();

    private Double temperature; // 大模型的温度，控制回答的发散程度
    private Double topP; // 生成阶段，从词汇概率分布里，累加概率总和达到 P 阈值为止，只保留这部分候选词
    private Integer topK; // 检索阶段只获取相似度最高的前k条数据
    private Integer maxTokens; // 最大token数
    private Boolean thinking; // 是否开启深度思考

}
