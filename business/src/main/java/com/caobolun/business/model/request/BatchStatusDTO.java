package com.caobolun.business.model.request;

import lombok.Data;
import java.util.List;

@Data
public class BatchStatusDTO {
    private List<Long> ids;
    private Integer status;
}
