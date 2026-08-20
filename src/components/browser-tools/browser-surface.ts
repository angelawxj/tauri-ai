import { invoke } from "@tauri-apps/api/core";

export type BrowserSurface =
  | { kind: "iframe"; iframe: HTMLIFrameElement }
  | { kind: "native"; label: string };

export async function evaluateSurface<T>(surface: BrowserSurface, script: string): Promise<T> {
  if (surface.kind === "iframe") {
    const win = surface.iframe.contentWindow;
    if (!win) throw new Error("页面尚未加载");
    return (win as unknown as { eval: (source: string) => T }).eval(script);
  }
  const raw = await invoke<string>("browser_eval", { label: surface.label, script });
  let value: unknown = raw;
  for (let index = 0; index < 2 && typeof value === "string"; index += 1) {
    try { value = JSON.parse(value); } catch { break; }
  }
  return value as T;
}

export async function captureSurface(surface: BrowserSurface): Promise<string> {
  if (surface.kind === "native") {
    return invoke<string>("browser_capture_screenshot", { label: surface.label });
  }
  const doc = surface.iframe.contentDocument;
  if (!doc) throw new Error("页面尚未加载");
  const width = surface.iframe.clientWidth, height = surface.iframe.clientHeight;
  const clone = doc.documentElement.cloneNode(true) as HTMLElement;
  clone.querySelectorAll("script,[data-orca-element-picker],[data-browser-annotation-id]").forEach((node) => node.remove());
  clone.style.width = `${width}px`; clone.style.height = `${height}px`; clone.style.overflow = "hidden";
  const html = new XMLSerializer().serializeToString(clone);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml">${html}</div></foreignObject></svg>`;
  const image = new Image(); image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`; await image.decode();
  const canvas = document.createElement("canvas"); canvas.width = width * devicePixelRatio; canvas.height = height * devicePixelRatio;
  const context = canvas.getContext("2d"); if (!context) throw new Error("无法创建截图");
  context.scale(devicePixelRatio, devicePixelRatio); context.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL("image/png");
}

export async function setNativeSurfaceVisible(surface: BrowserSurface, visible: boolean): Promise<void> {
  if (surface.kind !== "native") return;
  const { Webview } = await import("@tauri-apps/api/webview");
  const view = await Webview.getByLabel(surface.label);
  if (view) await (visible ? view.show() : view.hide());
}

export async function showSurfaceCopied(surface: BrowserSurface, x: number, y: number): Promise<void> {
  const script = `(()=>{document.querySelectorAll('[data-tauri-ai-copied]').forEach(e=>e.remove());const root=document.createElement('div');root.dataset.tauriAiCopied='';const left=Math.max(12,Math.min(innerWidth-218,${Math.round(x)}-68)),top=Math.max(12,Math.min(innerHeight-92,${Math.round(y)}+10));root.innerHTML='<div class="tauri-copied-toast"><span>✓</span><strong>Copied</strong><button type="button" aria-label="更多操作">•••</button></div><div class="tauri-copy-shot"><span>▧</span><strong>复制截图</strong><kbd>S</kbd></div>';Object.assign(root.style,{position:'fixed',zIndex:'2147483647',left:left+'px',top:top+'px',font:'12px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',color:'#202124'});const style=document.createElement('style');style.textContent='[data-tauri-ai-copied] .tauri-copied-toast{display:flex;align-items:center;gap:7px;width:max-content;padding:7px 8px 7px 13px;border:1px solid #eee;border-radius:22px;background:#fff;box-shadow:0 6px 20px #0002}[data-tauri-ai-copied] .tauri-copied-toast span{display:grid;place-items:center;width:15px;height:15px;border-radius:50%;background:#1877e8;color:#fff;font-size:10px}[data-tauri-ai-copied] .tauri-copied-toast button{margin-left:4px;padding:2px 5px;border:0;border-radius:6px;color:#777;background:transparent;font:bold 11px inherit;letter-spacing:1px;cursor:pointer}[data-tauri-ai-copied] .tauri-copied-toast button:hover,[data-tauri-ai-copied].open .tauri-copied-toast button{background:#eee}[data-tauri-ai-copied] .tauri-copy-shot{display:none;grid-template-columns:18px 1fr 16px;align-items:center;gap:5px;width:210px;margin:2px 0 0 68px;padding:7px 9px;border:3px solid #eee;border-radius:11px;background:#fff;box-shadow:0 5px 16px #0002}[data-tauri-ai-copied].open .tauri-copy-shot{display:grid}[data-tauri-ai-copied] .tauri-copy-shot span{font-size:16px;color:#777}[data-tauri-ai-copied] .tauri-copy-shot kbd{color:#888;font:600 11px inherit}';root.appendChild(style);root.querySelector('.tauri-copied-toast button').addEventListener('click',e=>{e.preventDefault();e.stopPropagation();root.classList.toggle('open')});document.documentElement.appendChild(root);setTimeout(()=>root.remove(),5000);return true})()`;
  await evaluateSurface(surface, script);
}
