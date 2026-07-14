package com.caobolun.business.rag.rewrite;

import cn.hutool.core.collection.CollUtil;
import cn.hutool.core.util.StrUtil;
import com.caobolun.ai.client.OpenAICompatibleClient;
import com.caobolun.framework.convention.ChatMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

/**
 * 默认查询改写服务实现：
 * 基于 LLM 对用户问题进行语义替换，将代词消解为具体实体，提升 RAG 检索精度。
 *
 * 工作原理：
 * 1. 将对话历史（最近 2 轮）和当前问题一同发给 LLM
 * 2. LLM 根据 prompt 规则识别并替换代词（它、这个、这些、该文档等）
 * 3. 返回改写后的查询语句用于向量检索
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DefaultQueryRewriteService implements QueryRewriteService {

    private static final String REWRITE_PROMPT = """
            你是一个专业的"查询改写器"，仅用于 RAG 系统的检索阶段。

            【任务】
            将用户的当前问题改写为适合向量检索的查询语句。
            其中最重要的任务是：将问题中的代词（如"它""这个""这些""该文档""上面提到的XX"等）
            替换为历史对话中实际提到的具体实体名称。

            【输入】
            - 对话历史（最近几轮问答）
            - 当前用户问题

            【输出要求】
            - 仅返回 1 条改写后的查询语句，不要任何解释、前缀或后缀
            - 不要出现"改写为：""改写如下："等说明性文字
            - 改写成一条完整的自然语言句子，而非关键词堆砌

            【核心规则：指代消解】
            1. 如果当前问题中有代词（它、这个、这些、该、上文/上述等），必须从历史对话中找到它具体指代的内容并替换
            2. 例如：
               - 历史：用户问"OA系统的审批流程是什么"
                 当前："它的超时时间是多久？"
                 改写："OA系统的审批超时时间是多久"
               - 历史：用户问"直快赔数据安全文档有哪些要求"
                 当前："它和普通文档有什么区别？"
                 改写："直快赔数据安全文档和普通文档有什么区别"
            3. 如果历史中没有足够的上下文来确定代词指代，则保留原问题不变

            【其他改写规则】
            4. 删除礼貌用语：请帮我、麻烦、谢谢等
            5. 删除回答指令：详细说明、分点回答等
            6. 不要添加原问题中没有的新条件或实体
            7. 保持原问题的语言

            对话历史：
            %s

            当前用户问题：
            %s
            """;

    private final OpenAICompatibleClient openAICompatibleClient;

    @Override
    public String rewrite(String userQuestion, List<ChatMessage> history) {
        if (StrUtil.isBlank(userQuestion)) {
            return userQuestion;
        }
        // 获取最近2-3轮的历史会话
        String historyText = formatHistory(history);

        try {
            // 将历史会话和用户提问作为提示词，填入模板中
            String prompt = String.format(REWRITE_PROMPT, historyText, userQuestion);

            List<ChatMessage> messages = new ArrayList<>();
            messages.add(ChatMessage.user(prompt));

            // 调用AI的非流式对话方法，等待返回重写后的信息
            String rewritten = openAICompatibleClient.chat(messages);

            // 清理结果：去掉可能的引号
            rewritten = cleanedResult(rewritten);

            if (StrUtil.isNotBlank(rewritten)) {
                log.info("""
                        查询改写完成：
                        原始问题：{}
                        改写结果：{}""", userQuestion, rewritten);
                return rewritten;
            }
        } catch (Exception e) {
            log.warn("查询改写失败，回退到原始问题 - question={}", userQuestion, e);
        }

        return userQuestion;
    }

    /**
     * 将对话历史格式化为文本
     */
    private String formatHistory(List<ChatMessage> history) {
        if (CollUtil.isEmpty(history)) {
            return "(无历史对话)";
        }

        StringBuilder sb = new StringBuilder();
        // 只取最近 2-3 轮对话（最多 6 条消息），避免 token 浪费
        List<ChatMessage> recent = history.subList(
                Math.max(0, history.size() - 6), history.size());

        for (ChatMessage msg : recent) {
            String role = switch (msg.getRole()) {
                case USER -> "用户";
                case ASSISTANT -> "助手";
                default -> "系统";
            };
            String content = StrUtil.maxLength(msg.getContent(), 500);
            sb.append(role).append("：").append(content).append("\n");
        }
        return sb.toString();
    }

    /**
     * 清理 LLM 返回的结果：去掉首尾引号、空白等
     */
    private String cleanedResult(String text) {
        if (text == null) {
            return "";
        }
        String cleaned = text.trim();
        // 去掉首尾的引号
        if (cleaned.startsWith("\"") && cleaned.endsWith("\"")) {
            cleaned = cleaned.substring(1, cleaned.length() - 1);
        } else if (cleaned.startsWith("'") && cleaned.endsWith("'")) {
            cleaned = cleaned.substring(1, cleaned.length() - 1);
        }
        // 去掉首尾的「」
        if (cleaned.startsWith("「") && cleaned.endsWith("」")) {
            cleaned = cleaned.substring(1, cleaned.length() - 1);
        }
        return cleaned.trim();
    }
}
