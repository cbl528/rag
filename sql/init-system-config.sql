-- =============================================================
-- 系统配置表（动态配置覆盖）
-- 前端可修改的配置项存储在此表，后端启动及运行时读取。
-- 当 enabled=1 时，此值覆盖 application.yaml 中的静态配置。
-- =============================================================

CREATE TABLE t_system_config (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    config_key VARCHAR(100) NOT NULL COMMENT '配置键，如 rag.rerank.enabled',
    config_value VARCHAR(500) NOT NULL DEFAULT '' COMMENT '配置值（字符串形式）',
    config_group VARCHAR(50) NOT NULL DEFAULT '' COMMENT '配置分组：rag/model/milvus/upload',
    description VARCHAR(200) DEFAULT '' COMMENT '配置说明',
    enabled TINYINT DEFAULT 1 COMMENT '是否启用覆盖',
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted TINYINT DEFAULT 0,
    UNIQUE KEY uk_config_key (config_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统配置表（动态覆盖）';

-- =============================================================
-- 预置常见可配置项
-- 默认全部 enabled=0（不覆盖，使用 application.yaml 的值）
-- 管理员在控制台开启覆盖后生效
-- =============================================================

INSERT INTO t_system_config (config_key, config_value, config_group, description, enabled) VALUES

-- ===== 检索配置（rag） =====
('rag.rerank.enabled',       'false', 'rag', '重排序开关，开启后对检索结果进行精排', 0),
('rag.rerank.candidate-top-k', '20', 'rag', 'Milvus 多取候选数，越大召回越全但越慢', 0),
('rag.rerank.final-top-k',    '5',   'rag', '最终保留给 LLM 的段落数', 0),
('rag.rerank.model',         'Qwen/Qwen3-Reranker-0.6B', 'rag', '重排序模型名', 0),
('rag.trace.enabled',        'true', 'rag', '链路追踪开关，记录每次对话的 RAG 调用链路', 0),
('rag.sse-timeout-ms',       '300000', 'rag', 'SSE 流式超时时间（毫秒）', 0),

-- ===== 模型配置（model） =====
('openai.model',             'Qwen/Qwen3-8B', 'model', '对话 LLM 模型名', 0),
('openai.embedding-model',   'BAAI/bge-large-zh-v1.5', 'model', 'Embedding 向量化模型名', 0),
('ollama.model',             'deepseek-r1:1.5b', 'model', 'Ollama 本地模型名', 0);
