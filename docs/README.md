# tauri-ai 文档

这是一个 Tauri + React 的桌面 AI 助手应用脚手架。目前主要落地的功能是右侧面板里的两个 Git 相关模块：

- [Git 管理](./git-panel.md) —— 早期版本，功能简单，没有 diff 查看/分支切换/push。
- [Source Control](./source-control.md) —— 参照 Orca（stablyai/orca）风格重做的版本，功能更完整：内联 stage/unstage/discard、点文件在中间区域打开 diff 标签页、分支切换、提交历史图、Push。

两个模块的代码互相独立，分别在 `src/components/git/` 和 `src/components/source-control/` 下，都是"自包含目录"——每个目录里有自己的 `api.ts`（调用 Tauri 命令）、`types.ts`、状态 hook、UI 组件，不共享彼此的代码。

## 运行项目

### 前置条件

- Node.js（装依赖、跑前端）
- Rust 工具链 + `cargo`（跑 Tauri 后端）
- 首次使用需要 `npm install` 装依赖

### 常用命令

| 命令 | 作用 |
|---|---|
| `npm install` | 安装前端依赖 |
| `npm run dev` | 只启动前端 Vite dev server（`http://localhost:1420`），**纯浏览器预览**，没有 Tauri 后端，Git 相关操作会提示「未连接 Git 后端」 |
| `npm run tauri dev` | 启动完整桌面应用（前端 + Rust 后端），会打开真正的应用窗口，是日常开发时最常用的命令 |
| `npm run build` | `tsc --noEmit` 类型检查 + `vite build` 打包前端产物到 `dist/` |
| `npm run tauri build` | 打包成可分发的桌面安装包 |
| `cd src-tauri && cargo check` | 只检查 Rust 代码能不能编译通过，比完整编译快，改完 `.rs` 文件后先跑这个 |
| `cd src-tauri && cargo build` | 完整编译 Rust 后端 |

### 关于「Git 管理」和「Source Control」操作的是哪个仓库

`src-tauri/src/git.rs` 里的 `repo_root()` 固定指向这个项目自身所在的 git 仓库（`CARGO_MANIFEST_DIR` 的上一级目录），也就是说这两个面板管理的就是 `tauri-ai` 这个项目本身的 git 状态，不是某个可以任选的外部目录。
