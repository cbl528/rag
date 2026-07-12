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