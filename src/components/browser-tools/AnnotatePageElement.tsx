import { useEffect, useRef, useState } from "react";
import { Check, CircleHelp, MessageSquarePlus, PenLine, Send, Trash2, X } from "lucide-react";
import { armSurfacePicker, copyText, formatCapture, getFrameDocument } from "./browser-element-capture";
import { captureSurface, evaluateSurface, setNativeSurfaceVisible } from "./browser-surface";
import type { BrowserAnnotation, BrowserElementCapture, BrowserToolProps } from "./types";

const INTENTS = [{ id: "change", label: "改变", icon: PenLine }, { id: "question", label: "疑问", icon: CircleHelp }] as const;

const waitForPaint = () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

function annotationMarkdown(items: BrowserAnnotation[]): string {
  return items.map((item) => `## 页面注释 ${item.index}: ${item.intent}\n\n${item.comment}\n\n${formatCapture(item.capture)}`).join("\n\n---\n\n");
}

export default function AnnotatePageElement({ surfaceRef, disabled }: BrowserToolProps) {
  const [active, setActive] = useState(false);
  const [pending, setPending] = useState<BrowserElementCapture | null>(null);
  const [comment, setComment] = useState("");
  const [intent, setIntent] = useState<BrowserAnnotation["intent"]>("change");
  const [items, setItems] = useState<BrowserAnnotation[]>([]);
  const [copied, setCopied] = useState(false);
  const [backdrop, setBackdrop] = useState<string | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  useEffect(() => () => cleanupRef.current?.(), []);

  const start = () => {
    if (active) { cleanupRef.current?.(); setActive(false); return; }
    const surface = surfaceRef.current;
    if (!surface) return;
    setActive(true);
    cleanupRef.current = armSurfacePicker(surface, async (value) => {
      setActive(false);
      if (surface.kind === "native") {
        const image = await captureSurface(surface).catch(() => null);
        if (!image) return;
        setBackdrop(image);
      }
      setPending(value);
      // Paint the screenshot and dialog underneath the native webview first, then
      // hide it. Reversing this order exposes an empty frame for one render.
      await waitForPaint();
      await setNativeSurfaceVisible(surface, false).catch(() => {});
    });
  };
  const finishDialog = async () => {
    const surface = surfaceRef.current;
    // Restore the live native page before removing its screenshot replacement.
    if (surface) await setNativeSurfaceVisible(surface, true).catch(() => {});
    setPending(null); setBackdrop(null); setComment(""); setIntent("change");
  };
  const add = () => {
    if (!pending || !comment.trim()) return;
    const item: BrowserAnnotation = { id: crypto.randomUUID(), index: items.length + 1, comment: comment.trim(), intent, capture: pending };
    setItems((current) => [...current, item]);
    const surface = surfaceRef.current;
    const doc = surface?.kind === "iframe" ? getFrameDocument(surface.iframe) : null;
    if (doc) {
      const marker = doc.createElement("button");
      marker.textContent = String(item.index); marker.title = item.comment; marker.dataset.browserAnnotationId = item.id;
      Object.assign(marker.style, { position: "absolute", zIndex: "2147483645", left: `${item.capture.target.rectPage.x + item.capture.target.rectPage.width - 12}px`, top: `${item.capture.target.rectPage.y - 12}px`, width: "24px", height: "24px", borderRadius: "999px", border: "2px solid white", background: "#6366f1", color: "white", font: "600 12px sans-serif", boxShadow: "0 2px 8px rgba(0,0,0,.3)", cursor: "pointer" });
      doc.body.appendChild(marker);
    } else if (surface?.kind === "native") {
      const payload = JSON.stringify({ id: item.id, index: item.index, comment: item.comment, rect: item.capture.target.rectPage });
      void evaluateSurface(surface, `(()=>{const p=${payload},m=document.createElement('button');m.textContent=String(p.index);m.title=p.comment;m.dataset.browserAnnotationId=p.id;Object.assign(m.style,{position:'absolute',zIndex:'2147483645',left:(p.rect.x+p.rect.width-12)+'px',top:(p.rect.y-12)+'px',width:'24px',height:'24px',borderRadius:'50%',border:'2px solid white',background:'#1683df',color:'white',font:'600 12px sans-serif',boxShadow:'0 2px 8px #0005'});document.body.appendChild(m)})()`);
    }
    void finishDialog();
  };
  const remove = (id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
    const surface = surfaceRef.current;
    if (surface?.kind === "iframe") getFrameDocument(surface.iframe)?.querySelector(`[data-browser-annotation-id="${CSS.escape(id)}"]`)?.remove();
    else if (surface) void evaluateSurface(surface, `document.querySelector('[data-browser-annotation-id="${CSS.escape(id)}"]')?.remove()`);
  };
  const clear = () => { const surface = surfaceRef.current; if (surface?.kind === "iframe") items.forEach((item) => getFrameDocument(surface.iframe)?.querySelector(`[data-browser-annotation-id="${CSS.escape(item.id)}"]`)?.remove()); else if (surface) void evaluateSurface(surface, "document.querySelectorAll('[data-browser-annotation-id]').forEach(x=>x.remove())"); setItems([]); };
  const copyAll = async () => { await copyText(annotationMarkdown(items)); setCopied(true); window.setTimeout(() => setCopied(false), 1400); };
  const cancel = () => { void finishDialog(); };

  const dialogPosition = pending ? (() => {
    const rect = pending.target.rectViewport;
    const dialogWidth = Math.min(528, Math.max(300, pending.page.viewportWidth - 28));
    const left = Math.max(14, Math.min(pending.page.viewportWidth - dialogWidth - 14, rect.x + rect.width - dialogWidth));
    const below = rect.y + rect.height + 10;
    const top = below + 410 < pending.page.viewportHeight ? below : Math.max(10, rect.y - 410);
    return { left, top: top + 36, width: dialogWidth };
  })() : undefined;

  return <>
    <button type="button" onClick={start} disabled={disabled} aria-pressed={active} title="注释页面元素" className={`browser-tool-button ${active ? "browser-tool-button-active" : ""}`}><MessageSquarePlus size={15} />{items.length > 0 && <span className="browser-tool-count">{items.length}</span>}</button>
    {backdrop && <img className="browser-annotation-backdrop" src={backdrop} alt="" aria-hidden="true" />}
    {pending && <div className="browser-annotation-dialog browser-annotation-positioned" style={dialogPosition} role="dialog" aria-label="添加页面注释">
      <div className="browser-annotation-title"><span>{pending.target.text || pending.target.accessibleName || pending.target.tagName}</span><button aria-label="关闭" onClick={cancel}><X size={17} /></button></div>
      <code className="browser-annotation-selector">{pending.target.selector}</code>
      <textarea autoFocus value={comment} onChange={(event) => setComment(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && event.ctrlKey) { event.preventDefault(); add(); } }} placeholder="描述智能体应该在这里改变什么……" maxLength={2000} />
      <label className="browser-annotation-intent-label">意图</label>
      <div className="browser-annotation-intents">{INTENTS.map((option) => { const Icon = option.icon; return <button key={option.id} className={intent === option.id ? "active" : ""} onClick={() => setIntent(option.id)}><Icon size={20} />{option.label}</button>; })}</div>
      <div className="browser-annotation-actions"><button onClick={cancel}>取消</button><button className="browser-tool-primary" disabled={!comment.trim()} onClick={add}><MessageSquarePlus size={19} />添加 <kbd>Ctrl↵</kbd></button></div>
    </div>}
    {items.length > 0 && surfaceRef.current?.kind !== "native" && <div className="browser-annotation-tray">
      <div className="browser-annotation-tray-header"><strong>{items.length} 条页面注释</strong><span><button title="复制全部" onClick={() => void copyAll()}>{copied ? <Check size={14} /> : <Send size={14} />}</button><button title="清空" onClick={clear}><Trash2 size={14} /></button></span></div>
      {items.map((item) => <div key={item.id} className="browser-annotation-item"><span>{item.index}</span><div><strong>{item.intent} · &lt;{item.capture.target.tagName}&gt;</strong><p>{item.comment}</p></div><button onClick={() => remove(item.id)}><X size={13} /></button></div>)}
    </div>}
  </>;
}
