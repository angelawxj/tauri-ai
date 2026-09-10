import { useLayoutEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { editor } from "monaco-editor";

/** Reserve real editor space; Monaco owns positioning and scrolling. */
export function CommentZone({ editor: ed, line, children }: { editor: editor.IStandaloneCodeEditor; line: number; children: ReactNode }) {
  const [node, setNode] = useState<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    const element = document.createElement("div");
    element.className = "file-selection-comment-zone";
    let zone = "";
    ed.changeViewZones((accessor) => {
      zone = accessor.addZone({ afterLineNumber: line, heightInPx: 140, domNode: element, suppressMouseDown: true });
    });
    const layout = () => {
      element.style.paddingRight = `${Math.max(8, ed.getLayoutInfo().verticalScrollbarWidth)}px`;
    };
    layout();
    const subscription = ed.onDidLayoutChange(layout);
    setNode(element);
    return () => {
      subscription.dispose();
      ed.changeViewZones((accessor) => accessor.removeZone(zone));
    };
  }, [ed, line]);
  return node ? createPortal(children, node) : null;
}

