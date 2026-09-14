import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { monaco, getMonacoLanguage } from "./monaco";
import type { EditDiff } from "./mockEdit";

export function InlineEditDiff({ diff, path, codeLanguage, editable = false, onChange, actions }: { diff: EditDiff; path: string; codeLanguage?: string; editable?: boolean; onChange?: (content: string) => void; actions?: ReactNode }) {
  const container = useRef<HTMLDivElement>(null);
  const [actionsNode, setActionsNode] = useState<HTMLDivElement | null>(null);
  const instance = useRef<ReturnType<typeof monaco.editor.createDiffEditor> | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  useEffect(() => {
    if (!container.current) return;
    const language = codeLanguage ?? getMonacoLanguage(path);
    const original = monaco.editor.createModel(diff.original, language);
    const modified = monaco.editor.createModel(diff.modified, language);
    const ed = monaco.editor.createDiffEditor(container.current, {
      automaticLayout: true, readOnly: true, originalEditable: false,
      renderSideBySide: false, compactMode: true, renderIndicators: false, renderMarginRevertIcon: false,
      enableSplitViewResizing: false, minimap: { enabled: false },
      fontSize: 13, lineHeight: 22, lineNumbersMinChars: 3,
      scrollBeyondLastLine: false, wordWrap: "off", folding: false,
      stickyScroll: { enabled: false }, renderOverviewRuler: false,
      overviewRulerLanes: 0, overviewRulerBorder: false, hideCursorInOverviewRuler: true,
      scrollbar: { useShadows: false, vertical: "auto", horizontal: "auto", verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
      padding: { top: 8, bottom: 60 }, renderLineHighlight: "none",
      diffAlgorithm: "advanced", experimental: { useTrueInlineView: false },
    });
    ed.setModel({ original, modified });
    instance.current = ed;
    const modifiedEditor = ed.getModifiedEditor();
    const gutterDecorations = modifiedEditor.createDecorationsCollection();
    const updateDeletedNumbers = () => {
      const deleted = ed.getLineChanges()?.filter((item) => item.originalEndLineNumber > 0) ?? [];
      const margins = container.current?.querySelectorAll<HTMLElement>(".inline-deleted-margin-view-zone");
      const info = modifiedEditor.getLayoutInfo();
      margins?.forEach((margin, index) => {
        const hunk = deleted[index];
        if (!hunk) return;
        let numbers = margin.querySelector<HTMLElement>(".file-selection-deleted-numbers");
        if (!numbers) {
          numbers = document.createElement("div");
          numbers.className = "file-selection-deleted-numbers";
          margin.appendChild(numbers);
        }
        const text = Array.from({ length: hunk.originalEndLineNumber - hunk.originalStartLineNumber + 1 }, (_, i) => String(hunk.originalStartLineNumber + i)).join("\n");
        if (numbers.textContent !== text) numbers.textContent = text;
        numbers.style.left = `${info.lineNumbersLeft}px`;
        numbers.style.width = `${info.lineNumbersWidth}px`;
        numbers.style.lineHeight = "22px";
      });
    };
    const marginObserver = new MutationObserver(updateDeletedNumbers);
    marginObserver.observe(container.current, { childList: true, subtree: true });
    const actionHost = document.createElement("div");
    actionHost.className = "file-selection-diff-action-zone";
    container.current.appendChild(actionHost);
    setActionsNode(actionHost);
    let revealed = false;
    const layoutActions = () => {
      const changes = ed.getLineChanges();
      const last = changes?.[changes.length - 1];
      const info = modifiedEditor.getLayoutInfo();
      const bottom = last && last.modifiedEndLineNumber === 0
        ? (last.modifiedStartLineNumber < modified.getLineCount()
          ? modifiedEditor.getTopForLineNumber(last.modifiedStartLineNumber + 1, true)
          : modifiedEditor.getContentHeight() - 60)
        : modifiedEditor.getBottomForLineNumber(last?.modifiedEndLineNumber ?? Math.min(diff.line, modified.getLineCount()));
      const top = bottom - modifiedEditor.getScrollTop();
      actionHost.style.top = `${top}px`;
      actionHost.style.right = `${Math.max(8, info.verticalScrollbarWidth)}px`;
      actionHost.style.display = changes && top >= 0 && top < info.height ? "flex" : "none";
      updateDeletedNumbers();
    };
    layoutActions();
    const layout = modifiedEditor.onDidLayoutChange(layoutActions);
    const scroll = modifiedEditor.onDidScrollChange(layoutActions);
    const size = modifiedEditor.onDidContentSizeChange(layoutActions);
    const contentChange = modified.onDidChangeContent(() => onChangeRef.current?.(modified.getValue()));
    const change = ed.onDidUpdateDiff(() => {
      const changes = ed.getLineChanges();
      gutterDecorations.set((changes ?? []).filter((item) => item.modifiedEndLineNumber > 0).map((item) => ({
        range: new monaco.Range(item.modifiedStartLineNumber, 1, item.modifiedEndLineNumber, 1),
        options: { isWholeLine: true, lineNumberClassName: "file-selection-inserted-number" },
      })));
      updateDeletedNumbers();
      layoutActions();
      if (!revealed) { revealed = true; modifiedEditor.revealLineInCenter(diff.line); }
    });
    return () => {
      instance.current = null; marginObserver.disconnect(); gutterDecorations.clear(); layout.dispose(); contentChange.dispose(); change.dispose();
      scroll.dispose(); size.dispose(); actionHost.remove();
      ed.dispose(); original.dispose(); modified.dispose();
    };
  }, [diff, path, codeLanguage]);
  useEffect(() => {
    instance.current?.updateOptions({ readOnly: !editable });
    if (editable) instance.current?.getModifiedEditor().focus();
  }, [editable, diff, path, codeLanguage]);
  return <><div className="file-selection-editor file-selection-inline-diff" ref={container} aria-label="Inline edit diff" />{actionsNode && createPortal(actions, actionsNode)}</>;
}
