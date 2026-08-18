import { useEffect, useRef, useState } from "react";
import { Check, MessageSquarePlus, Send, Trash2, X } from "lucide-react";
import { armSurfacePicker, copyText, formatCapture, getFrameDocument } from "./browser-element-capture";
import { evaluateSurface, setNativeSurfaceVisible } from "./browser-surface";
import type { BrowserAnnotation, BrowserElementCapture, BrowserToolProps } from "./types";

const INTENTS = [{ id: "fix", label: "修复" }, { id: "change", label: "修改" }, { id: "question", label: "提问" }, { id: "approve", label: "认可" }] as const;

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
  const cleanupRef = useRef<(() => void) | null>(null);
  useEffect(() => () => cleanupRef.current?.(), []);

  const start = () => {
    if (active) { cleanupRef.current?.(); setActive(false); return; }
    const surface = surfaceRef.current;
    if (!surface) return;
    setActive(true);
    cleanupRef.current = armSurfacePicker(surface, (value) => {
      setActive(false);
      setPending(value);
      void setNativeSurfaceVisible(surface, false);
    });
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
    if (surface) void setNativeSurfaceVisible(surface, true);
    setPending(null); setComment(""); setIntent("change");
  };
  const remove = (id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
    const surface = surfaceRef.current;
    if (surface?.kind === "iframe") getFrameDocument(surface.iframe)?.querySelector(`[data-browser-annotation-id="${CSS.escape(id)}"]`)?.remove();
    else if (surface) void evaluateSurface(surface, `document.querySelector('[data-browser-annotation-id="${CSS.escape(id)}"]')?.remove()`);
  };
  const clear = () => { const surface = surfaceRef.current; if (surface?.kind === "iframe") items.forEach((item) => getFrameDocument(surface.iframe)?.querySelector(`[data-browser-annotation-id="${CSS.escape(item.id)}"]`)?.remove()); else if (surface) void evaluateSurface(surface, "document.querySelectorAll('[data-browser-annotation-id]').forEach(x=>x.remove())"); setItems([]); };
  const copyAll = async () => { await copyText(annotationMarkdown(items)); setCopied(true); window.setTimeout(() => setCopied(false), 1400); };

  return <>
    <button type="button" onClick={start} disabled={disabled} aria-pressed={active} title="注释页面元素" className={`browser-tool-button ${active ? "browser-tool-button-active" : ""}`}><MessageSquarePlus size={15} />{items.length > 0 && <span className="browser-tool-count">{items.length}</span>}</button>
    {pending && <div className="browser-annotation-dialog" role="dialog" aria-label="添加页面注释">
      <div className="browser-annotation-title"><span><span className="browser-tool-badge">{items.length + 1}</span> 添加页面注释</span><button onClick={() => { setPending(null); if (surfaceRef.current) void setNativeSurfaceVisible(surfaceRef.current, true); }}><X size={15} /></button></div>
      <div className="browser-annotation-target"><strong>&lt;{pending.target.tagName}&gt;</strong><code>{pending.target.selector}</code></div>
      <textarea autoFocus value={comment} onChange={(event) => setComment(event.target.value)} placeholder="描述希望修改、修复或确认的内容…" maxLength={2000} />
      <div className="browser-annotation-intents">{INTENTS.map((option) => <button key={option.id} className={intent === option.id ? "active" : ""} onClick={() => setIntent(option.id)}>{option.label}</button>)}</div>
      <div className="browser-annotation-actions"><button onClick={() => { setPending(null); if (surfaceRef.current) void setNativeSurfaceVisible(surfaceRef.current, true); }}>取消</button><button className="browser-tool-primary" disabled={!comment.trim()} onClick={add}><MessageSquarePlus size={14} />添加注释</button></div>
    </div>}
    {items.length > 0 && surfaceRef.current?.kind !== "native" && <div className="browser-annotation-tray">
      <div className="browser-annotation-tray-header"><strong>{items.length} 条页面注释</strong><span><button title="复制全部" onClick={() => void copyAll()}>{copied ? <Check size={14} /> : <Send size={14} />}</button><button title="清空" onClick={clear}><Trash2 size={14} /></button></span></div>
      {items.map((item) => <div key={item.id} className="browser-annotation-item"><span>{item.index}</span><div><strong>{item.intent} · &lt;{item.capture.target.tagName}&gt;</strong><p>{item.comment}</p></div><button onClick={() => remove(item.id)}><X size={13} /></button></div>)}
    </div>}
  </>;
}
