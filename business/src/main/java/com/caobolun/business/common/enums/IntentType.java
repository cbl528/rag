package com.caobolun.business.common.enums;

public enum IntentType {
    KB_QUERY,   // 知识库查询 → 需要 RAG 检索
    CHITCHAT    // 闲聊/无关 → 跳过 RAG，直接 LLM 回答
}