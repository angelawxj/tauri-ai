import { useState } from "react";
import { createRoot } from "react-dom/client";
import { FileSelectionPreview, describeSelection } from "../index";

function Example() {
  const [result, setResult] = useState("");
  const [dark, setDark] = useState(false);
  const [content, setContent] = useState('<!doctype html>\n<html lang="zh-CN">\n  <head>\n    <meta charset="UTF-8" />\n    <title>Monaco preview</title>\n  </head>\n  <body>\n    <div id="root"></div>\n    <script type="module" src="/src/main.tsx"></script>\n  </body>\n</html>');
  return <main style={{ maxWidth: 900, margin: "24px auto", fontFamily: "sans-serif" }}>
    <h2>Monaco 划词组件示例</h2>
    <button onClick={() => setDark((value) => !value)}>切换主题</button>
    <button onClick={() => setContent((value) => value + "\n" + Array.from({ length: 100 }, (_, index) => `<!-- ${index + 1} 滚动测试 -->`).join("\n"))}>追加测试行</button>
    <div style={{ height: 400, marginTop: 12, border: "1px solid #ddd", resize: "horizontal", overflow: "hidden", minWidth: 260 }}>
      <FileSelectionPreview path="index.html" content={content} theme={dark ? "dark" : "light"}
        onAddToChat={(selection) => setResult(describeSelection(selection))}
        onRequestEdit={(selection, instruction) => setResult(instruction + "\n\n" + describeSelection(selection))} />
    </div>
    <pre aria-label="回调结果" style={{ whiteSpace: "pre-wrap" }}>{result}</pre>
  </main>;
}

createRoot(document.getElementById("root")!).render(<Example />);
