import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUpRight, Check, Circle, Eraser, Highlighter, Paintbrush, Pencil, Redo2, Square, Type, Undo2, X } from "lucide-react";
import { captureSurface, setNativeSurfaceVisible } from "./browser-surface";
import type { BrowserToolProps } from "./types";

type Tool = "pen" | "highlight" | "arrow" | "rect" | "ellipse" | "text";
type Point = { x: number; y: number };
type Shape = { tool: Tool; color: string; width: number; from: Point; to: Point; points: Point[]; text?: string };
const COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#111827", "#ffffff"];

function drawShape(context: CanvasRenderingContext2D, shape: Shape) {
  context.save(); context.strokeStyle = shape.color; context.fillStyle = shape.color; context.lineWidth = shape.tool === "highlight" ? shape.width * 4 : shape.width; context.lineCap = "round"; context.lineJoin = "round"; context.globalAlpha = shape.tool === "highlight" ? .35 : 1;
  if (shape.tool === "pen" || shape.tool === "highlight") { context.beginPath(); shape.points.forEach((point, index) => index ? context.lineTo(point.x, point.y) : context.moveTo(point.x, point.y)); context.stroke(); }
  if (shape.tool === "rect") { context.strokeRect(shape.from.x, shape.from.y, shape.to.x - shape.from.x, shape.to.y - shape.from.y); }
  if (shape.tool === "ellipse") { context.beginPath(); context.ellipse((shape.from.x + shape.to.x) / 2, (shape.from.y + shape.to.y) / 2, Math.abs(shape.to.x - shape.from.x) / 2, Math.abs(shape.to.y - shape.from.y) / 2, 0, 0, Math.PI * 2); context.stroke(); }
  if (shape.tool === "arrow") { const angle = Math.atan2(shape.to.y - shape.from.y, shape.to.x - shape.from.x); const head = Math.max(10, shape.width * 3.5); context.beginPath(); context.moveTo(shape.from.x, shape.from.y); context.lineTo(shape.to.x, shape.to.y); context.lineTo(shape.to.x - head * Math.cos(angle - .45), shape.to.y - head * Math.sin(angle - .45)); context.moveTo(shape.to.x, shape.to.y); context.lineTo(shape.to.x - head * Math.cos(angle + .45), shape.to.y - head * Math.sin(angle + .45)); context.stroke(); }
  if (shape.tool === "text" && shape.text) { context.font = `600 ${Math.max(14, shape.width * 5)}px Geist, sans-serif`; context.fillText(shape.text, shape.from.x, shape.from.y); }
  context.restore();
}

export default function DrawOnScreenshot({ surfaceRef, disabled }: BrowserToolProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null); const imageRef = useRef<HTMLImageElement>(null);
  const [base, setBase] = useState<string | null>(null); const [tool, setTool] = useState<Tool>("pen"); const [color, setColor] = useState(COLORS[0]); const [width, setWidth] = useState(4); const [shapes, setShapes] = useState<Shape[]>([]); const [future, setFuture] = useState<Shape[]>([]); const current = useRef<Shape | null>(null);
  const render = useCallback((preview?: Shape | null) => { const canvas = canvasRef.current; if (!canvas) return; const rect = canvas.getBoundingClientRect(); const dpr = devicePixelRatio; if (canvas.width !== Math.round(rect.width * dpr) || canvas.height !== Math.round(rect.height * dpr)) { canvas.width = Math.round(rect.width * dpr); canvas.height = Math.round(rect.height * dpr); } const context = canvas.getContext("2d")!; context.setTransform(dpr, 0, 0, dpr, 0, 0); context.clearRect(0, 0, rect.width, rect.height); shapes.forEach((shape) => drawShape(context, shape)); if (preview) drawShape(context, preview); }, [shapes]);
  useEffect(() => { render(current.current); }, [render]);
  const start = async () => { const surface = surfaceRef.current; if (!surface) return; const image = await captureSurface(surface); if (image) { await setNativeSurfaceVisible(surface, false); setBase(image); setShapes([]); setFuture([]); } };
  const point = (event: React.PointerEvent): Point => { const rect = event.currentTarget.getBoundingClientRect(); return { x: event.clientX - rect.left, y: event.clientY - rect.top }; };
  const down = (event: React.PointerEvent<HTMLCanvasElement>) => { if (tool === "text") { const text = window.prompt("输入注释文字"); if (text) { const at = point(event); setShapes((value) => [...value, { tool, color, width, from: at, to: at, points: [], text }]); setFuture([]); } return; } const at = point(event); current.current = { tool, color, width, from: at, to: at, points: [at] }; event.currentTarget.setPointerCapture(event.pointerId); };
  const move = (event: React.PointerEvent<HTMLCanvasElement>) => { if (!current.current) return; const next = point(event); current.current = { ...current.current, to: next, points: [...current.current.points, next] }; render(current.current); };
  const up = () => { if (!current.current) return; setShapes((value) => [...value, current.current!]); current.current = null; setFuture([]); };
  const close = () => { setBase(null); if (surfaceRef.current) void setNativeSurfaceVisible(surfaceRef.current, true); };
  const finish = async () => { const canvas = canvasRef.current, image = imageRef.current; if (!canvas || !image) return; const output = document.createElement("canvas"); output.width = canvas.width; output.height = canvas.height; const context = output.getContext("2d")!; context.drawImage(image, 0, 0, output.width, output.height); context.drawImage(canvas, 0, 0); const blob = await new Promise<Blob | null>((resolve) => output.toBlob(resolve, "image/png")); if (blob && navigator.clipboard?.write) { try { await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]); } catch { const link = document.createElement("a"); link.download = `browser-markup-${Date.now()}.png`; link.href = output.toDataURL("image/png"); link.click(); } } close(); };
  const tools: [Tool, React.ReactNode, string][] = [["pen", <Pencil size={16} />, "画笔"], ["highlight", <Highlighter size={16} />, "荧光笔"], ["arrow", <ArrowUpRight size={16} />, "箭头"], ["rect", <Square size={16} />, "矩形"], ["ellipse", <Circle size={16} />, "椭圆"], ["text", <Type size={16} />, "文字"]];
  return <>
    <button type="button" onClick={() => void start()} disabled={disabled} title="在截图上绘制" className="browser-tool-button"><Paintbrush size={16} /></button>
    {base && <div className="browser-markup-overlay">
      <img ref={imageRef} src={base} alt="页面截图" />
      <canvas ref={canvasRef} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} />
      <div className="browser-markup-toolbar">{tools.map(([id, icon, label]) => <button key={id} title={label} className={tool === id ? "active" : ""} onClick={() => setTool(id)}>{icon}</button>)}<i />
        <div className="browser-color-row">{COLORS.map((value) => <button key={value} aria-label={value} className={color === value ? "active" : ""} style={{ background: value }} onClick={() => setColor(value)} />)}</div>
        {[2, 4, 8].map((value) => <button key={value} title={`${value}px`} className={width === value ? "active" : ""} onClick={() => setWidth(value)}><span className="browser-width-dot" style={{ width: value + 2, height: value + 2 }} /></button>)}<i />
        <button title="撤销" disabled={!shapes.length} onClick={() => { const last = shapes[shapes.length - 1]; if (last) { setShapes(shapes.slice(0, -1)); setFuture([last, ...future]); } }}><Undo2 size={16} /></button>
        <button title="重做" disabled={!future.length} onClick={() => { const next = future[0]; if (next) { setShapes([...shapes, next]); setFuture(future.slice(1)); } }}><Redo2 size={16} /></button>
        <button title="清空" disabled={!shapes.length} onClick={() => { setFuture([...shapes].reverse()); setShapes([]); }}><Eraser size={16} /></button>
      </div>
      <div className="browser-markup-actions"><span>在页面上绘制，然后复制标注截图。</span><button onClick={close}><X size={15} />取消</button><button className="browser-tool-primary" onClick={() => void finish()}><Check size={15} />复制标注</button></div>
    </div>}
  </>;
}
