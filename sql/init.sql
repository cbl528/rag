CREATE TABLE t_chat_session (
                                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                                session_id VARCHAR(64) NOT NULL COMMENT '会话业务ID，UUID',
                                title VARCHAR(200) DEFAULT '' COMMENT '会话标题',
                                last_time DATETIME COMMENT '最后活跃时间',
                                create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                                deleted TINYINT DEFAULT 0,
                                UNIQUE KEY uk_session_id (session_id),
                                INDEX idx_create_time (create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='会话表';

CREATE TABLE t_chat_message (
                                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                                session_id VARCHAR(64) NOT NULL COMMENT '会话ID',
                                role VARCHAR(16) NOT NULL COMMENT 'user/assistant',
                                content TEXT NOT NULL COMMENT '消息内容',
                                thinking_content TEXT COMMENT '深度思考内容',
                                thinking_duration INT COMMENT '深度思考耗时(秒)',
                                create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                deleted TINYINT DEFAULT 0,
                                INDEX idx_session_id (session_id),
                                INDEX idx_create_time (create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='聊天消息表';

CREATE TABLE t_user (
                        id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '自增主键',
                        user_id VARCHAR(64) NOT NULL COMMENT '业务ID，UUID',
                        username VARCHAR(64) NOT NULL COMMENT '用户名',
                        password VARCHAR(256) DEFAULT '' COMMENT '密码（后续接入认证时使用）',
                        nickname VARCHAR(64) DEFAULT '' COMMENT '显示昵称',
                        avatar VARCHAR(512) DEFAULT '' COMMENT '头像URL',
                        create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        deleted TINYINT DEFAULT 0,
                        UNIQUE KEY uk_user_id (user_id),
                        UNIQUE KEY uk_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

ALTER TABLE t_chat_session ADD COLUMN user_id VARCHAR(64) DEFAULT 'default' NOT NULL COMMENT '用户ID';

INSERT INTO t_user (user_id, username, nickname)
VALUES ('default', 'default', '默认用户');

ALTER TABLE t_user ADD COLUMN role VARCHAR(32) DEFAULT 'user' NOT NULL COMMENT '角色：user-普通用户 admin-管理员';

INSERT INTO t_user (user_id, username, password, nickname, role)
VALUES ('admin', 'admin', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '管理员', 'admin');

CREATE TABLE t_knowledge_chunk (
                                   id BIGINT AUTO_INCREMENT PRIMARY KEY,
                                   chunk_id VARCHAR(64) NOT NULL COMMENT '全局唯一，对应 Milvus 主键',
                                   doc_id VARCHAR(64) NOT NULL COMMENT '来源文档 ID',
                                   chunk_index INT NOT NULL COMMENT '文档内序号',
                                   content TEXT NOT NULL COMMENT '分片文本',
                                   block_type VARCHAR(32) DEFAULT NULL COMMENT 'PARAGRAPH/TABLE/CODE/LIST等',
                                   section_context VARCHAR(512) DEFAULT NULL COMMENT '节级上下文（表头等）',
                                   outline_path JSON DEFAULT NULL COMMENT '章节路径',
                                   char_count INT DEFAULT 0 COMMENT '字符数',
                                   token_count INT DEFAULT 0 COMMENT '预估 token 数',
                                   metadata JSON DEFAULT NULL COMMENT '扩展元数据',
                                   create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
                                   update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                                   deleted TINYINT DEFAULT 0,
                                   UNIQUE KEY uk_chunk_id (chunk_id),
                                   KEY idx_doc_id (doc_id),
                                   FULLTEXT INDEX ft_content (content)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='知识库分片表';

-- ============================================================
-- 文档表（记录已上传的源文件）
-- ============================================================
CREATE TABLE t_document (
                            id BIGINT AUTO_INCREMENT PRIMARY KEY,
                            doc_id VARCHAR(64) NOT NULL COMMENT '文档业务ID，UUID',
                            file_name VARCHAR(255) NOT NULL COMMENT '原始文件名',
                            file_size BIGINT NOT NULL DEFAULT 0 COMMENT '文件大小（字节）',
                            file_type VARCHAR(32) DEFAULT 'txt' COMMENT '文件类型',
                            chunk_count INT DEFAULT 0 COMMENT '分片数量',
                            chunk_size INT DEFAULT 512 COMMENT '分片大小',
                            chunk_overlap INT DEFAULT 128 COMMENT '分片重叠',
                            status VARCHAR(16) DEFAULT 'uploading' COMMENT '状态：uploading/indexing/indexed/failed',
                            file_url VARCHAR(512) COMMENT 'MinIO 文件访问路径',
                            error_message TEXT COMMENT '失败原因',
                            create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
                            update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                            deleted TINYINT DEFAULT 0,
                            UNIQUE KEY uk_doc_id (doc_id),
                            KEY idx_status (status),
                            KEY idx_create_time (create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='文档表';

CREATE TABLE t_trace_run (
                             id BIGINT AUTO_INCREMENT PRIMARY KEY,
                             trace_id VARCHAR(64) NOT NULL COMMENT '全局链路ID',
                             trace_name VARCHAR(64) DEFAULT '' COMMENT '链路名称',
                             entry_method VARCHAR(128) DEFAULT '' COMMENT '入口方法',
                             session_id VARCHAR(64) DEFAULT NULL COMMENT '会话ID',
                             user_id VARCHAR(64) DEFAULT NULL COMMENT '用户ID',
                             status VARCHAR(16) NOT NULL DEFAULT 'RUNNING' COMMENT 'RUNNING/SUCCESS/ERROR',
                             error_message VARCHAR(1000) DEFAULT NULL COMMENT '错误信息',
                             question TEXT COMMENT '用户问题',
                             ttft_ms BIGINT DEFAULT NULL COMMENT '首包耗时(ms)',
                             start_time DATETIME NOT NULL COMMENT '开始时间',
                             end_time DATETIME DEFAULT NULL COMMENT '结束时间',
                             duration_ms BIGINT DEFAULT NULL COMMENT '总耗时(ms)',
                             create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                             update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                             deleted TINYINT DEFAULT 0,
                             INDEX idx_trace_id (trace_id),
                             INDEX idx_session_id (session_id),
                             INDEX idx_start_time (start_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='链路运行记录表';

CREATE TABLE t_trace_node (
                              id BIGINT AUTO_INCREMENT PRIMARY KEY,
                              trace_id VARCHAR(64) NOT NULL COMMENT '关联traceId',
                              node_id VARCHAR(64) NOT NULL COMMENT '节点ID',
                              parent_node_id VARCHAR(64) DEFAULT NULL COMMENT '父节点ID',
                              depth INT DEFAULT 0 COMMENT '节点深度',
                              node_type VARCHAR(32) DEFAULT 'METHOD' COMMENT '节点类型',
                              node_name VARCHAR(128) DEFAULT '' COMMENT '节点名称',
                              class_name VARCHAR(256) DEFAULT NULL COMMENT '类名',
                              method_name VARCHAR(128) DEFAULT NULL COMMENT '方法名',
                              status VARCHAR(16) NOT NULL DEFAULT 'RUNNING' COMMENT 'RUNNING/SUCCESS/ERROR',
                              error_message VARCHAR(1000) DEFAULT NULL COMMENT '错误信息',
                              start_time DATETIME NOT NULL COMMENT '开始时间',
                              end_time DATETIME DEFAULT NULL COMMENT '结束时间',
                              duration_ms BIGINT DEFAULT NULL COMMENT '耗时(ms)',
                              create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                              update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                              deleted TINYINT DEFAULT 0,
                              INDEX idx_trace_id (trace_id),
                              INDEX idx_node_id (node_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='链路节点记录表';