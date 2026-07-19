package com.caobolun.business.rag.intent;

public interface IntentService {

      /**
       * 检测用户意图，判断是否需要 RAG 检索
       *
       * @param userQuestion 原始用户问题
       * @return 意图识别结果
       */
      IntentResult detect(String userQuestion);
  }