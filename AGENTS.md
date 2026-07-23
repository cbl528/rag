# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Build & Run

```bash
# 编译所有模块
mvn compile

# 强制更新 Maven 依赖（阿里云镜像缓存未同步时使用）
mvn compile -U

# 启动后端（business 模块，含有 @SpringBootApplication）
mvn spring-boot:run -pl business -am

# 启动前端（新终端，fronted 目录）
cd fronted && npm run dev

# 前端构建
cd fronted && npm run build

# 运行所有测试
mvn test

# 运行单个模块测试
mvn test -pl ai
```

后端运行在 `localhost:8000`，前端开发服务器在 `localhost:5173`，Vite 自动代理 `/api` 到后端。

**注意**: `**/application-dev.yaml`（含 API Key、数据库密码等敏感信息）在 `.gitignore` 中，新建环境需复制 `business/src/main/resources/application-dev.yaml` 并配置。

## Project Architecture

Maven 多模块（JDK 17 + Spring Boot 3.5.16 + MyBatis-Plus 3.5.14），模块依赖方向：

```
rag (pom)                             ← 父模块，管理第三方依赖版本
├── framework (jar)                   ← 基础公共库（无 Spring Boot 启动依赖）
├── ai (jar)                          ← AI 能力层，依赖 framework
└── business (jar)                    ← Web 层、启动入口，依赖 ai + framework
```

### 模块职责

- **framework** — 纯 POJO 和工具类：`Result<T>` 统一响应、`SseEmitterSender`（CAS 保证一次完成）、`GlobalExceptionHandler`（拦截异常+SSE 特殊处理）、`ChatMessage`（三种角色枚举）、`UserContext`（ThreadLocal）、异常体系（ClientException/ServiceException）、错误码（A/B/C 前缀）
- **ai** — AI 核心：LLM 客户端（OpenAI 兼容 + Ollama）、文档分片（`FixedSizeBoundaryChunker`）、向量化（`EmbeddingService`）、向量存储（`VectorStoreService` 接口 + Milvus 实现 `MilvusVectorStoreService`）、Rerank（`HttpRerankClient` + `NoopRerankClient` 兜底）、Milvus 集合自动初始化
- **business** — Spring Boot 启动类、Controller、Service、MyBatis Mapper/Entity、对话记忆、RAG 检索编排、查询改写、Sa-Token 配置、MinIO 对象存储、用户管理

### 非模块目录
- `text/` — 测试文档目录，存放用于上传测试的 .txt 和 .md 文件
- `sql/init.sql` — 数据库初始化脚本，含所有表 DDL 及预置数据（默认用户 admin/密码见 application-dev.yaml）

## 线程池架构（6 个专用线程池）

所有业务线程池在 `ThreadPoolExecutorConfig` 集中定义，统一用 `TtlExecutors` 包装以支持 `TransmittableThreadLocal`（UserContext）跨线程传递。

| Bean 名 | Core/Max | 用途 |
|---------|----------|------|
| `chatStreamExecutor` | 4/8+ | SSE 流式下发的读取循环，SynchronousQueue 不排队 |
| `embeddingExecutor` | CPU/2 ~ CPU | Embedding HTTP 调用（文档批量 + 对话查询） |
| `ragSearchExecutor` | CPU ~ CPU*2 | RAG 检索链路（embedding→Milvus→DB→rerank） |
| `documentIndexExecutor` | 2/2+ | 文档索引全链路（分片→embedding→双写 MySQL+Milvus） |
| `asyncTaskExecutor` | 2/4+ | 通用 fire-and-forget 任务（标题生成、会话更新等） |
| `llmSyncExecutor` | 2/4+ | LLM 同步调用（查询改写 rewrite） |

`AsyncConfig` 额外提供 `springAsyncExecutor` 给 `@Async` 注解使用，同样 TTL 包装。

## Key Data Flows

### 流式对话（异步编排）

`ChatServiceImpl.streamChat()` 使用 `CompletableFuture` 链式编排，每个阶段切换到对应线程池：

```
用户输入 → ChatController(@GET /api/v1/rag/chat) → SSE
  → chatStreamExecutor: 加载历史 + 保存用户消息
      ├─ 新会话 → asyncTaskExecutor: 立即异步生成标题（与主链路并行）
      └─ → llmSyncExecutor: QueryRewriteService.rewrite() 消解代词
          → ragSearchExecutor: RagSearchService.searchAsContext()
              ├─ EmbeddingService.embed(query)
              ├─ MilvusVectorStoreService.search()
              ├─ MySQL 回填完整文本
              ├─ RerankService.rerank()
              └─ 组装 context 字符串
          → chatStreamExecutor: 构造 system prompt → OpenAI 流式 SSE 下发
              → 完成时保存 assistant 消息 → 发 done 事件
```

### 文档上传与索引

```
用户上传文件 → AdminController(/api/v1/admin/document/upload)
  → UploadFileService.upload()
    → 1. 读取 .txt/.md 文件内容（UTF-8）
    → 2. 上传原始文件到 MinIO documents 桶（分片前持久化，fileUrl 存 t_document.file_url）
    → 3. 写入 t_document 记录（状态=uploading, fileUrl）
    → 4. DocumentService.indexDocument() → 异步（documentIndexExecutor）
      → FixedSizeBoundaryChunker.chunk(text, 512, 128)  // 分片
      → EmbeddingService.embedBatch(texts)               // 向量化
      → 批量写入 t_knowledge_chunk（MySQL）                // 存文本
      → VectorStoreService.batchUpsert()（Milvus）         // 存向量
    → 5. 更新 t_document 状态为 indexed
```

### 头像上传（MinIO → 本地兜底）

```
用户选择图片 → ProfileDialog 上传 → UserController(/api/v1/users/avatar)
  → UserServiceImpl.uploadAvatar()
    → 1. 校验文件类型(JPG/PNG/GIF/WebP)和大小(≤2MB)
    → 2. 优先上传到 MinIO avatar 桶（MinioService 负责桶创建+公开读策略）
    → 3. MinIO 不可用时落入本地 ./uploads/avatars/ 目录（WebMvcConfig 映射 /uploads/**）
    → 4. 调 AuthService.updateProfile() 更新用户 avatar 字段
  → 前端 refreshUser() 刷新，侧边栏和个人中心的头像即时更新
```

MinIO 的 `avatar` 桶在 `MinioService` 的 `@PostConstruct` 中自动创建并设置公开读策略，不需要手动操作。

### 对话搜索

```
用户输入关键词 → Sidebar 搜索框（300ms 防抖）
  → GET /api/v1/conversation/search/{keyWord}
  → ConversationServiceImpl.searchConversation()
    → 按 title LIKE 模糊匹配当前用户的会话
    → 按 last_time 倒序返回
  → 搜索结果覆盖原会话列表，按日期分组展示
```

### Conversation Memory

```
ConversationMemoryService (接口)
  └── DefaultConversationMemoryService（业务层：loadAndAppend + append）
      └── JdbcConversationMemoryStore（存储层：MyBatis-Plus JDBC 实现）
```
- 保留最近 20 轮对话（40 条消息），查询时按 create_time 倒序取最新 N 条再反转
- 用户首次发言自动创建会话
- 标题生成：新会话的第一条消息会异步调 LLM 生成标题（<=20 字），失败时 fallback 到截取前50字
- `normalizeHistory()` 自动去掉开头多余的 ASSISTANT 消息

### 查询改写（Query Rewrite）

```
DefaultQueryRewriteService:
  → 取最近 2-3 轮对话（最多 6 条消息）作为上下文
  → 填入 LLM prompt 模板，要求消解代词（它/这个/该文档等）
  → 调用 OpenAICompatibleClient.chat()（非流式，在 llmSyncExecutor 中）
  → 清理结果（去掉引号/括号等）
  → 失败时回退到原始问题
```

### Rerank 架构

```
RerankService（接口）
  └── DefaultRerankService（业务编排）
      ├── enabled=true  → HttpRerankClient.rerank() → 失败时降级到 NoopRerankClient
      └── enabled=false → 按 Milvus 原始 score 降序截取
```
- `rag.rerank.enabled`: 是否启用 Rerank
- `rag.rerank.candidate-top-k`: Milvus 多取候选数
- `rag.rerank.final-top-k`: 最终保留条数

### LLM 客户端
- **LlmClient** 接口定义 `streamChat()`
- **OpenAICompatibleClient**：兼容 OpenAI 格式（硅基流动/DeepSeek/通义），包含流式（`doChat`）和同步（`doSyncChat`）两种调用。当前 `ChatServiceImpl` 只注入了此实现
- **OllamaClient**：本地 Ollama `/api/chat` 接口，未在业务层串联
- **Embedding**：通过 OpenAI 兼容 API，默认模型 `BAAI/bge-large-zh-v1.5`

## API Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/admin/document/upload` | admin | 上传文档并索引 |
| GET | `/api/v1/admin/document/status/{docId}` | admin | 文档状态查询 |
| GET | `/api/v1/admin/documents` | admin | 文档列表（按创建时间倒序） |
| GET | `/api/v1/admin/document/{docId}` | admin | 文档详情（含 MinIO 预览 URL） |
| GET | `/api/v1/rag/chat?message=&sessionId=&Authorization=` | ✓ | SSE 流式对话（GET + EventSource） |
| GET | `/api/v1/conversation` | ✓ | 会话列表 |
| PUT | `/api/v1/conversation/{sessionId}` | ✓ | 重命名会话 |
| DELETE | `/api/v1/conversation/{sessionId}` | ✓ | 删除会话 |
| GET | `/api/v1/conversation/{sessionId}/messages` | ✓ | 会话消息列表 |
| GET | `/api/v1/conversation/search/{keyWord}` | ✓ | 按标题搜索对话 |
| POST | `/api/v1/auth/login` | ✗ | 登录 |
| POST | `/api/v1/auth/logout` | ✗ | 登出 |
| GET | `/api/v1/auth/me` | ✓ | 当前用户信息 |
| PUT | `/api/v1/auth/profile` | ✓ | 修改昵称/头像 |
| PUT | `/api/v1/auth/password` | ✓ | 修改密码（需旧密码） |
| PUT | `/api/v1/auth/admin/users/{id}` | admin | 管理员修改用户（无密码限制，可改状态） |
| PUT | `/api/v1/auth/admin/users/batch/status` | admin | 批量禁用/启用用户 |
| DELETE | `/api/v1/auth/admin/users/batch` | admin | 批量删除用户 |
| POST | `/api/v1/users/avatar` | ✓ | 上传头像（返回 URL） |
| PUT | `/api/v1/users/profile` | ✓ | 用户自更新（昵称/密码/头像，改密码需旧密码） |
| GET/POST/PUT/DELETE | `/api/v1/users/**` | admin | 用户管理 CRUD + 分页查询 |

## Frontend Architecture

```
fronted/ (React 19 + Vite 6 + Tailwind CSS 4 + react-router-dom 7 + lucide-react)
├── src/
│   ├── main.jsx                # 入口
│   ├── App.jsx                 # 路由配置 + MainLayout（全局状态管理中心）
│   ├── style.css               # Tailwind 4 @import + @theme 自定义设计令牌 + CSS 动画
│   ├── context/AuthContext.jsx # 登录状态管理（localStorage 持久化）+ refreshUser()
│   ├── utils/http.js           # fetch 封装（get/post/put/delete + upload + getSseUrl + query 参数支持）
│   ├── components/
│   │   ├── ChatArea.jsx        # 聊天主区域（消息列表 + 欢迎页切换 + 自动滚动）
│   │   ├── ChatInput.jsx       # 输入框（发送/停止）+ 文档上传快捷入口
│   │   ├── MessageBubble.jsx   # 消息气泡（ReactMarkdown + 代码高亮 + Katex + 深色模式）
│   │   ├── ConfirmDialog.jsx   # 通用弹窗（ESC 关闭、加载状态、自定义 children 内容区）
│   │   ├── ProfileDialog.jsx   # 个人中心弹窗（头像上传、昵称编辑、修改密码、切换账户）
│   │   ├── Sidebar.jsx         # 侧边栏（搜索框 + 会话分组列表 + 用户下拉菜单 + 删除/重命名）
│   │   ├── Navbar.jsx          # 顶栏（侧边栏切换 + 重命名按钮 + 控制台入口 + 主题切换）
│   │   └── WelcomeScreen.jsx   # 空状态欢迎页（建议问题列表）
│   └── pages/
│       ├── LoginPage.jsx       # 登录页
│       └── admin/
│           ├── AdminLayout.jsx # 管理后台布局（侧边导航 + 顶部面包屑导航栏 + 用户信息）
│           ├── AdminHome.jsx   # 控制台首页（占位）
│           ├── UploadDoc.jsx   # 文档管理页（左侧文件列表 + 右侧预览/上传双栏布局）
│           └── UserManage.jsx  # 用户管理（列表/搜索/编辑/删除/批量操作）
```

### 管理控制台布局
- `AdminLayout` 提供侧边导航 + 顶部面包屑导航栏：左侧展示页面访问历史（`首页 > 上传文件 > 用户管理`），右侧展示当前登录用户信息（昵称 + 头像）
- 面包屑通过 `visitedPages` 状态追踪，按点击顺序记录，点击历史项可回退截断
- 控制台页面标题独立于内容区，放在顶部导航栏下方（无 border），搜索/操作按钮在表格上方

### 前端关键设计
- **重命名弹窗**：`Sidebar` 和 `Navbar` 共用同一个 `ConfirmDialog`，状态提升到 `App.jsx` 的 `MainLayout` 中统一管理
- **个人中心弹窗**：`ProfileDialog` 在 `App.jsx` 中管理开关状态，通过 `Sidebar` 的用户下拉菜单触发。打开时自动调 `refreshUser()` 获取最新用户信息
- **Token 传递**：EventSource 不支持自定义请求头，token 通过 URL 参数传递（`http.getSseUrl()` → `Authorization=token`）
- **SSE 事件**：名命事件 `session`(会话ID) / `message`(逐块内容) / `done`(完成)
- **深色模式**：通过 `<html class="dark">` 切换，Tailwind `@custom-variant dark` 实现
- **HTTP 响应拦截**：自动解包 `Result<T>` 的 `.data`，401 时自动登出跳转
- **上传专用**：`http.upload()` 方法处理 FormData，不手动设置 Content-Type
- **CSS 动画**：自定义 `fade-in-up`（消息出现）、`dot-bounce`（打字指示器）
- **图标库**：所有图标来自 `lucide-react`，官网 [lucide.dev/icons](https://lucide.dev/icons)

## Database Entities（所有表含 @TableLogic 软删除）

- **`t_document`**: `doc_id`, `file_name`, `file_size`, `file_type`, `chunk_count`, `chunk_size`, `chunk_overlap`, `status`(uploading/chunking/embedding/storing/indexed/failed), `file_url`(MinIO路径), `error_message`
- **`t_knowledge_chunk`**: `chunk_id`(全局唯一对应 Milvus 主键), `doc_id`, `chunk_index`, `content`, `block_type`, `section_context`, `metadata`(JSON), 全文索引 `ft_content`
- **`t_chat_session`**: `session_id`, `title`, `user_id`, `last_time`
- **`t_chat_message`**: `session_id`, `role`(user/assistant), `content`, `thinking_content`, `thinking_duration`
- **`t_user`**: `user_id`(uuid), `username`(唯一), `password`, `role`(admin/user), `nickname`, `avatar`, `status`(0=正常/1=禁用), `last_login`

`MyMetaObjectHandler` 自动填充 `create_time`/`update_time`。所有 INSERT 使用 `IdUtil.fastSimpleUUID()` 或 `IdUtil.getSnowflakeNextIdStr()` 生成业务 ID。

## Key Design Decisions

### SseEmitterSender
包装 `SseEmitter`，CAS (`AtomicBoolean`) 保证 complete/fail 只执行一次。所有 SSE 操作必须通过它。发送名命事件（`session`/`message`/`done`）而非默认 data 事件。

### Milvus 集合自动初始化
- `MilvusCollectionInitializer`（@Component）：应用启动时自动检查并创建 `rag_knowledge` collection
- 字段：chunk_id(VarChar,PK), embedding(FloatVector,1024维), doc_id, block_type, content_preview(VarChar 1024)
- IVF_FLAT 索引，COSINE 度量
- `content_preview` 仅存前 256 字符，完整文本从 MySQL `t_knowledge_chunk.content` 获取
- `block_type` 字段始终填充非空字符串，避免 Milvus schema 校验失败

### MinIO 对象存储
- `MinioService`（`com.caobolun.business.user.service`）在 `@PostConstruct` 中初始化 MinIO 客户端并创建桶
- 两个桶均自动设置公开读策略（`s3:GetObject`），文件可通过 URL 直接访问：
  - `avatar` 桶：用户头像，`uploadAvatar(objectName, stream, size, contentType)`
  - `documents` 桶：文档原始文件，`uploadFile(objectName, stream, size)`
- `uploadAvatar()` 返回完整 URL（格式：`{endpoint}/avatar/{filename}`），MinIO 不可用时返回 null，调用方自动降级到本地文件系统
- 配置见 `application.yaml` 的 `minio.*` 项，敏感值在 `application-dev.yaml` 中覆盖
- 依赖：`io.minio:minio:8.5.17`

### 本地文件上传（MinIO 不可同时兜底）
- `UserServiceImpl.uploadAvatar()` 中 MinIO 返回 null 时自动落入本地
- 文件写入 `./uploads/avatars/` 目录，通过 `WebMvcConfig` 映射 `/uploads/**` 到本地文件系统
- `upload.local-path` 配置项控制存储根目录，默认 `./uploads`

### 分片策略
`FixedSizeBoundaryChunker`（Level 3：固定大小 + 边界感知）：
1. 文本归一化（URL 修复、换行修复）→ `TextNormalizer`
2. 按 chunkSize 定位目标切分点
3. 在 [target - overlap, target] 范围内寻找自然边界（优先级：换行符 > 中文句末标点 > 英文句末标点）
4. 相邻 chunk 保留 overlap 长度的重叠
5. 安全防护：防止回退过头导致死循环

### 错误码体系
- `Result<T>` 统一响应，`code=0` 表示成功
- 错误码分三类：`A000001` 用户端、`B000001` 系统执行、`C000001` 第三方服务
- `GlobalExceptionHandler` 拦截四大类：AbstractException（应用内）、NotLoginException（SSE 特殊处理+标准 JSON 双通道）、NotRoleException、Throwable（兜底）

### 异步上下文传递
- `UserContext` 基于 `TransmittableThreadLocal`（TTL），配合阿里 `TtlExecutors` 包装所有线程池
- `AsyncConfig` 中 `springAsyncExecutor` 通过 `TtlRunnable::get` 装饰器支持 `@Async` 注解
- `ThreadPoolExecutorConfig` 中 6 个线程池均用 `TtlExecutors.getTtlExecutor()` 包装，确保 `CompletableFuture` 链式调用也能传递上下文

### 前端 CSS 系统
- Tailwind 4 的 `@theme` 自定义设计令牌（Apple 风格设计语言）
- 自定义变体 `dark` 控制深色模式
- CSS 动画：`fade-in-up`（消息出现）、`dot-bounce`（打字指示器）
- ReactMarkdown 渲染支持：GFM、代码高亮（highlight.js）、数学公式（KaTeX）

### 配置分层
- `application.yaml`（可提交）：公共配置（profile, multipart 大小限制, minio 默认值, upload 路径）
- `application-dev.yaml`（gitignored）：数据源、Redis、API Key、模型、Milvus、Sa-Token、MinIO 敏感值
- Sa-Token token 持久化：依赖 `sa-token-redis-template` 接入 Lettuce Redis，配置 `spring.data.redis.*`

### Milvus 重建
如需重建集合：先删除（Attu/Python SDK），重启后 `MilvusCollectionInitializer` 自动创建。

## Conventions

- Lombok `@Data` `@Slf4j` `@RequiredArgsConstructor` 全项目通用
- DTO 响应对象放在 `dto/response/`，使用 `@Builder` 链式构建
- MyBatis-Plus：继承 `BaseMapper<T>`，`@TableLogic` 逻辑删除，`@TableField(fill=...)` 自动填充
- `spring-boot-starter-web` 在 framework/ai 模块 scope=provided，business 模块 scope=compile
- 跨模块扫描：`@SpringBootApplication(scanBasePackages = "com.caobolun")`
- Gson 仅用于 Milvus SDK 的数据序列化，Jackson（ObjectMapper）用于所有 LLM/Embedding/Rerank API 通信
- 业务 ID 生成：`IdUtil.fastSimpleUUID()`（URL 安全）和 `IdUtil.getSnowflakeNextIdStr()`（雪花算法）
- Controller 保持简洁，业务逻辑下沉到 Service 层（如 `UserController.uploadAvatar` 仅做文件非空校验后委托给 `UserService.uploadAvatar`）
- 头像上传优先使用 MinIO，失败时自动降级到本地文件存储

### 用户信息双重更新路径
系统有两条独立的用户信息更新链路，共用 `UserUpdateDTO`（含 nickname/password/oldPassword/status/avatar）：

| 路径 | 端点 | Service | 特点 |
|------|------|---------|------|
| **用户自更新** | `PUT /api/v1/users/profile` | `UserService.updateSelf()` | 需 `oldPassword` 校验，可改昵称/密码/头像，不可改状态 |
| **管理员更新** | `PUT /api/v1/auth/admin/users/{id}` | `AuthService.adminUpdateUser()` | 无需旧密码，管理员可改昵称/密码/状态 |
- 个人中心弹窗 (`ProfileDialog`) 调用户自更新接口，携带旧密码
- 控制台用户管理 (`UserManage`) 调管理员更新接口，不携带密码
- 管理员（admin 账号）在前端被保护：复选框禁用、编辑/删除按钮灰显、批量操作后端拦截
