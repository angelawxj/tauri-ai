import { useCallback, useEffect, useRef, useState } from "react";
import { IconCompass, IconExternalLink, IconRefresh } from "../icons";
import { api as explorerApi, isApiUnavailable } from "../../features/explorer/api";
import { useI18n } from "../../i18n";
import { isHttpUrl, resolveContent, type Resolved } from "./browser-render";
import BrowserView from "./BrowserView";
import { AnnotatePageElement, DrawOnScreenshot, GrabPageElement } from "../browser-tools";
import type { BrowserSurface } from "../browser-tools";

export type BrowserSource = { kind: "path"; path: string } | { kind: "artifact"; name: string; content: string };

export interface PoppedBrowser {
  title: string;
  resolved: Resolved;
}

interface BrowserProps {
  source: BrowserSource | null;
  /** 点击"在中间区域打开"按钮时把当前已渲染的内容交给宿主，在 MainArea 开一个宽屏标签页。 */
  onPopOut?: (popped: PoppedBrowser) => void;
}

export default function Browser({ source, onPopOut }: BrowserProps) {
  const { t } = useI18n();
  const [addressInput, setAddressInput] = useState("");
  const [resolved, setResolved] = useState<Resolved | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const surfaceRef = useRef<BrowserSurface | null>(null);
  const surfaceHostRef = useRef<HTMLDivElement>(null);
  const handleSurface = useCallback((surface: BrowserSurface | null) => { surfaceRef.current = surface; }, []);

  const navigate = (target: string) => {
    const value = target.trim();
    if (!value) return;
    setError(null);
    setUnavailable(false);

    if (isHttpUrl(value)) {
      setResolved({ mode: "iframe-url", url: value });
      return;
    }

    setLoading(true);
    explorerApi
      .readFile(value)
      .then((content) => resolveContent(value, content))
      .then((next) => setResolved(next))
      .catch((err) => {
        if (isApiUnavailable(err)) {
          setUnavailable(true);
          return;
        }
        setError(err instanceof Error ? err.message : t.browser.loadFailed);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!source) return;
    if (source.kind === "path") {
      setAddressInput(source.path);
      navigate(source.path);
      return;
    }
    setAddressInput(source.name);
    setError(null);
    setUnavailable(false);
    setLoading(false);
    void resolveContent(source.name, source.content).then(setResolved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);

  const canPopOut = !unavailable && !loading && !error && Boolean(resolved);

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-vscode-bg">
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-vscode-border px-3">
        <IconCompass size={14} className="shrink-0 text-vscode-fg-muted" />
        <input
          value={addressInput}
          onChange={(e) => setAddressInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") navigate(addressInput);
          }}
          placeholder={t.browser.addressPlaceholder}
          className="min-w-0 flex-1 rounded border border-vscode-input-border bg-vscode-input-bg px-2 py-1 text-[12px] text-vscode-fg outline-none placeholder:text-vscode-fg-dim focus:border-vscode-accent"
        />
        <button type="button" title={t.common.refresh} onClick={() => navigate(addressInput)} className="shrink-0 rounded p-1 text-vscode-fg-muted hover:bg-vscode-list-hover hover:text-vscode-fg">
          <IconRefresh size={13} />
        </button>
        <span className="h-5 w-px shrink-0 bg-vscode-border-light" />
        <GrabPageElement surfaceRef={surfaceRef} getSurfaceBounds={() => surfaceHostRef.current?.getBoundingClientRect() ?? null} disabled={!resolved || resolved.mode === "text"} />
        <AnnotatePageElement surfaceRef={surfaceRef} getSurfaceBounds={() => surfaceHostRef.current?.getBoundingClientRect() ?? null} disabled={!resolved || resolved.mode === "text"} />
        <DrawOnScreenshot surfaceRef={surfaceRef} disabled={!resolved || resolved.mode === "text"} />
        <span className="h-5 w-px shrink-0 bg-vscode-border-light" />
        <button
          type="button"
          title={t.browser.popOut}
          disabled={!canPopOut}
          onClick={() => resolved && onPopOut?.({ title: addressInput, resolved })}
          className="shrink-0 rounded p-1 text-vscode-fg-muted hover:bg-vscode-list-hover hover:text-vscode-fg disabled:cursor-not-allowed disabled:opacity-40"
        >
          <IconExternalLink size={13} />
        </button>
      </div>

      <div ref={surfaceHostRef} className="min-h-0 flex-1 overflow-hidden">
        {unavailable && <div className="px-3 py-3 text-[12px] leading-relaxed text-vscode-fg-dim">{t.browser.notConnected}</div>}
        {!unavailable && loading && <div className="px-3 py-2 text-[12px] text-vscode-fg-dim">{t.browser.loading}</div>}
        {!unavailable && !loading && error && <div className="px-3 py-2 text-[12px] text-red-400">{error}</div>}
        {!unavailable && !loading && !error && !resolved && (
          <div className="px-3 py-2 text-[12px] text-vscode-fg-dim">{t.browser.empty}</div>
        )}
        {!unavailable && !loading && !error && resolved && <BrowserView resolved={resolved} onSurface={handleSurface} />}
      </div>
    </div>
  );
}
