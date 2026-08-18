# Browser tools

三个功能均封装为独立公共组件，统一由当前目录的 `index.ts` 导出。业务页面只负责传入浏览器表面引用，不包含任何工具实现：

- `GrabPageElement.tsx`：悬停高亮并抓取元素的 DOM、选择器、可访问性、样式、上下文和局部截图。
- `AnnotatePageElement.tsx`：选择元素、添加意图与评论、在页面显示编号标记并导出全部注释。
- `DrawOnScreenshot.tsx`：截取当前视口并提供画笔、荧光笔、箭头、矩形、椭圆、文字、颜色、粗细、撤销、重做和 PNG 复制。

## 迁移

复制整个 `browser-tools` 目录和 `src/index.css` 中以 `.browser-` 开头的样式。三个组件接收同一个 `BrowserSurface` ref，可连接同源 iframe 或 Tauri 原生 WebView：

```tsx
import {
  AnnotatePageElement,
  DrawOnScreenshot,
  GrabPageElement,
  type BrowserSurface,
} from "./components/browser-tools"

const surfaceRef = useRef<BrowserSurface | null>(null)

<GrabPageElement surfaceRef={surfaceRef} />
<AnnotatePageElement surfaceRef={surfaceRef} />
<DrawOnScreenshot surfaceRef={surfaceRef} />

<iframe
  ref={(iframe) => { surfaceRef.current = iframe ? { kind: "iframe", iframe } : null }}
  srcDoc={html}
  sandbox="allow-scripts allow-same-origin"
/>
```

iframe 模式只需要 React 18 和 `lucide-react`；原生 WebView 模式还需要复制项目中的 Tauri 浏览器命令并安装 `@tauri-apps/api`。浏览器安全模型禁止宿主读取跨域 iframe 的 DOM，因此外部网站应使用原生 WebView 适配，不能用普通跨域 iframe 代替。
