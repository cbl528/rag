package com.caobolun.business.rag.dto.response;

import com.caobolun.business.rag.dao.entity.TraceNodeDO;
import com.caobolun.business.rag.dao.entity.TraceRunDO;
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
