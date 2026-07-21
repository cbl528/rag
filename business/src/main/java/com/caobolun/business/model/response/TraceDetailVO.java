package com.caobolun.business.model.response;

import com.caobolun.business.model.entity.TraceNodeDO;
import com.caobolun.business.model.entity.TraceRunDO;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TraceDetailVO {

    private TraceRunDO run;

    private List<TraceNodeDO> nodes;
}
