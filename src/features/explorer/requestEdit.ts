import { invoke } from "@tauri-apps/api/core";
import { createEditDiff, type RequestEdit } from "../../components/file-selection/editResult";

/** Each call is stateless; only selected code and bounded nearby context leave the app. */
export const requestClaudeEdit: RequestEdit = async (content, selection, instruction) => {
  createEditDiff(content, selection, selection.text);
  const replacement = await invoke<string>("ai_edit_selection", {
    path: selection.path,
    before: content.slice(Math.max(0, selection.start - 12000), selection.start),
    selected: selection.text,
    after: content.slice(selection.end, selection.end + 12000),
    instruction,
  });
  const eol = content.includes("\r\n") ? "\r\n" : "\n";
  return createEditDiff(content, selection, replacement.replace(/\r\n|\r|\n/g, eol));
};
