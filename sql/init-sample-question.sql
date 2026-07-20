-- 建议问题表
CREATE TABLE t_sample_question (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '自增主键',
    title VARCHAR(200) NOT NULL COMMENT '问题标题',
    question TEXT NOT NULL COMMENT '点击后发送的问题内容',
    sort_order INT DEFAULT 0 COMMENT '排序，越小越靠前',
    enabled TINYINT DEFAULT 1 COMMENT '是否启用 1=启用 0=禁用',
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted TINYINT DEFAULT 0,
    INDEX idx_sort (sort_order),
    INDEX idx_enabled (enabled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='建议问题表';

-- 默认预置数据
INSERT INTO t_sample_question (title, question, sort_order) VALUES
('什么是 RAG 技术', '帮我解释什么是 RAG 技术', 1),
('如何优化文档分块策略', '如何优化文档分块策略', 2),
('中文 Embedding 模型推荐', '中文 Embedding 模型推荐有哪些', 3),
('设计一个知识检索流程', '设计一个知识检索流程', 4);
