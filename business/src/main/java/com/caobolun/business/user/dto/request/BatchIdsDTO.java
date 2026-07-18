package com.caobolun.business.user.dto.request;

import lombok.Data;
import java.util.List;

@Data
public class BatchIdsDTO {
    private List<Long> ids;
}
