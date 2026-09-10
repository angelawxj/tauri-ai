import { useEffect, useRef } from "react";
import type { editor } from "monaco-editor";
import { getMonacoLanguage, monaco } from "./monaco";

export interface MonacoFileEditorProps {
  path: string;
  content: string;
  readOnly?: boolean;
  theme?: "light" | "dark";
  codeLanguage?: string;
  onChange?: (content: string) => void;
  onSave?: () => void;
  onEditorMount?: (instance: editor.IStandaloneCodeEditor | null) => void;
}

export function MonacoFileEditor({ path, content, readOnly = true, theme, codeLanguage, onChange, onSave, onEditorMount }: MonacoFileEditorProps) {
  const container = useRef<HTMLDivElement>(null);
  const instance = useRef<editor.IStandaloneCodeEditor | null>(null);
  const current = useRef({ content, onChange, onSave, onEditorMount });
  current.current = { content, onChange, onSave, onEditorMount };

  useEffect(() => {
    if (!container.current) return;
    // Each mounted preview owns its own model, even when paths match.
    const model = monaco.editor.createModel(current.current.content, codeLanguage ?? getMonacoLanguage(path));
    const ed = monaco.editor.create(container.current, {
      model, automaticLayout: true, readOnly, fontSize: 13, lineHeight: 22,
      minimap: { enabled: false }, wordWrap: "on", scrollBeyondLastLine: false,
      padding: { top: 8, bottom: 60 }, lineNumbersMinChars: 3,
      renderLineHighlight: "none", overviewRulerLanes: 0, hideCursorInOverviewRuler: true,
      folding: false, glyphMargin: false, stickyScroll: { enabled: false },
      ariaLabel: path,
    });
    instance.current = ed;
    const change = ed.onDidChangeModelContent(() => {
      const value = model.getValue();
      if (value !== current.current.content) current.current.onChange?.(value);
    });
    ed.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => current.current.onSave?.());
    current.current.onEditorMount?.(ed);
    return () => {
      current.current.onEditorMount?.(null);
      change.dispose(); ed.dispose(); model.dispose(); instance.current = null;
    };
  }, [path]);

  useEffect(() => {
    const model = instance.current?.getModel();
    if (model && model.getValue() !== content) model.setValue(content);
  }, [path, content]);
  useEffect(() => { instance.current?.updateOptions({ readOnly }); }, [path, readOnly]);
  useEffect(() => {
    const model = instance.current?.getModel();
    if (model) monaco.editor.setModelLanguage(model, codeLanguage ?? getMonacoLanguage(path));
  }, [path, codeLanguage]);
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => {
      const resolved = theme ?? document.documentElement.dataset.theme ?? (media.matches ? "dark" : "light");
      monaco.editor.setTheme(resolved === "dark" ? "vs-dark" : "vs");
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    media.addEventListener("change", update);
    return () => { observer.disconnect(); media.removeEventListener("change", update); };
  }, [theme]);

  return <div className="file-selection-editor" ref={container} />;
}
