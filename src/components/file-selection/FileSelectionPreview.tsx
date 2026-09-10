import { useState } from "react";
import type { editor } from "monaco-editor";
import { MonacoFileEditor, type MonacoFileEditorProps } from "./MonacoFileEditor";
import { SelectionActions, type SelectionActionsProps } from "./SelectionActions";
import "./styles.css";

export type FileSelectionPreviewProps = MonacoFileEditorProps & Omit<SelectionActionsProps, "editor">;

export default function FileSelectionPreview(props: FileSelectionPreviewProps) {
  const [instance, setInstance] = useState<editor.IStandaloneCodeEditor | null>(null);
  return <div className="file-selection" data-theme={props.theme}>
    <MonacoFileEditor {...props} onEditorMount={(ed) => { setInstance(ed); props.onEditorMount?.(ed); }} />
    <SelectionActions editor={instance} path={props.path} language={props.language} onAddToChat={props.onAddToChat} onRequestEdit={props.onRequestEdit} />
  </div>;
}
