# 浏览器工具迁移指南

本文说明如何把以下三个浏览器功能迁移到另一个 React + Tauri 项目：

1. 抓取页面元素：悬停高亮，提取 DOM、CSS、选择器、可访问性和附近文本，选中后立即复制。
2. 注释页面元素：选择元素、填写注释、显示页面编号标记并导出注释。
3. 在截图上绘制：支持画笔、荧光笔、箭头、矩形、椭圆、文字、颜色、粗细、撤销、重做和复制 PNG。

## 一、迁移范围选择

### 方案 A：只支持本地 HTML、`srcDoc` 或同源页面

只需要迁移前端文件和样式，不需要 Rust 原生桥接。

### 方案 B：支持百度等外部网站

必须同时迁移前端文件、Tauri 原生 WebView、Rust 脚本执行与截图桥接、Cargo 依赖和 Tauri 权限。

普通 iframe 无法绕过网站的 `X-Frame-Options`、CSP 和浏览器同源策略。要达到 Orca 的外部网站效果，不能只复制 React 组件。

## 二、需要复制的文件

### 前端核心目录

完整复制：

```text
src/components/browser-tools/
├── AnnotatePageElement.tsx
├── DrawOnScreenshot.tsx
├── GrabPageElement.tsx
├── browser-element-capture.ts
├── browser-surface.ts
├── index.ts
└── types.ts
```

各文件职责：

| 文件 | 用途 |
| --- | --- |
| `GrabPageElement.tsx` | 元素抓取按钮、自动复制、隐藏的审核弹框 |
| `AnnotatePageElement.tsx` | 页面元素注释、编号标记和注释列表 |
| `DrawOnScreenshot.tsx` | 截图绘制界面、工具栏和 PNG 输出 |
| `browser-element-capture.ts` | 元素选择器、页面注入、DOM/CSS/可访问性提取 |
| `browser-surface.ts` | iframe 与 Tauri 原生 WebView 的统一操作层 |
| `types.ts` | 抓取结果、注释和组件参数类型 |
| `index.ts` | 组件统一导出入口 |

### 浏览器接入文件

参考或复制下面两个文件中的相关实现：

```text
src/components/layout/Browser.tsx
src/components/layout/BrowserView.tsx
```

- `Browser.tsx` 负责把三个按钮放入地址栏。
- `BrowserView.tsx` 负责为外部网址创建 Tauri 原生子 WebView，并同步它的位置和尺寸。

如果目标项目已有浏览器组件，不要覆盖整个文件，只移植后文的接入代码。

### 样式

从下面文件复制所有以 `.browser-` 开头的样式：

```text
src/index.css
```

目标项目需要提供这些主题变量，或者把它们替换为目标项目自己的设计令牌：

```css
--color-vscode-bg;
--color-vscode-panel;
--color-vscode-border;
--color-vscode-border-light;
--color-vscode-fg;
--color-vscode-fg-muted;
--color-vscode-fg-dim;
--color-vscode-input-bg;
--color-vscode-input-border;
--color-vscode-list-hover;
--font-mono;
```

### Tauri 后端

为了支持外部网站，复制：

```text
src-tauri/src/browser.rs
```

并在目标项目的 Rust 入口文件中注册模块和命令：

```rust
mod browser;

tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![
        browser::browser_eval,
        browser::browser_navigate,
        browser::browser_capture_screenshot,
        // 目标项目原有命令……
    ]);
```

本项目入口参考：

```text
src-tauri/src/main.rs
```

### Tauri 权限

把这些权限加入目标项目的 capability 文件，例如：

```text
src-tauri/capabilities/default.json
```

```json
{
  "permissions": [
    "core:default",
    "core:webview:allow-create-webview",
    "core:webview:allow-set-webview-position",
    "core:webview:allow-set-webview-size",
    "core:webview:allow-webview-show",
    "core:webview:allow-webview-hide",
    "core:webview:allow-webview-close"
  ]
}
```

请把这些项目合并到目标项目现有的 `permissions` 数组，不要删除已有权限。

## 三、依赖

### 前端依赖

```json
{
  "dependencies": {
    "@tauri-apps/api": "^2.1.1",
    "lucide-react": "^0.577.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  }
}
```

版本不必完全相同，但目标项目必须使用兼容的 Tauri 2 和 React 18+。

### Rust 依赖

合并到目标项目的 `src-tauri/Cargo.toml`：

```toml
[dependencies]
tauri = { version = "2", features = ["unstable"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
url = "2"

[target.'cfg(windows)'.dependencies]
webview2-com = "0.38.2"
windows = { version = "0.61.3", features = ["Win32_System_Com"] }
```

如果目标项目已经声明 `tauri`，应在原声明中追加 `unstable` feature，不要重复声明依赖。

当前原生截图桥接使用 Windows WebView2 DevTools 协议。macOS/Linux 若需要同等截图能力，需要分别增加 WKWebView/WebKitGTK 的实现。

## 四、前端接入方式

### 1. 创建共享 surface ref

```tsx
import { useCallback, useRef } from "react";
import {
  AnnotatePageElement,
  DrawOnScreenshot,
  GrabPageElement,
} from "./components/browser-tools";
import type { BrowserSurface } from "./components/browser-tools/browser-surface";

const surfaceRef = useRef<BrowserSurface | null>(null);

const handleSurface = useCallback((surface: BrowserSurface | null) => {
  surfaceRef.current = surface;
}, []);
```

### 2. 把按钮放入地址栏

```tsx
<div className="browser-address-bar">
  <input value={address} onChange={handleAddressChange} />

  <GrabPageElement surfaceRef={surfaceRef} disabled={!pageReady} />
  <AnnotatePageElement surfaceRef={surfaceRef} disabled={!pageReady} />
  <DrawOnScreenshot surfaceRef={surfaceRef} disabled={!pageReady} />
</div>
```

按钮顺序与当前 Orca 参考效果一致：准星、带加号的注释框、画笔。

### 3. 同源 iframe 页面

iframe 加载后将它注册为 surface：

```tsx
const iframeRef = useRef<HTMLIFrameElement>(null);

useEffect(() => {
  if (!iframeRef.current) return;
  handleSurface({ kind: "iframe", iframe: iframeRef.current });
  return () => handleSurface(null);
}, [handleSurface]);

return (
  <iframe
    ref={iframeRef}
    srcDoc={html}
    sandbox="allow-scripts allow-same-origin"
  />
);
```

### 4. 外部网站

外部网址应使用 `BrowserView.tsx` 中的 `NativeBrowserFrame` 模式：

1. 创建唯一的 WebView label。
2. 根据占位元素的 `getBoundingClientRect()` 创建子 WebView。
3. 使用 `ResizeObserver` 同步位置与尺寸。
4. 创建成功后注册 `{ kind: "native", label }`。
5. 组件卸载时关闭 WebView 并清空 surface。

不要用 iframe 加载百度，也不要在外部网址模式下显示 X-Frame-Options/CSP 提示。

## 五、自动复制行为

`GrabPageElement.tsx` 当前使用：

```ts
const SHOW_GRAB_REVIEW = false;
```

选中元素后会：

1. 调用 `formatCapture()` 生成文本上下文。
2. 立即写入剪贴板。
3. 在选中元素下方显示“已复制”胶囊提示。
4. 约 1.5 秒后自动移除提示。

审核弹框代码仍然保留。需要恢复时只需改为：

```ts
const SHOW_GRAB_REVIEW = true;
```

## 六、迁移后的验证清单

### 构建验证

```bash
npm run build
cargo check --manifest-path src-tauri/Cargo.toml
```

### 同源页面

- 三个按钮在地址栏正确显示。
- 元素悬停时出现蓝色选区和标签。
- 单击元素后立即复制，不弹出审核层。
- “已复制”提示出现在选区附近并自动消失。
- 注释编号随页面滚动保持在对应元素附近。
- 截图绘制可以复制或下载 PNG。

### 外部页面

使用桌面应用测试，不要用普通浏览器打开前端开发地址：

```bash
npm run tauri dev
```

至少测试：

- `https://www.baidu.com/`
- 一个带滚动内容的页面
- 一个包含输入框、按钮和图片的页面

确认：

- 页面由原生 WebView 正常加载。
- 不受 iframe 的 X-Frame-Options/CSP 限制。
- 元素抓取和注释脚本能注入页面。
- 截图绘制获得真实 WebView 画面，而不是空白图片。
- 切换浏览器 Tab 或关闭浏览器视图后，子 WebView 被关闭，不残留在窗口上方。

## 七、常见问题

### 外部网站仍显示“拒绝被嵌入”

说明目标项目仍在使用 iframe。检查是否进入了 `NativeBrowserFrame` 分支，以及运行环境是否存在 `window.__TAURI_INTERNALS__`。

### 页面覆盖了应用工具栏

子 WebView 的位置或尺寸没有同步。确保使用占位元素的矩形，并在窗口变化、侧栏缩放和组件尺寸变化时调用 `setPosition`、`setSize`。

### 抓取后没有复制

检查目标运行环境是否允许 `navigator.clipboard.writeText()`。如果目标系统限制剪贴板，可把 `copyText()` 替换为 Tauri clipboard 插件或项目已有的原生剪贴板命令。

### 普通浏览器预览无法使用百度抓取

这是预期行为。普通浏览器没有 Tauri 原生子 WebView 和 Rust 桥接，只能验证同源 iframe 页面。

## 八、最小复制清单

若目标是完整支持百度等外部网站，至少迁移：

```text
src/components/browser-tools/**
src/components/layout/Browser.tsx               # 合并相关接入代码
src/components/layout/BrowserView.tsx           # 合并 NativeBrowserFrame
src/index.css                                    # 复制 .browser-* 样式
src-tauri/src/browser.rs
src-tauri/src/main.rs                            # 注册三个命令
src-tauri/Cargo.toml                             # 合并依赖和 feature
src-tauri/capabilities/default.json              # 合并 WebView 权限
```

建议复制整个 `browser-tools` 目录，不要只复制三个 `.tsx` 文件；三个组件共享类型、页面注入、元素提取、截图和 surface 适配逻辑。
