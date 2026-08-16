# tauri-ai 文档

这是一个 Tauri + React 的桌面 AI 助手应用脚手架。目前主要落地的功能是右侧面板里的几个模块：

- [Source Control](./source-control.md) —— 参照 Orca（stablyai/orca）风格重做的源代码管理面板：内联 stage/unstage/discard、点文件在中间区域打开 diff 标签页、分支切换、提交历史图、Push。
- 资源管理器 —— 只读文件浏览器，参照 Orca 的 FileExplorer 风格实现，点文件在中间区域打开只读预览标签页。

这些模块的代码互相独立，分别在 `src/features/source-control/` 和 `src/features/explorer/` 下，都是"自包含目录"——每个目录里有自己的 `api.ts`（调用 Tauri 命令）、`types.ts`、状态 hook、UI 组件，不共享彼此的代码，方便整体迁移到别的项目。

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

### Source Control 和资源管理器操作的是哪个目录

默认指向这个项目自身所在的目录（`CARGO_MANIFEST_DIR` 的上一级目录），左侧项目列表里切换项目时，会分别通知 Source Control（`src-tauri/src/source_control/git.rs`）和资源管理器（`src-tauri/src/explorer/fs.rs`）各自独立的当前项目路径，两者互不依赖。
