package com.caobolun.business.rag.intent;

import cn.hutool.core.util.StrUtil;
import com.caobolun.ai.client.OpenAICompatibleClient;
import com.caobolun.framework.convention.ChatMessage;
import com.caobolun.framework.trace.TraceNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class DefaultIntentService implements IntentService {

    private static final String INTENT_PROMPT = """
            你是一个 RAG 系统的意图识别器。

            【任务】
            判断用户的问题是"知识库查询"还是"闲聊/无关对话"。

            - KB_QUERY：用户提问与知识库中的文档内容相关，需要检索文档来回答。
              例如：OA系统的审批流程是什么、直快赔数据安全文档有哪些要求、介绍一下RPA技术
            - CHITCHAT：用户闲聊、打招呼、无关对话，不需要检索任何文档。
              例如：你好、你是谁、今天天气怎么样、讲个笑话、谢谢

            【输入】
            用户问题：%s

            【输出要求】
            只返回一个 JSON 对象，不要任何其他文字或标记：
            {"intent": "KB_QUERY", "explanation": "简短原因（不超过20字）"}
            """;

    private final OpenAICompatibleClient openAICompatibleClient;
    private final ObjectMapper objectMapper;

    @Override
    @TraceNode(name = "intent-detect", type = "INTENT")
    public IntentResult detect(String userQuestion) {
        // 1. 空安全
        if (StrUtil.isBlank(userQuestion)) {
            return IntentResult.builder()
                    .intentType(IntentType.KB_QUERY)
                    .explanation("空问题，走检索兜底")
                    .build();
        }

        // 2. 构造 prompt
        String prompt = String.format(INTENT_PROMPT, userQuestion);

        try {
            // 3. 调用 LLM（同步，非流式）
            String response = openAICompatibleClient.chat(List.of(ChatMessage.user(prompt)));
            if (StrUtil.isBlank(response)) {
                return fallback("LLM返回为空");
            }

            // 4. 解析 JSON 结果
            String cleaned = response.trim();
            // 去可能的代码块标记
            if (cleaned.startsWith("```")) {
                int idx = cleaned.indexOf('\n');
                if (idx != -1) cleaned = cleaned.substring(idx + 1);
                if (cleaned.endsWith("```")) cleaned = cleaned.substring(0, cleaned.length() - 3);
                cleaned = cleaned.trim();
            }

            @SuppressWarnings("unchecked")
            Map<String, String> result = objectMapper.readValue(cleaned, Map.class);
            String intentStr = result.get("intent");
            String explanation = result.getOrDefault("explanation", "");

            if (StrUtil.isNotBlank(intentStr)) {
                IntentType type = IntentType.valueOf(intentStr.trim().toUpperCase());
                log.info("意图识别: type={}, explanation={}, question={}", type, explanation, userQuestion);
                return IntentResult.builder()
                        .intentType(type)
                        .explanation(explanation)
                        .build();
            }
        } catch (Exception e) {
            log.warn("意图识别LLM调用失败，默认走检索 - question={}", userQuestion, e);
        }

        // 5. 兜底：默认走检索，避免漏召回
        return fallback("LLM调用失败，默认走检索");
    }

    private IntentResult fallback(String reason) {
        log.warn("意图识别降级: {}", reason);
        return IntentResult.builder()
                .intentType(IntentType.KB_QUERY)
                .explanation(reason)
                .build();
    }
}