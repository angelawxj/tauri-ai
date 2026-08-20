import type { BrowserElementCapture } from "./types";
import type { BrowserSurface } from "./browser-surface";
import { evaluateSurface } from "./browser-surface";

const SAFE_ATTRIBUTES = new Set(["id", "class", "name", "type", "role", "href", "src", "alt", "title", "placeholder", "for"]);
const SECRET_PATTERN = /(access_token|auth_token|api_key|apikey|client_secret|oauth_state|session_id|sessionid|csrf|secret|password|passwd)/i;
const STYLE_KEYS = ["display", "position", "width", "height", "margin", "padding", "color", "backgroundColor", "border", "borderRadius", "fontFamily", "fontSize", "fontWeight", "lineHeight", "textAlign", "zIndex"] as const;

export function getFrameDocument(iframe: HTMLIFrameElement | null): Document | null {
  try {
    return iframe?.contentDocument ?? null;
  } catch {
    return null;
  }
}

function selectorPart(element: Element): string {
  const tag = element.tagName.toLowerCase();
  if (element.id) return `${tag}#${CSS.escape(element.id)}`;
  const classes = [...element.classList].slice(0, 3).map((name) => `.${CSS.escape(name)}`).join("");
  const parent = element.parentElement;
  if (!parent) return tag + classes;
  const siblings = [...parent.children].filter((child) => child.tagName === element.tagName);
  return `${tag}${classes}${siblings.length > 1 ? `:nth-of-type(${siblings.indexOf(element) + 1})` : ""}`;
}

function buildSelector(element: Element): string {
  const parts: string[] = [];
  let current: Element | null = element;
  while (current && parts.length < 8) {
    parts.unshift(selectorPart(current));
    if (current.id) break;
    current = current.parentElement;
  }
  return parts.join(" > ").slice(0, 700);
}

function accessibleName(element: Element): string | null {
  const labelledBy = element.getAttribute("aria-labelledby");
  const doc = element.ownerDocument;
  const label = labelledBy ? labelledBy.split(/\s+/).map((id) => doc.getElementById(id)?.textContent ?? "").join(" ").trim() : "";
  return element.getAttribute("aria-label") || label || element.getAttribute("alt") || element.getAttribute("title") || element.textContent?.trim().slice(0, 200) || null;
}

async function elementScreenshot(element: HTMLElement): Promise<string | null> {
  const rect = element.getBoundingClientRect();
  if (rect.width < 1 || rect.height < 1 || rect.width > 4096 || rect.height > 4096) return null;
  try {
    const clone = element.cloneNode(true) as HTMLElement;
    const style = getComputedStyle(element);
    clone.style.margin = "0";
    clone.style.width = `${rect.width}px`;
    clone.style.height = `${rect.height}px`;
    clone.style.font = style.font;
    clone.style.color = style.color;
    clone.style.background = style.background;
    const markup = new XMLSerializer().serializeToString(clone);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.ceil(rect.width)}" height="${Math.ceil(rect.height)}"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml">${markup}</div></foreignObject></svg>`;
    const image = new Image();
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(rect.width * devicePixelRatio);
    canvas.height = Math.ceil(rect.height * devicePixelRatio);
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.scale(devicePixelRatio, devicePixelRatio);
    context.drawImage(image, 0, 0);
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}

export async function captureElement(element: HTMLElement): Promise<BrowserElementCapture> {
  const doc = element.ownerDocument;
  const win = doc.defaultView!;
  const rect = element.getBoundingClientRect();
  const attributes: Record<string, string> = {};
  for (const attribute of [...element.attributes]) {
    if (SAFE_ATTRIBUTES.has(attribute.name) || attribute.name.startsWith("aria-")) {
      attributes[attribute.name] = SECRET_PATTERN.test(attribute.name) || SECRET_PATTERN.test(attribute.value) ? "[redacted]" : attribute.value.slice(0, 500);
    }
  }
  const computed = win.getComputedStyle(element);
  const styles = Object.fromEntries(STYLE_KEYS.map((key) => [key, computed[key]]));
  const nearbyText = [...(element.parentElement?.children ?? [])]
    .filter((child) => child !== element)
    .map((child) => child.textContent?.trim().replace(/\s+/g, " ").slice(0, 200) ?? "")
    .filter(Boolean)
    .slice(0, 10);
  const ancestorPath: string[] = [];
  let ancestor = element.parentElement;
  while (ancestor && ancestorPath.length < 10) {
    ancestorPath.unshift(selectorPart(ancestor));
    ancestor = ancestor.parentElement;
  }
  return {
    page: { url: win.location.href, title: doc.title, viewportWidth: win.innerWidth, viewportHeight: win.innerHeight, scrollX: win.scrollX, scrollY: win.scrollY, capturedAt: new Date().toISOString() },
    target: {
      tagName: element.tagName.toLowerCase(), selector: buildSelector(element), text: element.textContent?.trim().replace(/\s+/g, " ").slice(0, 200) ?? "",
      html: element.outerHTML.slice(0, 4096), attributes, role: element.getAttribute("role"), accessibleName: accessibleName(element),
      rectViewport: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      rectPage: { x: rect.x + win.scrollX, y: rect.y + win.scrollY, width: rect.width, height: rect.height }, styles,
    },
    nearbyText, ancestorPath, screenshot: await elementScreenshot(element),
  };
}

export function formatCapture(capture: BrowserElementCapture): string {
  const styleLines = Object.entries(capture.target.styles).filter(([, value]) => value && value !== "static" && value !== "rgba(0, 0, 0, 0)");
  return [
    `Attached browser context from ${capture.page.url}`, "", "Selected element:", capture.target.tagName,
    capture.target.accessibleName ? `Accessible name: "${capture.target.accessibleName}"` : "",
    capture.target.role ? `Role: ${capture.target.role}` : "", `Selector: ${capture.target.selector}`,
    `Dimensions: ${Math.round(capture.target.rectViewport.width)}x${Math.round(capture.target.rectViewport.height)}`, "",
    capture.target.text ? `Text content:\n${capture.target.text}\n` : "",
    capture.nearbyText.length ? `Nearby context:\n${capture.nearbyText.map((text) => `- ${text}`).join("\n")}\n` : "",
    styleLines.length ? `Computed styles:\n${styleLines.map(([key, value]) => `  ${key}: ${value}`).join("\n")}\n` : "",
    `HTML:\n${capture.target.html}`, capture.ancestorPath.length ? `\nAncestor path: ${capture.ancestorPath.join(" > ")}` : "",
  ].filter(Boolean).join("\n").trim();
}

export function armElementPicker(doc: Document, onSelect: (element: HTMLElement) => void): () => void {
  const overlay = doc.createElement("div");
  overlay.setAttribute("data-orca-element-picker", "");
  Object.assign(overlay.style, { position: "fixed", zIndex: "2147483646", pointerEvents: "none", border: "2px solid #6366f1", background: "rgba(99,102,241,.12)", borderRadius: "3px", transition: "all 40ms linear", boxSizing: "border-box" });
  const label = doc.createElement("div");
  Object.assign(label.style, { position: "absolute", left: "-2px", bottom: "100%", padding: "3px 6px", background: "#4f46e5", color: "white", font: "11px ui-monospace,monospace", whiteSpace: "nowrap", borderRadius: "3px 3px 0 0" });
  overlay.appendChild(label);
  doc.documentElement.appendChild(overlay);
  const move = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    if (!target || target === overlay || overlay.contains(target)) return;
    const rect = target.getBoundingClientRect();
    Object.assign(overlay.style, { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` });
    label.textContent = `${target.tagName.toLowerCase()}  ${Math.round(rect.width)}×${Math.round(rect.height)}`;
  };
  const click = (event: MouseEvent) => {
    event.preventDefault(); event.stopPropagation();
    const target = event.target as HTMLElement;
    cleanup();
    onSelect(target);
  };
  const key = (event: KeyboardEvent) => { if (event.key === "Escape") cleanup(); };
  const cleanup = () => { overlay.remove(); doc.removeEventListener("mousemove", move, true); doc.removeEventListener("click", click, true); doc.removeEventListener("keydown", key, true); };
  doc.addEventListener("mousemove", move, true); doc.addEventListener("click", click, true); doc.addEventListener("keydown", key, true);
  return cleanup;
}

const NATIVE_PICKER_SCRIPT = String.raw`(() => {
  window.__tauriAiPickedElement = null;
  document.querySelector('[data-tauri-ai-picker]')?.remove();
  const box=document.createElement('div'); box.dataset.tauriAiPicker='';
  Object.assign(box.style,{position:'fixed',zIndex:'2147483647',pointerEvents:'none',border:'2px solid #1683df',background:'rgba(22,131,223,.10)',boxSizing:'border-box'});
  const badge=document.createElement('div'); Object.assign(badge.style,{position:'absolute',left:'-2px',bottom:'100%',padding:'3px 6px',background:'#1683df',color:'#fff',font:'11px monospace',whiteSpace:'nowrap'}); box.appendChild(badge); document.documentElement.appendChild(box);
  const selector=(el)=>{const out=[];for(let node=el;node&&out.length<8;node=node.parentElement){let part=node.tagName.toLowerCase();if(node.id){part+='#'+CSS.escape(node.id);out.unshift(part);break}const cs=[...node.classList].slice(0,3).map(x=>'.'+CSS.escape(x)).join('');part+=cs;const p=node.parentElement;if(p){const same=[...p.children].filter(x=>x.tagName===node.tagName);if(same.length>1)part+=':nth-of-type('+(same.indexOf(node)+1)+')'}out.unshift(part)}return out.join(' > ')};
  const cleanup=()=>{box.remove();document.removeEventListener('mousemove',move,true);document.removeEventListener('click',click,true);document.removeEventListener('keydown',key,true)};
  const move=(e)=>{const t=e.target;if(!t||t===box||box.contains(t))return;const r=t.getBoundingClientRect();Object.assign(box.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px'});badge.textContent=t.tagName.toLowerCase()+'  '+Math.round(r.width)+'×'+Math.round(r.height)};
  const click=(e)=>{e.preventDefault();e.stopPropagation();const t=e.target,r=t.getBoundingClientRect(),s=getComputedStyle(t);const attrs={};for(const a of t.attributes){if(['id','class','name','type','role','href','src','alt','title','placeholder','for'].includes(a.name)||a.name.startsWith('aria-'))attrs[a.name]=/(token|secret|password|session|api.?key)/i.test(a.name+a.value)?'[redacted]':a.value.slice(0,500)}const near=[...(t.parentElement?.children||[])].filter(x=>x!==t).map(x=>(x.textContent||'').trim().replace(/\s+/g,' ').slice(0,200)).filter(Boolean).slice(0,10);const ancestors=[];for(let p=t.parentElement;p&&ancestors.length<10;p=p.parentElement)ancestors.unshift(p.tagName.toLowerCase());window.__tauriAiPickedElement={page:{url:location.href,title:document.title,viewportWidth:innerWidth,viewportHeight:innerHeight,scrollX,scrollY,capturedAt:new Date().toISOString()},target:{tagName:t.tagName.toLowerCase(),selector:selector(t),text:(t.textContent||'').trim().replace(/\s+/g,' ').slice(0,200),html:t.outerHTML.slice(0,4096),attributes:attrs,role:t.getAttribute('role'),accessibleName:t.getAttribute('aria-label')||t.getAttribute('alt')||t.getAttribute('title')||(t.textContent||'').trim().slice(0,200)||null,rectViewport:{x:r.x,y:r.y,width:r.width,height:r.height},rectPage:{x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height},styles:{display:s.display,position:s.position,width:s.width,height:s.height,margin:s.margin,padding:s.padding,color:s.color,backgroundColor:s.backgroundColor,border:s.border,borderRadius:s.borderRadius,fontFamily:s.fontFamily,fontSize:s.fontSize,fontWeight:s.fontWeight,lineHeight:s.lineHeight,textAlign:s.textAlign,zIndex:s.zIndex}},nearbyText:near,ancestorPath:ancestors,screenshot:null};cleanup()};
  const key=(e)=>{if(e.key==='Escape'){window.__tauriAiPickedElement={cancelled:true};cleanup()}};document.addEventListener('mousemove',move,true);document.addEventListener('click',click,true);document.addEventListener('keydown',key,true);return true;
})()`;

export function armSurfacePicker(surface: BrowserSurface, onSelect: (capture: BrowserElementCapture) => void): () => void {
  if (surface.kind === "iframe") {
    const doc = getFrameDocument(surface.iframe);
    return doc ? armElementPicker(doc, (element) => void captureElement(element).then(onSelect)) : () => {};
  }
  let cancelled = false;
  void evaluateSurface(surface, NATIVE_PICKER_SCRIPT).then(async () => {
    while (!cancelled) {
      await new Promise((resolve) => window.setTimeout(resolve, 120));
      let value: BrowserElementCapture | { cancelled: true } | null;
      try {
        value = await evaluateSurface(surface, "window.__tauriAiPickedElement || null");
      } catch {
        // Navigation/unmount can remove the native webview while the picker polls.
        break;
      }
      if (value) { if (!("cancelled" in value)) onSelect(value); break; }
    }
  }).catch(() => {});
  return () => { cancelled = true; void evaluateSurface(surface, "document.querySelector('[data-tauri-ai-picker]')?.remove();window.__tauriAiPickedElement={cancelled:true}").catch(() => {}); };
}

export async function copyText(text: string): Promise<void> {
  try {
    if (document.hasFocus()) {
      await navigator.clipboard.writeText(text);
      return;
    }
    if ("__TAURI_INTERNALS__" in window) {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      await getCurrentWindow().setFocus();
      await navigator.clipboard.writeText(text);
      return;
    }
  } catch {
    // Fall through to the synchronous compatibility path below.
  }
  const input = document.createElement("textarea");
  input.value = text;
  input.setAttribute("readonly", "");
  Object.assign(input.style, { position: "fixed", left: "-9999px", top: "0", opacity: "0" });
  document.body.appendChild(input);
  input.select();
  document.execCommand("copy");
  input.remove();
}
