# 资源管理器功能包

这个目录包含资源管理器页的前端实现：只读的项目文件树浏览 + 点文件请求预览。参照 Orca（[stablyai/orca](https://github.com/stablyai/orca)）的 `FileExplorer` 系列组件实现，视觉风格对齐本项目的 [源代码管理](../source-control/README.md) 模块。

后端命令位于 `src-tauri/src/explorer/`，前后端通过本目录的 `api.ts` 连接。目录列举会用 `git2` 的 gitignore 规则过滤（非 git 目录则不过滤，只跳过字面量 `.git`）。

## 功能范围

只读浏览 + 预览，不支持新建/重命名/删除/拖拽等文件操作。

## 迁移到另一个 Tauri + React 项目

复制以下两个目录：

- `src/features/explorer/`
- `src-tauri/src/explorer/`

然后在目标项目的 `src-tauri/src/main.rs` 中注册 `explorer::fs` 的状态和命令；前端将 `Explorer` 放入目标页面，点文件时用 `onOpenFile(path)` 回调把路径交给宿主，宿主渲染 `FileTab`（本包导出，和 source-control 的 `DiffTab` 是同一种协作方式）。

## 保留为宿主依赖的通用能力

这些能力已在功能包内提供；迁移时只需按目标项目替换语言适配：

- `icons.tsx`：资源管理器使用的本地图标
- `i18n.ts`：中英文文案；宿主切换语言后派发 `app-language-change` 事件即可同步
- `theme.css`：明暗主题变量

入口为 `index.ts`，对外导出 `Explorer`、`FileTab` 组件和 `OpenFileRequest` 类型。
