package com.caobolun.business.model.request;

import lombok.Data;
import java.util.List;

@Data
public class BatchIdsDTO {
    private List<Long> ids;
}
