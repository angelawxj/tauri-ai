import { useEffect, useRef, useState } from "react";
import type { editor } from "monaco-editor";
import { MonacoFileEditor, type MonacoFileEditorProps } from "./MonacoFileEditor";
import { SelectionActions, type SelectionActionsProps } from "./SelectionActions";
import "./styles.css";
import { InlineEditDiff } from "./InlineEditDiff";
import { requestMockEdit, type EditDiff } from "./mockEdit";

export type FileSelectionPreviewProps = MonacoFileEditorProps & Omit<SelectionActionsProps, "editor"> & { simulateEdits?: boolean; onAcceptEdit?: (modified: string, original: string) => Promise<void> };

export default function FileSelectionPreview(props: FileSelectionPreviewProps) {
  const [instance, setInstance] = useState<editor.IStandaloneCodeEditor | null>(null);
  const [diff, setDiff] = useState<EditDiff | null>(null);
  const [pending, setPending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [content, setContent] = useState(props.content);
  const [editingDiff, setEditingDiff] = useState(false);
  const lastEdit = useRef<SelectionActionsProps["initialEdit"]>(null);
  const [resumeEdit, setResumeEdit] = useState<SelectionActionsProps["initialEdit"]>(null);
  const modified = useRef("");
  const request = useRef(0);
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => {
      const theme = props.theme ?? document.documentElement.dataset.theme ?? (media.matches ? "dark" : "light");
      setResolvedTheme(theme === "dark" ? "dark" : "light");
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    media.addEventListener("change", update);
    return () => { observer.disconnect(); media.removeEventListener("change", update); };
  }, [props.theme]);
  useEffect(() => {
    setDiff(null); setPending(false); setContent(props.content); setEditingDiff(false); setSaving(false); setSaveError(null);
    lastEdit.current = null; setResumeEdit(null);
    return () => { request.current++; };
  }, [props.path, props.content]);
  const zh = props.language !== "en";
  return <div className="file-selection" data-theme={resolvedTheme}>
    <div style={{ visibility: diff ? "hidden" : undefined }}>
    <MonacoFileEditor {...props} content={content} onChange={(value) => { setContent(value); props.onChange?.(value); }} onEditorMount={(ed) => { setInstance(ed); props.onEditorMount?.(ed); }} />
    </div>
    {!diff && !pending && <SelectionActions editor={instance} path={props.path} language={props.language} initialEdit={resumeEdit} onAddToChat={props.onAddToChat} onRequestEdit={async (selection, instruction) => {
      if (!props.simulateEdits) { props.onRequestEdit(selection, instruction); return; }
      const id = ++request.current;
      lastEdit.current = { selection, instruction }; setResumeEdit(null);
      setPending(true);
      setSaveError(null);
      try {
        const result = await requestMockEdit(instance?.getModel()?.getValue() ?? props.content, selection, instruction);
        if (id !== request.current) return;
        modified.current = result.modified;
        setEditingDiff(false); setDiff(result);
      } catch (error) {
        if (id !== request.current) return;
        setResumeEdit(lastEdit.current);
        setSaveError(error instanceof Error ? error.message : String(error));
      } finally { if (id === request.current) setPending(false); }
    }} />}
    {pending && <div className="file-selection-diff-status" role="status">{zh ? "正在生成修改…" : "Generating edit…"}</div>}
    {saveError && <div className="file-selection-diff-status" role="alert">{saveError}</div>}
    {diff && <InlineEditDiff diff={diff} path={props.path} codeLanguage={props.codeLanguage} editable={editingDiff && !saving} onChange={(value) => { modified.current = value; }} actions={<div className="file-selection-diff-actions" role="toolbar" aria-label={zh ? "修改操作" : "Edit actions"}>
      <button type="button" disabled={saving} onClick={() => {
        setContent(diff.original); setResumeEdit(lastEdit.current); setDiff(null); setEditingDiff(false); setSaveError(null);
      }}>{zh ? "编辑" : "Edit"}</button>
      <button type="button" disabled={saving} className="file-selection-diff-reject" onClick={() => { setContent(diff.original); setDiff(null); setEditingDiff(false); setSaveError(null); }}>{zh ? "拒绝" : "Reject"}</button>
      <button type="button" disabled={saving} className="file-selection-diff-accept" title={zh ? "接受并保存到文件" : "Accept and save file"} onClick={async () => {
        if (saving) return;
        const value = modified.current;
        setSaving(true); setSaveError(null);
        try {
          if (!props.onAcceptEdit) throw new Error(zh ? "当前预览未连接文件保存接口" : "File saving is not connected for this preview");
          await props.onAcceptEdit(value, diff.original);
          setContent(value); props.onChange?.(value); setDiff(null); setEditingDiff(false);
        } catch (error) {
          setSaveError(error instanceof Error ? error.message : String(error));
        } finally { setSaving(false); }
      }}>{saving ? (zh ? "保存中…" : "Saving…") : (zh ? "接受" : "Accept")}</button>
    </div>} />}
  </div>;
}
