import type { FileSelection } from "./types";

export interface EditDiff { original: string; modified: string; line: number }
export type RequestEdit = (content: string, selection: FileSelection, instruction: string) => Promise<EditDiff>;

/** The application owns the original snapshot and range; the model supplies only replacement text. */
export function createEditDiff(content: string, selection: FileSelection, replacement: unknown): EditDiff {
  if (typeof replacement !== "string") throw new Error("AI 返回的修改内容格式不正确");
  if (!Number.isInteger(selection.start) || !Number.isInteger(selection.end)
    || selection.start < 0 || selection.end <= selection.start || selection.end > content.length
    || content.slice(selection.start, selection.end) !== selection.text) {
    throw new Error("选区内容已变化，请重新选择后再试");
  }
  return {
    original: content,
    modified: content.slice(0, selection.start) + replacement + content.slice(selection.end),
    line: selection.startLine,
  };
}
