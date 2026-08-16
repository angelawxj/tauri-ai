import { useEffect, useState } from "react";
import { IconX } from "./icons";
import { api, isApiUnavailable } from "./api";
import { useExplorerI18n } from "./i18n";
import "./theme.css";

interface FileTabProps {
  path: string;
  onClose: () => void;
}

export default function FileTab({ path, onClose }: FileTabProps) {
  const { t } = useExplorerI18n();
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setContent(null);
    setError(null);

    api
      .readFile(path)
      .then((text) => {
        if (!cancelled) setContent(text);
      })
      .catch((err) => {
        if (cancelled || isApiUnavailable(err)) return;
        setError(err instanceof Error ? err.message : t.explorer.loadFileFailed);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [path]);

  return (
    <div className="explorer-theme flex h-full flex-col overflow-hidden bg-vscode-bg">
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-vscode-border px-3">
        <span className="min-w-0 truncate text-[12px] text-vscode-fg-muted" title={path}>
          {path}
        </span>
        <button type="button" onClick={onClose} title={t.common.close} className="shrink-0 rounded p-1 text-vscode-fg-muted hover:bg-vscode-list-hover hover:text-vscode-fg">
          <IconX size={13} />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2 font-mono text-[12.5px] leading-[1.6] text-vscode-fg">
        {loading && <div className="px-1 py-1 text-vscode-fg-dim">{t.explorer.loadingFile}</div>}
        {!loading && error && <div className="px-1 py-1 text-red-400">{error}</div>}
        {!loading && !error && (!content || content.length === 0) && (
          <div className="px-1 py-1 text-vscode-fg-dim">{t.explorer.noFileSelected}</div>
        )}
        {!loading && !error && content && content.length > 0 && (
          <pre className="whitespace-pre-wrap break-all">{content}</pre>
        )}
      </div>
    </div>
  );
}
