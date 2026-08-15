import { useEffect, useState } from "react";
import { IconX } from "../icons";
import { api, isApiUnavailable } from "./api";
import DiffView from "./DiffView";

interface DiffTabProps {
  path: string;
  staged: boolean;
  onClose: () => void;
}

export default function DiffTab({ path, staged, onClose }: DiffTabProps) {
  const [diff, setDiff] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setDiff(null);
    setError(null);

    api
      .diff(path, staged)
      .then((text) => {
        if (!cancelled) setDiff(text);
      })
      .catch((err) => {
        if (cancelled || isApiUnavailable(err)) return;
        setError(err instanceof Error ? err.message : "加载 diff 失败");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [path, staged]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-vscode-border px-3">
        <span className="min-w-0 truncate text-[12px] text-vscode-fg-muted" title={path}>
          {path} <span className="text-vscode-fg-dim">· {staged ? "已暂存" : "未暂存"}</span>
        </span>
        <button
          type="button"
          onClick={onClose}
          title="关闭"
          className="shrink-0 rounded p-1 text-vscode-fg-muted hover:bg-vscode-list-hover hover:text-vscode-fg"
        >
          <IconX size={13} />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <DiffView patch={diff} loading={loading} error={error} />
      </div>
    </div>
  );
}
