# Git 管理模块

右侧面板的「Git 管理」Tab，是这个项目里最早做的 Git 面板，风格上模仿 VSCode 自带的源代码管理（SCM）面板。功能比后来的 [Source Control](./source-control.md) 简单，**没有** diff 查看、分支切换、Push——只有最基础的暂存/提交/历史查看。

## 功能

- 显示当前分支名。
- 「暂存的更改」「更改」两个分组，分别对应 git 的 staged / unstaged 文件。
- 每个文件行 hover 时出现操作按钮：unstaged 文件可以「暂存」或「丢弃更改」，staged 文件可以「取消暂存」。
- 分组标题 hover 时出现「全部」版本的同名批量操作按钮。
- 提交框：输入提交信息 + 点「提交」按钮（没有快捷键、没有 AI 生成消息，纯手动）。
- 提交历史：VSCode Graph 风格的分支线图（多颜色 lane，合并提交会画出汇入线），点一条提交可以展开看它改了哪些文件。

## 目录结构

```
src/components/git/
  index.ts            # 桶文件，export { GitPanel }
  GitPanel.tsx         # 根组件：header(分支名+刷新) + 提交框 + 变更分组 + 历史
  ChangesSection.tsx    # 暂存的更改 / 更改 分组，带批量操作
  FileRow.tsx             # 单文件行（暂存/取消暂存/丢弃按钮）
  CommitBox.tsx            # 提交信息输入框 + 提交按钮
  HistorySection.tsx        # 提交历史列表容器（可折叠）
  CommitRow.tsx               # 单条提交：分支线图形 + 摘要 + 作者/时间 + 展开查看改动文件
  CommitGraph.tsx              # 分支线 SVG 渲染
  commit-graph.ts               # lane 分配算法：把提交列表变成"每行在哪条 lane、颜色是什么、往下连去哪"
  api.ts                         # Tauri invoke() 的薄封装
  types.ts                        # FileEntry / GitStatus / CommitInfo 类型
  useGitStatus.ts                  # 拉取/刷新 git status 的 hook
```

这些文件原本分散在项目级共享目录（`src/lib/git-api.ts`、`src/hooks/useGitStatus.ts` 等），后来为了让这个模块可以独立理解/维护，全部搬进了 `git/` 目录本身，不再和其它模块共享代码。

## 对应的 Rust 命令（`src-tauri/src/git.rs`）

| 前端调用 (`api.ts`) | Tauri 命令 | 作用 |
|---|---|---|
| `status()` | `git_status` | 读取当前分支名 + staged/unstaged 文件列表 |
| `stage(path)` / `stageAll()` | `git_stage` / `git_stage_all` | 把文件加入暂存区 |
| `unstage(path)` / `unstageAll()` | `git_unstage` / `git_unstage_all` | 把文件移出暂存区 |
| `discard(path)` | `git_discard` | 丢弃工作区改动（已跟踪文件用 checkout 还原，未跟踪文件直接删除） |
| `commit(message)` | `git_commit` | 用暂存区内容创建一次提交 |
| `log(limit)` | `git_log` | 拉取最近 N 条提交（含每条提交的 parent 列表，用来画分支图） |
| `commitFiles(hash)` | `git_commit_files` | 拉取某次提交相对其父提交改动了哪些文件 |

这些命令是和 [Source Control](./source-control.md) 模块共用的（同一套 Rust 函数），因为它们本来就是无状态的、基于当前仓库路径的纯操作，两个前端模块各自独立调用即可，不需要分别在后端实现一遍。
