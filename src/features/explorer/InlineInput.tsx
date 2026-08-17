import { useEffect, useRef } from "react";
import { IconFile, IconFolder } from "./icons";

interface InlineInputProps {
  depth: number;
  kind: "new-file" | "new-folder" | "rename";
  defaultValue?: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}

/** 树里插入的一行文本输入，用于新建文件/文件夹和重命名，对齐 Orca 的 InlineInputRow。 */
export default function InlineInput({ depth, kind, defaultValue, onSubmit, onCancel }: InlineInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const submittedRef = useRef(false);
  const paddingLeft = depth * 16 + 8;

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.focus();
    if (kind === "rename" && defaultValue) {
      const dotIndex = defaultValue.lastIndexOf(".");
      if (dotIndex > 0) el.setSelectionRange(0, dotIndex);
      else el.select();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = (value: string) => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    onSubmit(value);
  };

  return (
    <div className="flex h-[26px] w-full items-center gap-1 px-2" style={{ paddingLeft }}>
      <span className="size-[13px] shrink-0" />
      {kind === "new-folder" ? <IconFolder size={13} className="shrink-0 text-vscode-fg-muted" /> : <IconFile size={13} className="shrink-0 text-vscode-fg-muted" />}
      <input
        ref={inputRef}
        defaultValue={defaultValue}
        spellCheck={false}
        className="min-w-0 flex-1 rounded-sm border border-vscode-accent bg-vscode-input-bg px-1 text-xs text-vscode-fg outline-none"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit(e.currentTarget.value);
          } else if (e.key === "Escape") {
            submittedRef.current = true;
            onCancel();
          }
        }}
        onBlur={(e) => submit(e.currentTarget.value)}
      />
    </div>
  );
}
