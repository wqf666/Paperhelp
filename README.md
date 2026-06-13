# 科研论文写作全流程 Agent

面向研究生、科研人员和课题组的 AI 论文写作工作台。基于用户论文知识库，提供论文分析、创新方向发现、实验计划生成、论文大纲辅助和智能写作控制台。

> **合规声明**：本工具仅作为写作和研究辅助，AI 不能作为论文作者。所有生成内容必须人工审核。实验结果不可编造，参考文献不可伪造。

## 技术架构

```
Frontend (Next.js 14 + TypeScript + Tailwind CSS)
        │  REST API (JSON)
        ▼
Backend (Python FastAPI)
   ├── Routers (API)
   ├── Services (业务逻辑)
   ├── LLM Provider (DeepSeek / Mock)
   ├── Models (SQLAlchemy ORM)
   └── Compliance (合规检查)
        │
        ▼
   MySQL / MariaDB
```

```
Desktop App (Tauri v2)
├── WebView (Next.js 静态导出)
├── Rust 后端 (Sidecar 管理 + 系统托盘)
└── FastAPI Sidecar (PyInstaller 打包)
    ├── SQLite (本地数据库)
    ├── MockLLM / DeepSeekLLM
    └── 本地文件系统
```

## 快速开始

### 前置条件

- Python 3.11+
- Node.js 18+
- MySQL 5.7+ 或 MariaDB 10.3+

### 1. 数据库准备

创建数据库：

```sql
CREATE DATABASE research_agent CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. 后端启动

```bash
cd backend

# 创建虚拟环境
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 安装依赖
pip install -r requirements.txt

# 配置环境变量
cp .env.example .env
# 编辑 .env，修改 DATABASE_URL 为你的 MySQL 连接信息

# 初始化数据库（首次运行）
# 如果使用 Alembic 迁移:
alembic revision --autogenerate -m "initial"
alembic upgrade head

# 启动服务
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

后端 API 文档访问：http://localhost:8000/docs

### 3. 前端启动

```bash
cd frontend

# 安装依赖
npm install

# 配置环境变量（可选，默认 http://localhost:8000）
cp .env.local.example .env.local

# 启动开发服务器
npm run dev
```

前端访问：http://localhost:3000

### 4. 使用 Mock LLM（无需 API Key）

后端 `.env` 中设置 `MOCK_LLM=true`（默认），系统会返回结构化模拟数据，方便开发调试。

### 5. 接入 DeepSeek（可选）

后端 `.env` 中设置：
```
MOCK_LLM=false
LLM_API_KEY=your-deepseek-api-key
LLM_BASE_URL=https://api.deepseek.com/v1
LLM_MODEL=deepseek-chat
```

### 桌面版构建

#### 前置条件

- Rust 1.70+
- Node.js 18+
- Python 3.11+

#### 一键构建

```bash
build-scripts\build_all.bat
```

该脚本依次构建 FastAPI Sidecar 和 Tauri App，最终生成安装包。

#### 分步构建

如需单独构建某个组件：

```bash
# 1. 构建 FastAPI Sidecar (PyInstaller 打包)
build-scripts\build_sidecar.bat

# 2. 构建 Tauri App (依赖 Sidecar 产物)
build-scripts\build_app.bat
```

#### 安装包位置

构建完成后，NSIS 安装包位于：

```
desktop/src-tauri/target/release/bundle/nsis/
```

## 功能模块

### MVP 1 — 核心骨架

| 模块 | 说明 |
|------|------|
| 项目管理 | 创建和管理研究项目 |
| 论文库 | 添加论文记录，触发 AI 分析 |
| 论文卡片 | 自动提取创新点、局限、方法、数据集、指标 |
| 创新方向 | 基于论文知识库生成研究方向建议 |
| 实验计划 | 为创新方向生成可执行实验方案 |
| 论文大纲 | 生成论文结构和摘要草稿 |
| 合规检查 | 自动检测 AI 作者声明和虚假数据 |

### MVP 2 — 深度分析能力

| 模块 | 说明 |
|------|------|
| PDF 解析 | 使用 PyMuPDF 解析 PDF 为结构化内容块 (PaperChunk) |
| 证据追溯 | EvidenceSpan 将 LLM 分析结论链接到论文原文位置 |
| 方法版本管理 | 创建、更新、归档方法版本，支持版本树结构 |
| 实验结果上传 | 支持 CSV/XLSX/JSON 格式上传实验数据 |
| 实验结果分析 | LLM 自动分析实验数据，生成关键发现与对比表 |
| 审稿人模拟 | 模拟 3 位不同专长审稿人的评审意见 |
| 创新性检查 | 检测创新方向与现有文献的差异化程度 |
| 稿件章节编辑 | ManuscriptSection 结构化章节内容管理 |
| 合规扩展 | 实验结果无数据检测、数据值匹配校验 |

### MVP 3 — 文档导出与引用管理

| 模块 | 说明 |
|------|------|
| 引用管理 | BibTeX 导入/导出，手动添加、搜索、编辑引用 |
| Word DOCX 导出 | 基于模板生成学术论文 Word 文档，含引用编号替换 |
| LaTeX 导出 | 生成 LaTeX 项目包 (main.tex + references.bib + ai_disclosure.tex) |
| Word 转 LaTeX | 上传 Word 文件自动转换为 LaTeX 源码 |
| 模板管理 | 内置 4 套模板 (Generic DOCX/LaTeX, ACL, IEEE)，支持自定义上传 |
| Cover Letter | LLM 生成投稿附信 DOCX |
| Response Letter | 基于审稿模拟生成逐条回复信 DOCX |
| AI 声明生成 | 三种级别 (minimal/standard/detailed) AI 使用声明 |
| 引用完整性检查 | 导出前检测未解析的引用键 |
| 章节内容生成 | LLM 基于项目上下文为指定章节生成草稿内容 |

### MVP 4 — 写作控制台与交互优化

| 模块 | 说明 |
|------|------|
| 论文写作控制台 | 全新大纲页面设计，进度概览、完成率百分比、状态统计一目了然 |
| 章节状态追踪 | 五级状态管理 (待处理/已生成/需修改/已确认/缺引用)，彩色徽章标识 |
| 生成设置面板 | 三维生成参数 (篇幅/风格/依据) + 自定义补充指令 |
| 方法版本完善 | 新增删除确认、激活/归档切换、版本编辑功能 |
| 审稿模拟前置检查 | 生成审稿意见前要求已上传论文或完成大纲，可视化检查清单 |
| AI 内容润色对话 | RefinementChat 交互式对话组件，支持多轮对话调整 AI 生成内容 |
| 章节操作面板 | 生成正文、标记完成、标记需修改、标记缺引用等操作 |
| 大纲可视化 | 可展开/折叠的章节卡片，含描述预览、字数统计、要点计数 |
| 数据删除功能 | 方法版本、创新方向、实验结果的完整删除确认流程 |

## API 端点

### MVP 1 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /projects/ | 创建项目 |
| GET | /projects/ | 项目列表 |
| GET | /projects/{id} | 项目详情 |
| POST | /projects/{id}/papers | 添加论文 |
| GET | /projects/{id}/papers | 论文列表 |
| POST | /papers/{id}/analyze | 分析论文 |
| GET | /papers/{id}/card | 获取论文卡片 |
| POST | /projects/{id}/ideas/generate | 生成创新方向 |
| GET | /projects/{id}/ideas | 创新方向列表 |
| POST | /ideas/{id}/experiment-plan/generate | 生成实验计划 |
| GET | /ideas/{id}/experiment-plan | 获取实验计划 |
| POST | /projects/{id}/manuscript/outline/generate | 生成论文大纲 |
| GET | /projects/{id}/manuscript | 获取论文状态 |

### MVP 2 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /projects/{id}/papers/upload | 上传 PDF 文件 |
| GET | /papers/{id}/chunks | 获取论文内容块 |
| POST | /papers/{id}/reparse | 重新解析 PDF |
| GET | /papers/{id}/evidence-spans | 获取证据追溯 |
| POST | /projects/{id}/method-versions | 创建方法版本 |
| GET | /projects/{id}/method-versions | 方法版本列表 |
| GET | /projects/{id}/method-versions/{vid} | 方法版本详情 |
| PUT | /projects/{id}/method-versions/{vid} | 更新方法版本 |
| POST | /projects/{id}/method-versions/{vid}/archive | 归档方法版本 |
| POST | /projects/{id}/method-versions/{vid}/activate | 激活方法版本 |
| DELETE | /projects/{id}/method-versions/{vid} | 删除方法版本 |
| POST | /projects/{id}/experiment-results/upload | 上传实验结果 |
| GET | /projects/{id}/experiment-results | 实验结果列表 |
| GET | /experiment-results/{id} | 实验结果详情 |
| POST | /experiment-results/{id}/analyze | 分析实验结果 |
| GET | /experiment-results/{id}/analysis | 获取分析结果 |
| DELETE | /experiment-results/{id} | 删除实验结果 |
| POST | /projects/{id}/reviewer-simulation/generate | 生成审稿人模拟 |
| GET | /projects/{id}/reviewer-simulations | 审稿人模拟列表 |
| POST | /ideas/{id}/differentiation-check | 创新性差异检查 |
| DELETE | /ideas/{id} | 删除创新方向 |
| GET | /projects/{id}/manuscript/sections | 获取稿件章节 |
| PUT | /manuscript-sections/{id} | 更新稿件章节 |

### MVP 3 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /projects/{id}/citations/import-bibtex | 导入 BibTeX 文件 |
| POST | /projects/{id}/citations | 手动创建引用 |
| GET | /projects/{id}/citations | 引用列表 (支持 ?search=) |
| GET | /citations/{id} | 引用详情 |
| PUT | /citations/{id} | 更新引用 |
| DELETE | /citations/{id} | 删除引用 |
| GET | /projects/{id}/citations/export-bibtex | 导出 BibTeX |
| GET | /templates | 模板列表 (支持 ?template_type=) |
| POST | /templates | 上传自定义模板 |
| GET | /templates/{id} | 模板详情 |
| DELETE | /templates/{id} | 删除自定义模板 |
| POST | /projects/{id}/export/docx | 导出 Word DOCX |
| POST | /projects/{id}/export/latex | 导出 LaTeX 项目包 |
| POST | /projects/{id}/export/bibtex | 导出引用 BibTeX 文件 |
| POST | /projects/{id}/export/cover-letter | 生成投稿附信 |
| POST | /projects/{id}/export/response-letter | 生成回复信 |
| GET | /exports/{id} | 导出记录详情 |
| POST | /convert/word-to-latex | Word 转 LaTeX |
| POST | /projects/{id}/manuscript/sections/{sid}/generate-content | LLM 生成章节内容 |
| POST | /projects/{id}/manuscript/sections | 创建新章节 |
| DELETE | /manuscript-sections/{id} | 删除章节 |
| PUT | /projects/{id}/manuscript/sections/reorder | 章节排序 |

### MVP 4 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /refine | AI 内容润色（多轮对话式） |

### Desktop 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /settings | 获取当前设置（API Key 脱敏显示） |
| PUT | /settings | 更新设置（API Key、模型模式等） |
| POST | /settings/reload | 重新加载配置 |
| POST | /shutdown | 优雅关闭（桌面模式） |
| POST | /backup/projects/{id}/export | 导出项目备份 (.papb) |
| POST | /backup/import | 导入项目备份 |
| GET | /backup/projects/{id}/info | 项目备份信息 |

## 运行测试

```bash
cd backend
pytest tests/ -v  # 155 个测试 (含桌面版 18 个)
```

## 项目结构

```
research-agent/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI 入口
│   │   ├── config.py            # 配置管理
│   │   ├── database.py          # 数据库连接
│   │   ├── models/              # SQLAlchemy 模型 (18 张表)
│   │   ├── schemas/             # Pydantic 数据验证
│   │   ├── routers/             # API 路由 (16 个 router)
│   │   ├── services/            # 业务逻辑 (16 个 service)
│   │   ├── parsers/             # 文档解析 (PyMuPDF + BibTeX + 实验结果)
│   │   ├── export/              # 导出验证 (PreExportValidator)
│   │   ├── templates/latex/     # LaTeX Jinja2 模板 (4 套)
│   │   ├── storage/             # 文件存储 (LocalStorage)
│   │   └── compliance/          # 合规检查 (7 类检测 + AI 声明生成)
│   ├── tests/                   # 后端测试 (155 个测试)
│   ├── alembic/                 # 数据库迁移
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/                 # Next.js 页面 (12 个路由)
│   │   ├── components/          # React 组件 (13 个组件)
│   │   └── lib/                 # 工具函数和类型 (19 个接口)
│   └── package.json
├── desktop/                     # Tauri 桌面 App
│   └── src-tauri/
│       ├── src/                 # Rust 代码 (sidecar 管理、托盘、commands)
│       ├── tauri.conf.json
│       ├── Cargo.toml
│       ├── capabilities/
│       ├── binaries/            # Sidecar 可执行文件
│       └── icons/
├── build-scripts/               # 构建脚本
│   ├── build_all.bat
│   ├── build_sidecar.bat
│   └── build_app.bat
└── README.md
```

## 开发路线

- **MVP 1**（已完成）：核心骨架 + Mock LLM + 完整前后端
- **MVP 2**（已完成）：PDF 解析 + 证据追溯 + 方法版本 + 实验结果分析 + 审稿模拟 + 创新性检查
- **MVP 3**（已完成）：引用管理 + Word/LaTeX 导出 + 模板系统 + Cover Letter + Response Letter + AI 声明
- **Desktop**（已完成）：Tauri v2 桌面 App + SQLite + 本地设置 + 项目备份
- **MVP 4**（已完成）：论文写作控制台 + 章节状态追踪 + AI 润色对话 + 方法版本完善 + 审稿前置检查
- **未来计划**：Research Skills + 健康仪表盘 + 导师协作反馈

## 合规规则

1. 不允许编造实验结果 — 无用户数据时只生成实验计划模板
2. 不允许编造参考文献 — 所有引用必须可追溯
3. AI 生成内容必须标注 — "此内容由 AI 辅助生成，请人工审核"
4. AI 不能作为论文作者 — 系统会检测并警告
5. 证据和数据来源必须可追溯 — PaperCard 保留 evidence_spans
6. 导出前完整性校验 — 检查标题、摘要、章节内容、引用键是否齐全
7. AI 使用声明自动嵌入 — 所有导出文档自动包含 AI Usage Disclosure

## 桌面版使用

### 安装

下载 `.exe` 安装包，双击安装。无需安装 Python、Node.js 或 MySQL。

### 首次启动

1. 打开 App，默认为 Mock 模式（离线演示）
2. 点击右上角设置图标进入设置页
3. 输入 DeepSeek API Key，关闭 Mock 模式
4. 返回创建项目，开始使用

### 数据位置

- Windows: `%APPDATA%\Paperhelp\`
- macOS: `~/Library/Application Support/Paperhelp/`
- Linux: `~/.local/share/paperhelp/`

### 备份与恢复

在项目详情页使用"备份管理"功能，可导出/导入 `.papb` 格式的完整项目备份。

## License

MIT
