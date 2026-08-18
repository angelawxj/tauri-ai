import { useEffect, useRef, useState } from "react";
import { Check, Code2, Copy, Crosshair, X } from "lucide-react";
import { armSurfacePicker, copyText, formatCapture } from "./browser-element-capture";
import { setNativeSurfaceVisible } from "./browser-surface";
import type { BrowserElementCapture, BrowserToolProps } from "./types";

export default function GrabPageElement({ surfaceRef, disabled }: BrowserToolProps) {
  const [active, setActive] = useState(false);
  const [capture, setCapture] = useState<BrowserElementCapture | null>(null);
  const [copied, setCopied] = useState(false);
  const cleanupRef = useRef<(() => void) | null>(null);
  useEffect(() => () => cleanupRef.current?.(), []);

  const start = () => {
    if (active) { cleanupRef.current?.(); setActive(false); return; }
    const surface = surfaceRef.current;
    if (!surface) return;
    setActive(true);
    cleanupRef.current = armSurfacePicker(surface, (value) => {
      setActive(false);
      setCapture(value);
      void setNativeSurfaceVisible(surface, false);
    });
  };
  const doCopy = async () => {
    if (!capture) return;
    await copyText(formatCapture(capture));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  return <>
    <button type="button" onClick={start} disabled={disabled} aria-pressed={active} title="抓取页面元素" className={`browser-tool-button ${active ? "browser-tool-button-active" : ""}`}><Crosshair size={16} /></button>
    {capture && <div className="browser-tool-sheet" role="dialog" aria-label="抓取结果">
      <div className="browser-tool-sheet-header"><span className="browser-tool-badge">Grab</span><span>检查抓取的页面上下文</span><button onClick={() => { setCapture(null); if (surfaceRef.current) void setNativeSurfaceVisible(surfaceRef.current, true); }}><X size={16} /></button></div>
      <div className="browser-tool-sheet-body">
        {capture.screenshot && <img src={capture.screenshot} alt="选中元素截图" className="browser-tool-preview" />}
        <section><h3>选中的元素</h3><div className="browser-tool-card"><strong className="font-mono">&lt;{capture.target.tagName}&gt;</strong>{capture.target.role && <small>role={capture.target.role}</small>}<p>{capture.target.accessibleName}</p><code>{capture.target.selector}</code><small>{Math.round(capture.target.rectViewport.width)}×{Math.round(capture.target.rectViewport.height)}</small></div></section>
        <section><h3>页面</h3><div className="browser-tool-card"><strong>{capture.page.title || "无标题"}</strong><small>{capture.page.url}</small></div></section>
        <section><h3>HTML</h3><pre className="browser-tool-code"><Code2 size={14} />{capture.target.html}</pre></section>
        {!!capture.nearbyText.length && <section><h3>附近内容</h3><ul className="browser-tool-card">{capture.nearbyText.map((text, index) => <li key={index}>{text}</li>)}</ul></section>}
      </div>
      <div className="browser-tool-sheet-footer"><button onClick={() => { setCapture(null); if (surfaceRef.current) void setNativeSurfaceVisible(surfaceRef.current, true); }}>取消</button><button className="browser-tool-primary" onClick={() => void doCopy()}>{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? "已复制" : "复制上下文"}</button></div>
    </div>}
  </>;
}
