# Monaco 文件预览与划词组件

整个 `file-selection/` 文件夹可迁移到 React + TypeScript + Vite 项目，不依赖宿主的 store、i18n、Tailwind、Tauri 或聊天实现。`example/` 是不依赖文件系统的独立演示，可选复制。

## 迁移三步

1. 复制整个文件夹。
2. 在目标项目安装 `npm install monaco-editor@0.56.0`（React 18+）。worker 使用此版本的包导出路径，不要直接套用旧版 Monaco 的 `esm/vs` 导入路径。
3. 修改接入页面，用下方组件替换文本编辑器。父容器必须有实际高度；flex 布局设置 `flex: 1; min-height: 0`。

```tsx
import { FileSelectionPreview } from './file-selection';

<div style={{ height: 500 }}>
  <FileSelectionPreview
    path={file.path}
    content={file.content}
    language="zh"
    theme="light"
    readOnly
    onAddToChat={(selection) => appendToDraft(selection.text)}
    onRequestEdit={(selection, instruction) => queueEdit(selection, instruction)}
  />
</div>
```

`appendToDraft` / `queueEdit` 是宿主自己的回调，需要接入目标项目业务。组件只回传请求，不自动发送消息、调用模型或写入磁盘。

## 接入用户提供的 ArtifactPreview

导入 `FileSelectionPreview` 后，将 HTML 源码分支和普通文本分支中的 `FileEditor` 替换为：

```tsx
<FileSelectionPreview
  path={file.absPath ?? file.path}
  content={liveFile?.content ?? ''}
  codeLanguage={getMonacoLanguage(file.name)}
  theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
  language="zh"
  readOnly={!editable}
  onChange={onContentChange}
  onSave={onSave}
  onAddToChat={handleAddToChat}
  onRequestEdit={handleRequestEdit}
/>
```

`getMonacoLanguage` 可从本文件夹导出入口导入。保留原有保存按钮和父组件的内容管理。移除这两个分支原先的划词 hook / toolbar / question input，避免重复菜单；Markdown 阅读、Diff、图片、PPT、原生 WebView 分支保留各自渲染，不用文本编辑器强行替换。

## 复用已有 Monaco 实例

若目标项目需要保留自有 FileEditor，在其挂载时获取编辑器实例，再将 `SelectionActions` 作为兄弟元素放在同一个定位容器中：

```tsx
import { useState } from 'react';
import type { editor } from 'monaco-editor';
import { SelectionActions } from './file-selection/SelectionActions';

const [instance, setInstance] = useState<editor.IStandaloneCodeEditor | null>(null);

<div style={{ position: 'relative', height: 500 }}>
  <ExistingEditor onEditorMount={setInstance} />
  <SelectionActions
    editor={instance}
    path={file.path}
    onAddToChat={handleAddToChat}
    onRequestEdit={handleRequestEdit}
  />
</div>
```

`ExistingEditor` 的挂载回调名称按目标项目调整。卸载时清空实例。直接导入 `SelectionActions` 不会初始化 Monaco 或修改宿主 worker。Diff 可传 `getModifiedEditor()` 或 `getOriginalEditor()`，但宿主仍需在回调中区分左右版本；完整双栏 Diff 交互未包含在本示例中。

## 文件职责

- `FileSelectionPreview.tsx`：组合编辑器和划词操作。
- `MonacoFileEditor.tsx`：模型生命周期、语法高亮、受控内容、只读开关、保存快捷键。
- `SelectionActions.tsx`：菜单、紧凑编辑输入条、本地评论和边界定位。
- `CommentZone.tsx`：通过 Monaco ViewZone 在选区结束行后插入 208px 空间，192px 评论卡片占据真实编辑器布局；取消或删除会释放空间。
- `useMonacoSelection.ts`：Monaco 选区、原文/行号/偏移、持续高亮、滚动与布局更新。
- `monaco.ts`：本地 worker 和语言映射；已有宿主 worker 配置时不覆盖。
- `types.ts` / `index.ts`：公开数据类型与接口。
- `styles.css`：独立样式，支持宿主颜色变量，也有默认配色。

## 行为与边界

- 拖选、反向选择或键盘选择后显示菜单，行号不会混入文本。仅支持单个连续选区。
- `FileSelection.start/end` 是当前 Monaco 模型的 UTF-16 偏移，末端不含；行号从 1 开始。以换行结尾时不把下一行算入范围。
- 菜单、编辑输入条和评论框统一对齐 Monaco 代码区域左边缘（不含行号）。输入条高 40px、最大宽 480px；狭窄面板自适应，滚动时跟随选区，选区末端滚出视口时隐藏。Escape / 外部点击关闭。
- Enter 或上箭头提交；空编辑请求禁用，中文输入法组词时不误提交。
- 评论输入框与已提交评论均在对应代码行下方撑开布局，不遮盖后续代码。麦克风图标仅为视觉入口，未接入语音服务。评论在当前实例中保留，切文件、内容变化、卸载或刷新会清空；它们是临时评论，不是磁盘注释。
- `readOnly` 默认 true；可传 false 和 `onChange` 支持手动编辑，`onSave` 对应 Ctrl/Cmd+S。
- Monaco 主题是全局的；同页多个编辑器应使用相同主题。未传 theme 时读取根节点 `data-theme` 或系统主题。
- Vite 无需修改配置，worker 随构建打包，不访问 CDN。非 Vite 项目需要适配 `monaco.ts` 的 worker 导入。

## 当前项目验证入口

启动 `npm run dev` 后打开 `/src/components/file-selection/example/index.html`，可验证选区、回调、主题、滚动和缩放；当前应用已在 `src/features/explorer/FileTab.tsx` 接入。

Monaco 官方 Vite 集成说明：https://github.com/microsoft/monaco-editor/blob/main/docs/integrate-esm.md


