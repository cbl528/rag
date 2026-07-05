const initialConversations = [
  {
    id: 'conv-1',
    title: '什么是 RAG 技术？',
    createdAt: '2026-07-05T10:30:00Z',
    messages: [
      { id: 'msg-1-1', role: 'user', content: '什么是 RAG？能给我详细解释一下吗？', timestamp: '2026-07-05T10:30:00Z' },
      {
        id: 'msg-1-2', role: 'assistant', timestamp: '2026-07-05T10:30:15Z',
        content: `**RAG**（Retrieval-Augmented Generation，检索增强生成）是一种将**信息检索**与**大语言模型生成**相结合的技术架构。

## 核心思路

传统的 LLM 只能基于训练数据回答，存在以下问题：
- 知识有截止日期，无法获取最新信息
- 容易产生"幻觉"（编造事实）
- 无法访问私有/专有知识库

RAG 通过以下流程解决这些问题：

1. **检索（Retrieval）** — 根据用户问题，从外部知识库中搜索相关文档
2. **增强（Augmented）** — 将检索到的文档作为上下文注入到 prompt 中
3. **生成（Generation）** — LLM 基于检索结果生成准确、有依据的回答

## 典型架构

\`\`\`
用户提问 → Embedding → 向量检索 → 相关文档 → LLM + Prompt → 回答
\`\`\`

这使得 AI 能够**引用真实数据源**，大幅提升回答的准确性和可信度。`,
      },
      { id: 'msg-1-3', role: 'user', content: '向量检索具体是怎么工作的？', timestamp: '2026-07-05T10:31:00Z' },
      {
        id: 'msg-1-4', role: 'assistant', timestamp: '2026-07-05T10:31:20Z',
        content: `向量检索是 RAG 的核心环节，它的工作原理可以归纳为以下步骤：

## 1. 文档向量化（Embedding）

首先将知识库中的所有文档通过 **Embedding 模型**（如 OpenAI 的 \`text-embedding-3\`）转换为高维向量：

\`\`\`javascript
// 示例：将文本转为向量
const embedding = await embedModel.embed("RAG 是检索增强生成技术")
// 返回: [0.023, -0.451, 0.892, ...] (通常是 1536 或 3072 维)
\`\`\`

## 2. 向量存储

将这些向量存入**向量数据库**（如 Pinecone、Milvus、Weaviate），并建立索引以支持快速相似度搜索。

## 3. 相似度检索

当用户提问时，将问题也转为向量，在向量空间中通过**余弦相似度**找到最相关的文档：

| 方法 | 计算方式 | 适用场景 |
|------|---------|---------|
| 余弦相似度 | \`cos(θ) = A·B/(|A||B|)\` | 语义相似度 |
| 欧氏距离 | \`d(A,B) = √Σ(Aᵢ-Bᵢ)²\` | 绝对距离 |
| 点积 | \`A·B\` | 归一化向量 |

这就是 RAG 能够"找到正确答案"的数学基础。`,
      },
    ],
  },
  {
    id: 'conv-2',
    title: 'Chunk 切分策略讨论',
    createdAt: '2026-07-04T14:20:00Z',
    messages: [
      { id: 'msg-2-1', role: 'user', content: '在做 RAG 的时候，文档分块（Chunking）有哪些策略？哪种效果最好？', timestamp: '2026-07-04T14:20:00Z' },
      {
        id: 'msg-2-2', role: 'assistant', timestamp: '2026-07-04T14:20:30Z',
        content: `文档分块（Chunking）是 RAG 系统的关键预处理步骤。以下是主流策略：

## 常用分块策略

### 1. 固定大小分块（Fixed-size）
最简单的方式，按固定 token 数切分：

\`\`\`python
# LangChain 示例
from langchain.text_splitter import RecursiveCharacterTextSplitter

splitter = RecursiveCharacterTextSplitter(
    chunk_size=512,      # 每个块 512 tokens
    chunk_overlap=50,    # 重叠 50 tokens
)
\`\`\`

### 2. 语义分块（Semantic Chunking）
基于段落、句子边界进行切分，保持语义完整性。

### 3. 层次分块（Hierarchical）
- **父块**：较大的上下文（如 2048 tokens）
- **子块**：较小的检索单元（如 256 tokens）
- 检索时用小块，返回时带父块上下文

## 建议

> 没有"银弹"，最佳策略取决于你的文档类型和业务场景。建议从 **RecursiveCharacterTextSplitter + 512 chunk_size** 开始，根据检索效果逐步调优。`,
      },
    ],
  },
  {
    id: 'conv-3',
    title: 'Embedding 模型选型',
    createdAt: '2026-07-03T09:15:00Z',
    messages: [
      { id: 'msg-3-1', role: 'user', content: '中文 RAG 场景下，Embedding 模型应该怎么选？', timestamp: '2026-07-03T09:15:00Z' },
      {
        id: 'msg-3-2', role: 'assistant', timestamp: '2026-07-03T09:15:40Z',
        content: `中文 RAG 场景的 Embedding 模型选型，需要考虑以下几个维度：

## 推荐模型对比

| 模型 | 维度 | 中文能力 | 特点 |
|------|------|---------|------|
| **BGE-M3** | 1024 | ⭐⭐⭐⭐⭐ | 多语言，支持稠密+稀疏检索 |
| **text2vec-large-chinese** | 1024 | ⭐⭐⭐⭐⭐ | 中文专优，CoSENT 训练 |
| **m3e-large** | 1024 | ⭐⭐⭐⭐ | 轻量高效，社区活跃 |
| **OpenAI text-embedding-3** | 3072 | ⭐⭐⭐⭐ | 效果最好但需 API 调用 |

## 选择建议

1. **本地部署** → \`BGE-M3\` 是当前中文 SOTA
2. **追求效果** → \`text-embedding-3-large\`
3. **轻量快速** → \`m3e-base\`

你的场景更偏重本地部署还是 API 调用？我可以给出更具体的建议。`,
      },
    ],
  },
]

const aiReplies = {
  default: '这是一个很好的问题！让我为你详细解答。\n\n在 RAG 系统中，这个问题的核心在于**数据流的正确编排**。你需要确保检索到的文档与用户查询高度相关，同时在 prompt 中给予 LLM 足够的上下文来生成准确的回答。\n\n> 关键提示：始终验证检索结果的相关性分数，设定合理的阈值来过滤噪声文档。',
  rag: '关于 RAG 架构，有几个关键点需要注意：\n\n1. **检索质量**决定了最终回答的上限\n2. **Prompt 设计**决定了 LLM 如何使用检索到的信息\n3. **反馈闭环**——收集用户反馈持续优化检索策略\n\n需要我深入讲解其中某一个方面吗？',
  chunk: 'Chunk 大小的选择是一个经典的**精度与召回率的权衡**：\n\n- **小块（128-256 tokens）**：检索更精确，但可能丢失上下文\n- **大块（512-1024 tokens）**：上下文更完整，但检索信噪比下降\n\n建议根据你的文档类型做 A/B 测试，找到最佳平衡点。',
  hello: '你好！我是 RAG Studio 的智能助手。\n\n我可以帮你：\n- 🔍 搜索和分析知识库中的文档\n- 💡 回答关于 RAG 技术的问题\n- 📊 分析数据并提供洞察\n\n有什么我可以帮你的吗？',
}

export function getSimulatedReply(userMessage) {
  const msg = userMessage.toLowerCase()
  if (msg.includes('你好') || msg.includes('hello') || msg.includes('hi')) return aiReplies.hello
  if (msg.includes('rag') || msg.includes('检索增强')) return aiReplies.rag
  if (msg.includes('chunk') || msg.includes('分块') || msg.includes('切分')) return aiReplies.chunk
  return aiReplies.default
}

export function formatTime(isoString) {
  const now = new Date()
  const date = new Date(isoString)
  const diffMs = now - date
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return '刚刚'
  if (diffMin < 60) return `${diffMin} 分钟前`
  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour} 小时前`
  const diffDay = Math.floor(diffHour / 24)
  if (diffDay < 7) return `${diffDay} 天前`
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

export { initialConversations }
