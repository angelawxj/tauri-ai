# 源代码管理功能包

这个目录包含源代码管理页的前端实现：工作区状态、暂存、提交、推送、分支切换、提交历史图、已提交更改和 Diff 面板。

后端 Git 命令位于 `src-tauri/src/source_control/`，前后端通过本目录的 `api.ts` 连接。

## 迁移到另一个 Tauri + React 项目

复制以下两个目录：

- `src/features/source-control/`
- `src-tauri/src/source_control/`

然后在目标项目的 `src-tauri/src/main.rs` 中注册 `source_control::git` 的状态和命令；前端将 `SourceControl` 放入目标页面，并传入打开 Diff 的回调。

## 保留为宿主依赖的通用能力

这些能力已在功能包内提供；迁移时只需按目标项目替换语言适配：

- `icons.tsx`：源码管理使用的本地图标
- `i18n.ts`：源码管理中英文文案；宿主切换语言后派发 `app-language-change` 事件即可同步
- `theme.css`：明暗主题变量
- 宿主页面提供的 `onOpenDiff` 回调

入口为 `index.ts`，对外导出 `SourceControl`、`DiffTab` 和 `OpenDiffRequest`。
