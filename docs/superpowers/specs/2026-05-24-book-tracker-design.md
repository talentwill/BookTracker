# BookTracker — 图书章节追踪系统设计文档

## 项目概述

一个帮助用户追踪书籍阅读进度的 Web 应用。用户导入书籍目录（Markdown outline 格式），对任意层级章节打勾标记已读，支持多轮阅读和 GTD 排期。

**设计语言：** Notion 风格 — 温暖中性色、极简边框（`1px solid rgba(0,0,0,0.1)`）、多层低透明度阴影、Notion Blue (`#0075de`) 作为唯一强调色。

**已有参考：** 用户在 Notion 中已搭建类似系统，包含书籍数据库和章节数据库，通过 Relation 关联，Button 驱动操作。本应用旨在还原并优化该体验。

## 技术栈

- **框架：** Next.js App Router + TypeScript
- **UI：** shadcn/ui + Tailwind CSS（定制 Notion 风格）
- **状态：** Zustand + persist 中间件（localStorage）
- **部署：** Cloudflare Pages（前端），后续接入 Supabase（后端）

## 数据模型

### Author（作者）

```typescript
interface Author {
  id: string          // uuid
  name: string
  note?: string       // 备注（可选）
  createdAt: number
}
```

- 添加书籍时输入作者名，系统自动匹配已有作者或创建新作者
- 作者名可编辑，修改后关联书籍同步更新

### Book（书籍）

```typescript
interface Book {
  id: string          // uuid
  title: string
  authorId: string    // 关联 Author
  tocText: string     // 原始 markdown outline 文本
  createdAt: number
}
```

- 目录只读，不可编辑；需要修改时重新导入覆盖
- `tocText` 保留原文，方便重新解析或导出

### TocItem（目录项）

```typescript
interface TocItem {
  id: string
  bookId: string
  parentId: string | null
  title: string
  order: number       // 同层级排序（整数）
}
```

- 扁平数组 + parentId 构建树，支持任意深度
- 参照 Workflowy/幕布/Tana 的通用 outliner 存储模式
- 层级从 parentId 链推导，不冗余存储 level 字段
- 解析 markdown outline 时按缩进层级自动生成

### ReadingRound（阅读轮次）

```typescript
interface ReadingRound {
  id: string
  bookId: string
  roundNumber: number
  startedAt: number
  status: 'active' | 'completed'
}
```

- 每本书可读多次，每轮独立的阅读进度
- 新增轮次时用户可选择"继承排期"或"清空重来"
- 旧轮次数据完整保留

### ChapterStatus（章节状态）

```typescript
interface ChapterStatus {
  tocItemId: string
  roundId: string
  checked: boolean
  checkedAt: number | null       // 完成时间戳
  scheduledDate: string | null   // 计划阅读日期 YYYY-MM-DD
}
```

- 每个轮次的每个章节一条记录
- `status` 不存储，由 `scheduledDate` 和当前日期动态计算：`unscheduled | today | tomorrow | scheduled | done`

### 数据关系

```
Author 1──N Book 1──N TocItem
                  1──N ReadingRound 1──N ChapterStatus
                                         ↑ 关联 TocItem
```

## 页面结构

共 5 个页面 + 2 个弹窗。

### 导航

顶栏包含：Logo + 三个 Tab（首页/书架/作者）+ 添加书籍按钮。Tab 使用 pill 样式切换器（`background:#f6f5f4` 容器，选中态 `background:#0075de;color:#fff`）。

### 页面 1：首页（Dashboard）

用户打开网站看到的第一个页面。

**区块：**

1. **问候 + 日期** — "早上好" + 当前日期
2. **4 个统计卡片**（flex 行）：
   - 今日待读（蓝色背景 `#f2f9ff`）
   - 今日已完成（绿色背景 `#e6f9ee`）
   - 在读书籍数（灰色背景 `#f6f5f4`）
   - 连续阅读天数（灰色背景 `#f6f5f4`）
3. **今日阅读清单** — 从所有书的当前轮次排期中聚合 `scheduledDate === 今天` 的章节，按书籍分组展示。已完成章节灰显+删除线，待读章节可直接点击"打勾"按钮标记完成
4. **最近在读** — 横向滚动的书籍小卡片

### 页面 2：书架

**筛选/排序栏：**
- 状态筛选 pills：全部(n) / 在读(n) / 已完成(n) / 今天有排期(n)
- 排序下拉：最近阅读 / 添加时间 / 进度 / 书名

**卡片网格：** `grid-template-columns: repeat(auto-fill, minmax(210px, 1fr))`

每张卡片包含：
- 封面区域：渐变色背景 + emoji 图标 + 右上角轮次 badge（pill 形状）
- 书名（font-weight 700, 15px）
- 作者名（蓝色 `#0075de`，可点击跳转作者详情页）
- 进度条（在读：蓝色，已完成：绿色 `#1aae39`）
- 底部信息：章节进度 + 排期提示
- 已完成书籍额外显示 ✓ 已完成 badge

末尾有一个虚线边框的"添加书籍"占位卡片。

### 页面 3：作者列表

每位作者一张横向卡片（非网格），包含：
- 左侧：圆形头像占位（显示姓氏首字）
- 中间：作者名 + 阅读统计（共 n 本书 · n 本完成 · n 本在读）+ 状态 badge
- 右侧：小封面缩略图（该书最近 3 本） + 箭头

### 页面 4：作者详情页

点击作者名进入。

**顶部：** 作者头像 + 姓名 + 统计（共 n 本书 · n 本已读完 · 总计阅读 n 个章节）+ 编辑按钮

**内容区：** 该作者所有书籍的卡片网格（同书架卡片样式，但额外显示阅读状态 badge）

### 页面 5：书籍详情页

点击书籍卡片进入。这是核心交互页面。

**顶部书籍信息：**
- 左侧：封面 + 书名（22px, weight 700）+ 作者 + 进度条
- 右侧：轮次选择器（pill badge `第 N 轮 ▾`，点击弹出轮次列表）+ "开启新一轮"按钮

**双 Tab 切换：**

#### Tab 1：大纲视图

缩进式树形结构，渲染解析后的 TocItem 树。

- 每行：状态图标 + 标题 + 打勾按钮
- 已完成：绿色圆点 `●` + 删除线 + 灰色 + 完成日期
- 未读：空心圆 `○` + 正常色 + "打勾"按钮
- 缩进用 `padding-left` 实现，每层级 +20px
- hover 行时背景微变

#### Tab 2：表格视图

GTD 排期管理，表格布局。

**顶部筛选 pills：** 全部 / 今天 / 明天 / 未排期 / 已完成

**表格列：**
- 复选状态图标（✓ 或 ○）
- 章节名称（子项额外缩进）
- 状态 badge（pill 形状）：未排期（灰色）/ 今天（蓝色）/ 明天（橙色 `#dd5b00`）/ 已完成（绿色）
- 计划日期
- 操作按钮

**操作按钮根据状态变化：**
- 未排期章节：`今天读` / `明天读` / `读完` 三个按钮
- 已排期章节：`读完`（蓝色主按钮）+ `改期` 按钮
- 已完成章节：灰色显示完成时间，无操作按钮

### 弹窗 1：添加书籍

模态弹窗，包含：
- 书名（必填输入框）
- 作者（输入框，支持从已有作者中自动补全或输入新作者名自动创建）
- 目录（必填 textarea，等宽字体，提示 Logseq 风格 markdown 格式）
- 取消 + 导入书籍 按钮

导入时解析 markdown 缩进列表，生成 TocItem 扁平数组 + 创建第一个 ReadingRound。

### 弹窗 2：开启新一轮

模态弹窗，包含：
- 标题："开始第 N 轮阅读"
- 提示："是否继承第 N-1 轮的排期计划？"
- 两个选项卡片（单选）：
  - **继承排期** — 保留上一轮的计划日期，在此基础上调整
  - **清空重来** — 所有章节重置为未排期，重新规划
- 取消 + 开始新一轮 按钮

确认后创建新 ReadingRound，为所有 TocItem 生成新的 ChapterStatus（根据选择决定是否复制 scheduledDate）。

## Markdown Outline 解析规则

输入格式示例（Logseq 风格）：

```markdown
- 第一章 计算机系统漫游
  - 1.1 信息就是位+上下文
  - 1.2 程序被其他程序翻译成不同的格式
- 第二章 信息的表示和处理
  - 2.1 信息存储
  - 2.2 整数表示
    - 2.2.1 整数数据类型
    - 2.2.2 无符号数的编码
```

**解析规则：**
- 每行以 `- ` 开头为列表项
- 缩进用 2 个空格表示一级层级
- 空行忽略
- 支持 Tab 缩进（1 Tab = 2 空格）
- 父子关系通过缩进差确定：比上一行多缩进一级 = 子节点，同级或更少 = 最近的对应层级节点为兄弟或叔伯

**解析算法：** 维护一个栈 `indentStack`，栈中保存 `[level, tocItemId]`。遇到新行时：
1. 计算 indent level
2. pop 栈直到栈顶 level < 当前行 level
3. 栈顶元素即为 parent，如栈空则 parent = null
4. push 当前行到栈

## 用户流程

### 首次使用

1. 点击"添加书籍"
2. 输入书名、作者（自动补全或新建）、粘贴目录
3. 点击"导入书籍"
4. 自动跳转到书籍详情页，大纲视图展示目录树
5. 打勾标记已读章节

### 日常使用

1. 打开首页，查看今日阅读清单
2. 在清单中直接打勾，或点击书籍进入详情页
3. 在表格视图中安排未排期章节的阅读日期（今天读/明天读）

### 重新阅读

1. 进入书籍详情页
2. 点击"开启新一轮"
3. 选择"继承排期"或"清空重来"
4. 所有章节重置，开始新一轮阅读

### 查看作者

1. 书架中点击作者名 → 作者详情页
2. 或导航栏点击"作者" → 作者列表 → 点击作者

## 存储设计

所有数据存储在 localStorage，通过 Zustand persist 中间件自动序列化。

**Store 结构：**

```typescript
interface BookStore {
  authors: Author[]
  books: Book[]
  tocItems: TocItem[]
  rounds: ReadingRound[]
  chapterStatuses: ChapterStatus[]

  // Actions
  addBook: (title: string, authorName: string, tocText: string) => void
  deleteBook: (bookId: string) => void
  toggleChapter: (tocItemId: string, roundId: string) => void
  scheduleChapter: (tocItemId: string, roundId: string, date: string) => void
  startNewRound: (bookId: string, inheritSchedule: boolean) => void
  updateAuthor: (authorId: string, name: string) => void
  deleteAuthor: (authorId: string) => void
}
```

**后续 Supabase 迁移：** 将 Zustand store 的 actions 替换为 Supabase API 调用，数据表结构与上述 interface 一一对应，无需重构数据模型。

## MVP (Phase 1) 范围

**包含：**
- 添加书籍（手动输入 + markdown outline 导入）
- 书架首页（卡片网格 + 筛选排序）
- 书籍详情页（大纲打勾 + 表格排期）
- 多轮阅读（开启新一轮 + 继承/清空选择）
- 作者管理（作者列表 + 详情页 + 编辑）
- Dashboard 首页（统计 + 今日阅读清单）
- 本地存储（localStorage）

**不包含（后续 Phase）：**
- 豆瓣书籍信息自动抓取
- 阅读日历热力图
- 轮次 Diff 对比
- 逾期顺延逻辑
- 浏览器推送提醒
- Obsidian/Notion 同步
- AI 目录解析
- 多端加密同步
- 公开阅读主页
