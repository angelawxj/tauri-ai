# Browser tools

三个工具都位于当前目录，没有项目状态库或 Tauri API 依赖：

- `GrabPageElement.tsx`：悬停高亮并抓取元素的 DOM、选择器、可访问性、样式、上下文和局部截图。
- `AnnotatePageElement.tsx`：选择元素、添加意图与评论、在页面显示编号标记并导出全部注释。
- `DrawOnScreenshot.tsx`：截取当前视口并提供画笔、荧光笔、箭头、矩形、椭圆、文字、颜色、粗细、撤销、重做和 PNG 复制。

## 迁移

复制整个 `browser-tools` 目录和 `src/index.css` 中以 `.browser-` 开头的样式；目标项目只需 React 18 和 `lucide-react`。三个组件接收同一个 iframe ref：

```tsx
const iframeRef = useRef<HTMLIFrameElement>(null)

<GrabPageElement iframeRef={iframeRef} />
<AnnotatePageElement iframeRef={iframeRef} />
<DrawOnScreenshot iframeRef={iframeRef} />
<iframe ref={iframeRef} srcDoc={html} sandbox="allow-scripts allow-same-origin" />
```

浏览器安全模型禁止宿主读取跨域 iframe 的 DOM，因此这些工具用于 `srcDoc`、同源页面或允许注入脚本的 Electron/Tauri WebView。外部跨域页面应在宿主层提供页面脚本注入和截图桥接；本项目会明确禁用这些按钮，避免产生不完整或误导性的抓取结果。
