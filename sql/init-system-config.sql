-- =============================================================
-- 系统配置表（动态配置覆盖）
-- 前端可修改的配置项存储在此表，后端启动及运行时读取。
-- 当 enabled=1 时，此值覆盖 application.yaml 中的静态配置。
-- =============================================================

CREATE TABLE t_system_config (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    config_key VARCHAR(100) NOT NULL COMMENT '配置键，如 rag.rerank.enabled',
    config_value VARCHAR(500) NOT NULL DEFAULT '' COMMENT '配置值（字符串形式）',
    config_group VARCHAR(50) NOT NULL DEFAULT '' COMMENT '配置分组：rag/chat-model/embedding-model/rerank-model',
    description VARCHAR(200) DEFAULT '' COMMENT '配置说明',
    enabled TINYINT DEFAULT 1 COMMENT '是否启用：对模型组表示该模型是否启用，对 rag 组表示是否开启动态覆盖',
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted TINYINT DEFAULT 0,
    UNIQUE KEY uk_config_key (config_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统配置表（动态覆盖）';

-- =============================================================
-- 预置配置项
-- =============================================================

INSERT INTO t_system_config (config_key, config_value, config_group, description, enabled) VALUES

-- ===== 检索配置（rag）——enabled=动态覆盖开关 =====
('rag.rerank.enabled',        'false',  'rag',            '重排序开关，开启后对检索结果进行精排', 0),
('rag.candidate-top-k',       '20',     'rag',            'Milvus 多取候选数，越大召回越全但越慢', 0),
('rag.final-top-k',           '5',      'rag',            '最终保留给 LLM 的段落数', 0),
('rag.sse-timeout-ms',        '300000', 'rag',            'SSE 流式超时时间（毫秒）', 0),
('rag.trace.enabled',         'true',   'rag',            '链路追踪开关，记录每次对话的 RAG 调用链路', 0),

-- ===== 对话模型（chat-model）——enabled=该模型是否启用 =====
('openai.base-url',           'https://api.siliconflow.cn/v1',  'chat-model',     'OpenAI 兼容 API 地址', 1),
('openai.api-key',            '',                               'chat-model',     'API 密钥', 1),
('openai.chat-model',         'Qwen/Qwen3-8B',                  'chat-model',     '对话 LLM 模型名', 1),
('ollama.base-url',           'http://124.221.110.104:11434',   'chat-model',     'Ollama 服务地址', 0),
('ollama.model',              'deepseek-r1:1.5b',               'chat-model',     'Ollama 本地模型名', 0),

-- ===== 向量模型（embedding-model） =====
('openai.embedding-model',    'BAAI/bge-large-zh-v1.5',         'embedding-model', 'Embedding 向量化模型名', 1),

-- ===== 重排序模型（rerank-model） =====
('openai.rerank-model',       'Qwen/Qwen3-Reranker-0.6B',       'rerank-model',    '重排序模型名', 0);

-- =============================================================
-- 模型配置表
-- 存储模型连接信息，每种类型可以有多个模型（如多个对话模型）。
-- 通过 enabled 切换使用哪个模型，每种类型同时最多一个启用。
-- 当前启用的模型配置会被加载到 Redis 供运行时读取。
-- =============================================================

CREATE TABLE t_model_config (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    type VARCHAR(50) NOT NULL COMMENT '模型类型：chat-model / embedding-model / rerank-model',
    model_name VARCHAR(100) NOT NULL DEFAULT '' COMMENT '模型名，如 Qwen/Qwen3-8B',
    base_url VARCHAR(255) NOT NULL DEFAULT '' COMMENT 'API 地址',
    api_key VARCHAR(255) NOT NULL DEFAULT '' COMMENT 'API 密钥',
    enabled TINYINT DEFAULT 1 COMMENT '是否启用（每种类型同时最多一个启用）',
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted TINYINT DEFAULT 0,
    INDEX idx_type (type),
    INDEX idx_model_name (model_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='模型配置表';

-- =============================================================
-- 预置模型配置
-- =============================================================

INSERT INTO t_model_config (type, model_name, base_url, api_key, enabled) VALUES
('chat-model',        'Qwen/Qwen3-8B',                  'https://api.siliconflow.cn/v1', '', 1),
('embedding-model',   'BAAI/bge-large-zh-v1.5',         'https://api.siliconflow.cn/v1', '', 1),
('rerank-model',      'Qwen/Qwen3-Reranker-0.6B',       'https://api.siliconflow.cn/v1', '', 0);
