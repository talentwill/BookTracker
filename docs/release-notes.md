# Release Notes

## 2026-05-28

### 添加书籍页面重构

将「添加书籍」从对话框改为独立页面 `/books/add`，提供更丰富的表单体验。

**新增功能：**
- 封面图片：从豆瓣自动获取封面（引用 URL），支持手动上传（Canvas 压缩至 400px / JPEG 0.7）
- 扩展元数据：新增出版社、出版日期、ISBN 字段
- 目录自动解析：豆瓣页面抓取目录文本后自动调用 AI 整理，展示树形预览
- 目录可选：无目录时可跳过，稍后在编辑页添加

**改动文件：**
- `src/app/books/add/page.tsx` — 新增
- `src/components/add-book-dialog.tsx` — 删除
- `src/components/navbar.tsx` — 改为页面跳转
- `src/lib/types.ts` — Book 新增 `coverUrl` 字段
- `src/lib/store.ts` — `addBook` 支持 `coverUrl`
- `src/app/api/douban/route.ts` — 返回 `coverUrl` 和 `tocText`

**已知限制：**
- 豆瓣封面使用 URL 引用，可能因防盗链加载失败（回退为默认图标）
- `coverUrl` 已存储但尚未在书架卡片和详情页展示
