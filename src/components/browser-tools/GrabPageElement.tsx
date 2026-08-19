import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Crosshair, Image } from "lucide-react";
import { armSurfacePicker, copyText, formatCapture } from "./browser-element-capture";
import { captureSelectionScreenshot } from "./browser-surface";
import type { BrowserElementCapture, BrowserToolProps } from "./types";

type GrabToastState = { x: number; y: number; below: boolean; screenshot: string | null; message: "Copied" | "Screenshotted" | "Copy failed"; delay: number };

function GrabToast({ toast, onDismiss, onUpdate }: { toast: GrabToastState; onDismiss: () => void; onUpdate: (message: GrabToastState["message"], delay: number) => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => { if (menuOpen) return; const timer = window.setTimeout(onDismiss, toast.delay); return () => window.clearTimeout(timer); }, [menuOpen, onDismiss, toast.delay]);
  const copyScreenshot = async () => { if (!toast.screenshot) return; try { const blob = await (await fetch(toast.screenshot)).blob(); await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]); setMenuOpen(false); onUpdate("Screenshotted", 1200); } catch { setMenuOpen(false); onUpdate("Copy failed", 1500); } };
  useEffect(() => { const keydown = (event: KeyboardEvent) => { if (event.key === "Escape" && menuOpen) setMenuOpen(false); if (event.key.toLowerCase() === "s" && menuOpen) { event.preventDefault(); void copyScreenshot(); } }; document.addEventListener("keydown", keydown, true); return () => document.removeEventListener("keydown", keydown, true); });
  return <div className="fixed z-[2147483647] flex items-center" style={{ left: toast.x, top: toast.y, transform: toast.below ? "translate(-50%, 8px)" : "translate(-50%, -100%) translateY(-8px)", flexDirection: toast.below ? "column" : "column-reverse" }}>
    <div className="h-2 w-4 shrink-0 bg-white" style={{ clipPath: toast.below ? "polygon(50% 0%, 0% 100%, 100% 100%)" : "polygon(0% 0%, 100% 0%, 50% 100%)" }} />
    <div className="flex items-center gap-1.5 rounded-full bg-white py-1.5 pl-3 pr-1.5 text-gray-900 shadow-lg">
      <CheckCircle2 size={16} className="fill-blue-600 text-white" />
      <span className="text-sm font-semibold">{toast.message}</span>
      {toast.screenshot && <div className="relative"><button type="button" aria-label="More capture actions" onClick={() => setMenuOpen((open) => !open)} className="flex size-6 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-black/10 hover:text-gray-700"><span className="text-sm font-bold leading-none">···</span></button>
        {menuOpen && <div className="absolute -left-3 top-9 z-10 w-[264px] rounded-[17px] border-2 border-gray-200 bg-white p-1 shadow-xl"><button type="button" onClick={() => void copyScreenshot()} className="flex h-10 w-full items-center gap-2 rounded-[11px] px-3 text-left text-[16px] text-gray-700 hover:bg-[#f3f1f1]"><Image size={18} className="text-gray-500" /><span className="flex-1">复制截图</span><kbd className="border-0 bg-transparent p-0 text-[15px] text-gray-500">S</kbd></button></div>}
      </div>}
    </div>
  </div>;
}

export default function GrabPageElement({ surfaceRef, disabled, getSurfaceBounds }: BrowserToolProps) {
  const [active, setActive] = useState(false);
  const [toast, setToast] = useState<GrabToastState | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  useEffect(() => () => cleanupRef.current?.(), []);
  const start = () => {
    if (active) { cleanupRef.current?.(); setActive(false); return; }
    const surface = surfaceRef.current; if (!surface) return;
    setActive(true);
    cleanupRef.current = armSurfacePicker(surface, (capture: BrowserElementCapture) => {
      setActive(false);
      void (async () => {
        const screenshot = capture.screenshot ?? await captureSelectionScreenshot(surface, capture.target.rectViewport, { width: capture.page.viewportWidth, height: capture.page.viewportHeight });
        const completedCapture = screenshot ? { ...capture, screenshot } : capture;
        await copyText(formatCapture(completedCapture));
        const rect = capture.target.rectViewport, bounds = getSurfaceBounds?.();
        const x = (bounds?.left ?? 0) + rect.x + rect.width / 2, bottom = (bounds?.top ?? 0) + rect.y + rect.height, top = (bounds?.top ?? 0) + rect.y;
        const below = bottom + 52 < (bounds?.bottom ?? window.innerHeight);
        setToast({ x, y: below ? bottom : top, below, screenshot: completedCapture.screenshot, message: "Copied", delay: 2000 });
      })();
    });
  };
  return <>
    <button type="button" onClick={start} disabled={disabled} aria-pressed={active} title="抓取页面元素" className={`browser-tool-button ${active ? "browser-tool-button-active" : ""}`}><Crosshair size={16} /></button>
    {toast && <GrabToast toast={toast} onDismiss={() => setToast(null)} onUpdate={(message, delay) => setToast((current) => current ? { ...current, message, delay } : null)} />}
  </>;
}
