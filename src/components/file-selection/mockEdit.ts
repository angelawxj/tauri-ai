import type { FileSelection } from "./types";

export interface EditDiff { original: string; modified: string; line: number }

/** Local stand-in for an edit endpoint; offsets are from the submitted snapshot. */
export async function requestMockEdit(content: string, selection: FileSelection, instruction: string): Promise<EditDiff> {
  await new Promise((resolve) => setTimeout(resolve, 450));
  const quoted = instruction.match(/[“"「]([^”"」]+)[”"」]\s*$/)?.[1];
  const replacement = quoted ?? instruction.replace(/^.*?(?:替换为|替换成|改为|改成|修改为|修改成)\s*[:：]?\s*/, "").trim();
  // Preserve a selected HTML element when the instruction supplies plain text.
  const element = selection.text.match(/^(<([\w-]+)\b[^>]*>)([\s\S]*)(<\/\2>)$/);
  const text = element && !replacement.includes("<") ? `${element[1]}${replacement}${element[4]}` : replacement;
  return { original: content, modified: content.slice(0, selection.start) + text + content.slice(selection.end), line: selection.startLine };
}
