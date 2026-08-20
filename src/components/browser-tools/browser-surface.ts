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
  const script = `(()=>{document.querySelector('[data-tauri-ai-copied]')?.remove();const n=document.createElement('div');n.dataset.tauriAiCopied='';n.innerHTML='<span style="display:grid;place-items:center;width:18px;height:18px;border-radius:50%;background:#1683df;color:white;font-size:12px">✓</span><strong>已复制</strong>';Object.assign(n.style,{position:'fixed',zIndex:'2147483647',left:Math.max(12,Math.min(innerWidth-116,${Math.round(x)}-48))+'px',top:Math.max(12,Math.min(innerHeight-54,${Math.round(y)}+14))+'px',display:'flex',alignItems:'center',gap:'9px',padding:'12px 18px',borderRadius:'24px',background:'rgba(255,255,255,.96)',color:'#202124',font:'15px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',boxShadow:'0 5px 20px rgba(0,0,0,.16)',border:'1px solid rgba(0,0,0,.05)',pointerEvents:'none'});document.documentElement.appendChild(n);setTimeout(()=>n.remove(),1500);return true})()`;
  await evaluateSurface(surface, script);
}
