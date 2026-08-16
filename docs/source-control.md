# Source Control 模块

右侧面板的「Source Control」Tab，是参照开源项目 Orca（[stablyai/orca](https://github.com/stablyai/orca)，MIT 协议）的源代码管理面板风格重做的版本：内联 stage/unstage/discard、点文件在中间区域打开 diff 标签页、分支切换、提交历史图、Push。

## 功能

- **分支切换**：header 里的分支名是一个下拉按钮，点开显示所有本地分支，选一个即可 `checkout`。如果有未提交的改动导致切换冲突，后端的报错会原样展示出来，不会静默失败或丢改动。
- **变更分组**：Staged Changes / Changes 两组，逻辑和 Git 管理模块一样（暂存/取消暂存/丢弃 + 分组批量操作）。
- **Diff 查看在中间区域**：点一个文件行，会在应用中间区域（原来只有对话的地方）打开一个简单的「Diff · 文件名」标签页，展示这个文件的 unified diff（新增行/删除行分别用绿色/红色区分）。再点一次「对话」标签切回去，点标签上的 ✕ 关闭 diff 标签。同一时间只有一个 diff 标签（不是多标签页），再点别的文件会直接替换当前 diff 标签的内容。
- **提交历史（swimlane 图）**：面板底部吸底、可拖拽调整高度的历史区。每行是「分支线图形 | 提交摘要 | 分支/tag 徽章」三列布局，折叠态**不显示作者和时间**（只有图形和徽章），点开一行才展开显示作者、完整时间、完整 hash、改动文件列表。HEAD 所在的提交用实心圆，其它提交空心圆，合并提交用菱形区分。
- **Push**：header 分支名旁边的上传图标按钮，点击会弹出确认框（写清楚要推送哪个分支），确认后调用 `git push origin <当前分支>`，成功/失败都会在面板里给出提示文本。

## 目录结构

```
src/components/source-control/
  index.ts                 # 桶文件：export SourceControl / DiffTab / OpenDiffRequest 类型
  SourceControl.tsx         # 根组件：header(分支切换器+Push+刷新) + 变更区 + 吸底历史区
  BranchSwitcher.tsx         # 分支下拉切换
  ChangesSection.tsx          # Staged/Unstaged 分组
  FileRow.tsx                  # 单文件行；点击时通过 onOpenDiff 回调"请求"打开 diff，不再自己管理展开状态
  DiffView.tsx                   # unified diff 文本渲染（按行着色），DiffTab 用它
  DiffTab.tsx                     # 中间区域的 diff 标签页内容：拉取 diff、显示文件路径+暂存状态、关闭按钮
  CommitBox.tsx                    # 提交信息框 + 提交按钮（Ctrl/Cmd+Enter 快捷键）
  HistoryPanel.tsx                  # 吸底、可拖拽高度的历史区容器
  CommitRow.tsx                      # 单条提交：图形 + 摘要 + ref 徽章，展开态显示改动文件+作者+时间
  CommitGraph.tsx                     # swimlane SVG（HEAD 实心/普通空心/合并菱形）
  commit-graph.ts                      # lane 分配算法
  RefBadge.tsx                          # 分支/tag 徽章小组件
  status.ts                              # 文件状态字母 + 颜色映射
  api.ts                                  # Tauri invoke() 薄封装
  types.ts                                 # FileEntry/GitStatus/CommitInfo(含 refs)/BranchInfo/OpenDiffRequest
  useGitStatus.ts                           # git status 轮询/刷新 hook
  useGitHistory.ts                           # 历史列表 + 展开态改动文件缓存 hook
  useBranches.ts                              # 分支列表 + 切换分支 hook
```

## Diff 标签页的状态是怎么从这个模块传到中间区域的

这个模块本身不负责渲染中间区域——中间区域由 `src/components/layout/MainArea.tsx` 管理。数据流是一个提升到 `App.tsx` 的简单状态，没有用 Context：

```
App.tsx
  const [openDiff, setOpenDiff] = useState<OpenDiffRequest | null>(null)
  ├─ <DetailPanel onOpenDiff={(path, staged) => setOpenDiff({ path, staged })} />
  │     └─ <SourceControl onOpenDiff={...} />
  │           └─ <ChangesSection onOpenDiff={...} />
  │                 └─ <FileRow onOpenDiff={...} />   ← 点击这里触发
  └─ <MainArea openDiff={openDiff} onCloseDiff={() => setOpenDiff(null)} />
        └─ openDiff 不为空时渲染 <DiffTab path={...} staged={...} />
```

`FileRow` 点击时只是把 `{path, staged}` 往上传，真正发请求拉 diff 内容的是 `DiffTab.tsx`（在它自己的 `useEffect` 里调用 `api.diff`）。`MainArea.tsx` 用 `openDiff` 是否为空来决定要不要在 tab 栏里显示「Diff · 文件名」这个标签。

## 对应的 Rust 命令（`src-tauri/src/source_control/git.rs`）

除了 `git_status/git_stage/.../git_log/git_commit_files` 之外，这个模块还用到：

| 前端调用 (`api.ts`) | Tauri 命令 | 作用 |
|---|---|---|
| `diff(path, staged)` | `git_diff` | 返回某个文件的 unified diff 文本；`staged=true` 时对比 HEAD 树和暂存区，`false` 时对比暂存区和工作区（未跟踪文件也能显示为"全部新增"） |
| `branches()` | `git_branches` | 列出本地分支，标出哪个是当前 HEAD |
| `checkoutBranch(name)` | `git_checkout_branch` | 安全 checkout 到某个本地分支（`CheckoutBuilder::safe()`，有冲突会报错而不是强制覆盖） |
| `push(branch)` | `git_push` | 走系统 `git push origin <branch>`（不是 git2 的 push API，见下） |

`git_log` 返回的 `CommitInfo` 比 Git 管理模块多一个 `refs: string[]` 字段，是遍历 `refs/heads/*` 和 `refs/tags/*` 算出来的"哪些本地分支/tag 指向这条提交"，就是历史区里那些小徽章的数据来源。

### 为什么 Push 是 shell 出去调用系统 `git`，不是用 `git2` 的 API

这个仓库的 remote 是 SSH（`git@github.com:...`）。`git2` 要支持 SSH 认证得自己接 `RemoteCallbacks` 处理 SSH agent/密钥，比较繁琐，而且换台机器环境不一样还可能要重新调。直接调用系统安装的 `git push`，能直接复用用户机器上已经在正常工作的 SSH agent / credential helper，简单可靠，`git.rs` 其它命令都还是用 `git2` 库直接操作，只有这一个命令是例外。
