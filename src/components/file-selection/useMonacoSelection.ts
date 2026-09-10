import { useCallback, useEffect, useState, type RefObject } from "react";
import type { editor } from "monaco-editor";
import type { FileSelection } from "./types";

export function useMonacoSelection(ed: editor.IStandaloneCodeEditor | null, path: string, root: RefObject<HTMLDivElement>) {
  const [selection, setSelection] = useState<FileSelection | null>(null);
  const [position, setPosition] = useState<{ left: number; top: number; contentLeft: number } | null>(null);
  const dismiss = useCallback(() => { setSelection(null); setPosition(null); }, []);

  useEffect(() => {
    dismiss();
    if (!ed) return;
    let dragging = false;
    const capture = () => {
      const range = ed.getSelection();
      const model = ed.getModel();
      if (!range || range.isEmpty() || !model) { dismiss(); return; }
      const text = model.getValueInRange(range);
      if (!text.trim()) { dismiss(); return; }
      setSelection({ path, text, start: model.getOffsetAt(range.getStartPosition()), end: model.getOffsetAt(range.getEndPosition()), startLine: range.startLineNumber, endLine: range.endColumn === 1 && range.endLineNumber > range.startLineNumber ? range.endLineNumber - 1 : range.endLineNumber });
    };
    const subscriptions = [
      ed.onMouseDown((event) => { if (event.target.element?.closest(".file-selection-comment-zone")) return; dragging = true; dismiss(); }),
      ed.onMouseUp((event) => { if (event.target.element?.closest(".file-selection-comment-zone")) return; dragging = false; capture(); }),
      ed.onDidChangeCursorSelection(() => { if (!dragging) capture(); }),
      ed.onDidChangeModelContent(dismiss), ed.onDidChangeModel(dismiss),
    ];
    return () => subscriptions.forEach((subscription) => subscription.dispose());
  }, [ed, path, dismiss]);

  useEffect(() => {
    if (!ed || !selection) { setPosition(null); return; }
    const model = ed.getModel();
    if (!model) return;
    const start = model.getPositionAt(selection.start);
    const end = model.getPositionAt(selection.end);
    const decorations = ed.createDecorationsCollection([{
      range: { startLineNumber: start.lineNumber, startColumn: start.column, endLineNumber: end.lineNumber, endColumn: end.column },
      options: { className: "file-selection-highlight" },
    }]);
    const update = () => {
      const element = ed.getDomNode();
      if (!element || !root.current) return;
      const anchor = ed.getScrolledVisiblePosition(end);
      const bounds = element.getBoundingClientRect();
      const parent = root.current.getBoundingClientRect();
      if (!anchor || !bounds.width || anchor.top + anchor.height < 0 || anchor.top > bounds.height) { setPosition(null); return; }
      setPosition({ left: bounds.left - parent.left + anchor.left, top: bounds.top - parent.top + anchor.top + anchor.height + 6, contentLeft: bounds.left - parent.left + ed.getLayoutInfo().contentLeft });
    };
    update();
    const subscriptions = [ed.onDidScrollChange(update), ed.onDidLayoutChange(update)];
    return () => { decorations.clear(); subscriptions.forEach((subscription) => subscription.dispose()); };
  }, [ed, selection, root]);

  return { selection, position, dismiss };
}
