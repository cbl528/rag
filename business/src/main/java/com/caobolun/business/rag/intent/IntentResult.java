package com.caobolun.business.rag.intent;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class IntentResult {
    private IntentType intentType;
    private String explanation;
}