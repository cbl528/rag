package com.caobolun.business.user.dto.request;

import lombok.Data;
import java.util.List;

@Data
public class BatchStatusDTO {
    private List<Long> ids;
    private Integer status;
}
