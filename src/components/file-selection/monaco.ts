import * as monaco from "monaco-editor";
import EditorWorker from "monaco-editor/editor/editor.worker.js?worker";
import JsonWorker from "monaco-editor/language/json/json.worker.js?worker";
import CssWorker from "monaco-editor/language/css/css.worker.js?worker";
import HtmlWorker from "monaco-editor/language/html/html.worker.js?worker";
import TsWorker from "monaco-editor/language/typescript/ts.worker.js?worker";

// Vite bundles workers locally; no CDN or Tauri APIs are needed.
// Respect a worker configuration already installed by the host.
if (!globalThis.MonacoEnvironment?.getWorker && !globalThis.MonacoEnvironment?.getWorkerUrl) {
  globalThis.MonacoEnvironment = {
    ...globalThis.MonacoEnvironment,
    getWorker(_id, label) {
      if (label === "json") return new JsonWorker();
      if (["css", "scss", "less"].includes(label)) return new CssWorker();
      if (["html", "handlebars", "razor"].includes(label)) return new HtmlWorker();
      if (["typescript", "javascript"].includes(label)) return new TsWorker();
      return new EditorWorker();
    },
  };
}

export function getMonacoLanguage(path: string): string {
  const extension = path.split(".").pop()?.toLowerCase() ?? "";
  const languages: Record<string, string> = {
    ts: "typescript", tsx: "typescript", js: "javascript", jsx: "javascript",
    mjs: "javascript", cjs: "javascript", json: "json", html: "html", htm: "html",
    css: "css", scss: "scss", less: "less", md: "markdown", mdx: "markdown",
    rs: "rust", py: "python", sh: "shell", ps1: "powershell", yaml: "yaml", yml: "yaml",
    toml: "ini", xml: "xml", svg: "xml", sql: "sql", go: "go", java: "java",
    c: "c", h: "c", cpp: "cpp", cs: "csharp", vue: "html", txt: "plaintext",
  };
  return languages[extension] ?? "plaintext";
}

export { monaco };

