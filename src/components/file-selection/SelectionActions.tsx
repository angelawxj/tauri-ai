import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { FileSelection } from "./types";
import type { editor } from "monaco-editor";
import { useMonacoSelection } from "./useMonacoSelection";
import "./styles.css";
import { CommentZone } from "./CommentZone";

export interface SelectionActionsProps {
  path: string;
  editor: editor.IStandaloneCodeEditor | null;
  language?: "zh" | "en";
  onAddToChat: (selection: FileSelection) => void;
  onRequestEdit: (selection: FileSelection, instruction: string) => void;
}

/** Selection offsets always refer to the original, unmodified file content. */
export function SelectionActions({ path, editor: ed, language = "zh", onAddToChat, onRequestEdit }: SelectionActionsProps) {
  const zh = language === "zh";
  const root = useRef<HTMLDivElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const { selection, position, dismiss: clearSelection } = useMonacoSelection(ed, path, root);
  const [mode, setMode] = useState<"menu" | "comment" | "edit">("menu");
  const [draft, setDraft] = useState("");

  const [placement, setPlacement] = useState({ left: 0, top: 0 });
  const [comments, setComments] = useState<(FileSelection & { id: string; body: string })[]>([]);


  const dismiss = () => { clearSelection(); setMode("menu"); setDraft(""); };
  useEffect(() => {
    dismiss(); setComments([]);
  }, [path]);
  useEffect(() => {
    if (!ed) return;
    const changed = ed.onDidChangeModelContent(() => setComments([]));
    const modelChanged = ed.onDidChangeModel(() => setComments([]));
    return () => { changed.dispose(); modelChanged.dispose(); };
  }, [ed]);
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (!popup.current?.contains(event.target as Node)) dismiss();
    };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") dismiss(); };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, []);

  useEffect(() => { setMode("menu"); setDraft(""); }, [selection]);
  useLayoutEffect(() => {
    if (!position || !root.current || !popup.current) return;
    const update = () => {
      if (!root.current || !popup.current) return;
      const width = root.current.clientWidth;
      const height = root.current.clientHeight;
      const box = popup.current.getBoundingClientRect();
      const desiredLeft = position.contentLeft;
      setPlacement({
        left: Math.max(4, Math.min(desiredLeft, width - box.width - 4)),
        top: Math.max(4, Math.min(position.top, height - box.height - 4)),
      });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(root.current); observer.observe(popup.current);
    return () => observer.disconnect();
  }, [position, mode]);

  return <div ref={root} className="file-selection-overlay">
    {selection && position && mode !== "comment" && <div ref={popup} className={`file-selection-popover ${mode === "edit" ? "file-selection-edit" : ""}`} style={placement} role={mode === "menu" ? "toolbar" : "region"} aria-label={zh ? "划词操作" : "Selection actions"} onPointerDown={(event) => { if (mode === "menu") event.preventDefault(); }}>
      {mode === "menu" ? <>
        <button type="button" onClick={() => { onAddToChat(selection); dismiss(); }}>{zh ? "添加到对话" : "Add to chat"}</button>
        <button type="button" onClick={() => setMode("comment")}>{zh ? "评论" : "Comment"}</button>
        <button type="button" onClick={() => setMode("edit")}>{zh ? "编辑" : "Edit"}</button>
      </> : <form className="file-selection-edit-form" onSubmit={(event) => {
        event.preventDefault();
        if (!draft.trim()) return;
        onRequestEdit(selection, draft.trim());
        dismiss();
      }}>
        <input autoFocus value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={zh ? "描述编辑内容..." : "Describe the edit..."} aria-label={zh ? "描述编辑内容" : "Describe the edit"} onKeyDown={(event) => {
          if (event.key === "Enter" && event.nativeEvent.isComposing) event.preventDefault();
        }} />
        <button className="file-selection-edit-send" type="submit" disabled={!draft.trim()} aria-label={zh ? "提交编辑请求" : "Submit edit request"} title={zh ? "提交编辑请求" : "Submit edit request"}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20V4m-7 7 7-7 7 7" /></svg>
        </button>
      </form>}
    </div>}
    {selection && mode === "comment" && ed && <CommentZone editor={ed} line={selection.endLine}>
      <section ref={popup} className="file-selection-comment-card" aria-label={zh ? "本地评论" : "Local comment"}>
        <header className="file-selection-comment-header">
          <span className="file-selection-avatar">WI</span>
          <span>{zh ? "你" : "You"}</span>
          <span className="file-selection-comment-range">{zh ? `第 R${selection.startLine} 至 R${selection.endLine} 行的本地评论` : `Local comment on R${selection.startLine}–R${selection.endLine}`}</span>
        </header>
        <textarea autoFocus value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={zh ? "请求更改" : "Request changes"} aria-label={zh ? "评论内容" : "Comment text"} />
        <footer className="file-selection-comment-footer">
          <span className="file-selection-microphone" title={zh ? "语音输入暂未接入" : "Voice input is not connected"}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="8" y="2" width="8" height="14" rx="4"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-3 0h6"/></svg>
          </span>
          <button type="button" onClick={dismiss}>{zh ? "取消" : "Cancel"}</button>
          <button className="file-selection-comment-submit" type="button" disabled={!draft.trim()} onClick={() => {
            setComments((items) => [...items, { ...selection, id: crypto.randomUUID(), body: draft.trim() }]);
            dismiss();
          }}>{zh ? "注释" : "Comment"}</button>
        </footer>
      </section>
    </CommentZone>}
    {ed && comments.map((comment) => <CommentZone key={comment.id} editor={ed} line={comment.endLine}>
      <article className="file-selection-comment-card" aria-label={zh ? "已添加的本地评论" : "Saved local comment"}>
        <header className="file-selection-comment-header"><span className="file-selection-avatar">WI</span><span>{zh ? "你" : "You"}</span><span className="file-selection-comment-range">{zh ? `第 R${comment.startLine} 至 R${comment.endLine} 行的本地评论` : `Local comment on R${comment.startLine}–R${comment.endLine}`}</span></header>
        <p className="file-selection-comment-body">{comment.body}</p>
        <footer className="file-selection-comment-footer"><button type="button" onClick={() => setComments((items) => items.filter((item) => item.id !== comment.id))}>{zh ? "删除评论" : "Delete comment"}</button></footer>
      </article>
    </CommentZone>)}
  </div>;
}






