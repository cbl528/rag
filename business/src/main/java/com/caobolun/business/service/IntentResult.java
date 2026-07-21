package com.caobolun.business.service;

import com.caobolun.business.common.enums.IntentType;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class IntentResult {
    private IntentType intentType;
    private String explanation;
}