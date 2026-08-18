import { useEffect, useRef } from "react";
import { useI18n } from "../../i18n";
import type { Resolved } from "./browser-render";
import type { BrowserSurface } from "../browser-tools/browser-surface";

interface BrowserViewProps {
  resolved: Resolved;
  onSurface?: (surface: BrowserSurface | null) => void;
}

function NativeBrowserFrame({ url, onSurface }: { url: string; onSurface?: (surface: BrowserSurface | null) => void }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef(`browser-page-${crypto.randomUUID()}`);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !("__TAURI_INTERNALS__" in window)) return;
    let disposed = false;
    let view: import("@tauri-apps/api/webview").Webview | null = null;
    let observer: ResizeObserver | null = null;
    void (async () => {
      const [{ Webview }, { getCurrentWindow }, { LogicalPosition, LogicalSize }] = await Promise.all([
        import("@tauri-apps/api/webview"), import("@tauri-apps/api/window"), import("@tauri-apps/api/dpi"),
      ]);
      const rect = host.getBoundingClientRect();
      view = new Webview(getCurrentWindow(), labelRef.current, { url, x: rect.left, y: rect.top, width: rect.width, height: rect.height, focus: false });
      await new Promise<void>((resolve, reject) => { view!.once("tauri://created", () => resolve()); view!.once("tauri://error", (event) => reject(event.payload)); });
      if (disposed) { await view.close(); return; }
      onSurface?.({ kind: "native", label: labelRef.current });
      const syncBounds = () => { if (!view || !host.isConnected) return; const next = host.getBoundingClientRect(); void view.setPosition(new LogicalPosition(next.left, next.top)); void view.setSize(new LogicalSize(Math.max(1, next.width), Math.max(1, next.height))); };
      observer = new ResizeObserver(syncBounds); observer.observe(host); window.addEventListener("resize", syncBounds); syncBounds();
      host.dataset.nativeResizeListener = "active";
      (host as HTMLElement & { __syncBounds?: () => void }).__syncBounds = syncBounds;
    })().catch((error) => { console.error("native browser creation failed", error); });
    return () => { disposed = true; observer?.disconnect(); const sync = (host as HTMLElement & { __syncBounds?: () => void }).__syncBounds; if (sync) window.removeEventListener("resize", sync); onSurface?.(null); void view?.close(); };
  }, [onSurface, url]);
  return <div ref={hostRef} className="h-full w-full bg-white" />;
}

export default function BrowserView({ resolved, onSurface }: BrowserViewProps) {
  const { t } = useI18n();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (resolved.mode !== "iframe-doc" || !iframeRef.current) return;
    const surface = { kind: "iframe", iframe: iframeRef.current } as const;
    onSurface?.(surface);
    return () => onSurface?.(null);
  }, [onSurface, resolved]);

  if (resolved.mode === "iframe-url") {
    if ("__TAURI_INTERNALS__" in window) return <NativeBrowserFrame url={resolved.url!} onSurface={onSurface} />;
    return <><div className="px-3 py-1 text-[11px] text-vscode-fg-dim">{t.browser.crossOriginNotice}</div><iframe title="browser-url" src={resolved.url} className="h-[calc(100%-22px)] w-full border-0 bg-white" /></>;
  }
  if (resolved.mode === "iframe-doc") {
    return <iframe ref={iframeRef} title="browser-doc" sandbox="allow-scripts allow-same-origin" srcDoc={resolved.html} className="h-full w-full border-0 bg-white" />;
  }
  return <pre className="h-full overflow-y-auto whitespace-pre-wrap break-all px-3 py-2 font-mono text-[12.5px] leading-[1.6] text-vscode-fg">{resolved.text}</pre>;
}
