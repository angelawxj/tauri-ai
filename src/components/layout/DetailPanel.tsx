import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import TabBar, { type TabDef } from "./TabBar";
import { IconCompass, IconFile, IconFiles, IconGitBranch, IconSparkle, IconTerminal } from "../icons";
import { Explorer } from "../../features/explorer";
import { SourceControl } from "../../features/source-control";
import { useI18n } from "../../i18n";
import Browser, { type BrowserSource, type PoppedBrowser } from "./Browser";
import ArtifactList from "./ArtifactList";
import { isRenderableName } from "./artifact-kind";
import type { Artifact } from "./types";

interface DetailPanelProps {
  onOpenDiff?: (path: string, staged: boolean, commitHash?: string) => void;
  onOpenFile?: (path: string) => void;
  /** HTML/Markdown artifacts from the chat; opens/loads them in the 浏览器 tab. */
  browserArtifact?: Artifact | null;
  /** 对话里生成过的全部产物，供「产物」Tab 展示。 */
  artifacts: Artifact[];
  /** 「产物」Tab 里点了一个非 HTML/Markdown 的产物，请求宿主在 MainArea 打开它。 */
  onOpenTextArtifact: (artifact: Artifact) => void;
  /** 浏览器 Tab 里点了"在中间区域打开"，请求宿主在 MainArea 开一个宽屏标签页。 */
  onPopOutBrowser: (popped: PoppedBrowser) => void;
  /** Remount key for the explorer/source-control panels; change it when the active project switches. */
  projectKey?: string;
  /** 当前项目名，展示在资源管理器头部（对齐 Orca 的 FileExplorerToolbar 显示 repoName 的方式）。 */
  projectName?: string;
  projectPath?: string;
}

const WIDTH_STORAGE_KEY = "detailPanelWidth";
const DEFAULT_WIDTH = 380;
const MIN_WIDTH = 280;
const MAX_WIDTH = 640;

function readStoredWidth(): number {
  const raw = Number(localStorage.getItem(WIDTH_STORAGE_KEY));
  if (!Number.isFinite(raw) || raw <= 0) return DEFAULT_WIDTH;
  return Math.min(Math.max(raw, MIN_WIDTH), MAX_WIDTH);
}

export default function DetailPanel({ onOpenDiff, onOpenFile, browserArtifact, artifacts, onOpenTextArtifact, onPopOutBrowser, projectKey, projectName, projectPath }: DetailPanelProps) {
  const { t } = useI18n();
  const [activeId, setActiveId] = useState("explorer");
  const [width, setWidth] = useState(readStoredWidth);
  const [browserSource, setBrowserSource] = useState<BrowserSource | null>(null);
  const dragState = useRef<{ startX: number; startWidth: number } | null>(null);

  const TABS: TabDef[] = [
    { id: "explorer", label: t.tabs.explorer, icon: IconFiles },
    { id: "source-control", label: t.tabs.sourceControl, icon: IconGitBranch },
    { id: "browser", label: t.tabs.browser, icon: IconCompass },
    { id: "artifacts", label: t.tabs.artifacts, icon: IconSparkle },
    { id: "files", label: t.tabs.files, icon: IconFile, disabled: true },
    { id: "terminal", label: t.tabs.terminal, icon: IconTerminal, disabled: true },
  ];

  // 「产物」Tab 里点一条：HTML/Markdown 直接在本面板的浏览器 Tab 渲染；
  // 其它类型冒泡给宿主，在 MainArea 打开只读标签页。
  const handleOpenArtifact = (artifact: Artifact) => {
    if (isRenderableName(artifact.name)) {
      setBrowserSource({ kind: "artifact", name: artifact.name, content: artifact.content });
      setActiveId("browser");
      return;
    }
    onOpenTextArtifact(artifact);
  };

  useEffect(() => {
    localStorage.setItem(WIDTH_STORAGE_KEY, String(width));
  }, [width]);

  // 资源管理器点 html/md 文件时，改到浏览器 Tab 渲染，而不是走原来的纯文本文件预览
  const handleExplorerOpenFile = (path: string) => {
    if (isRenderableName(path)) {
      setBrowserSource({ kind: "path", path });
      setActiveId("browser");
      return;
    }
    onOpenFile?.(path);
  };

  // 对话区点了可渲染的产物卡片，切到浏览器 Tab 并加载内容
  useEffect(() => {
    if (!browserArtifact) return;
    setBrowserSource({ kind: "artifact", name: browserArtifact.name, content: browserArtifact.content });
    setActiveId("browser");
  }, [browserArtifact]);

  const onDragStart = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      dragState.current = { startX: e.clientX, startWidth: width };

      const onMove = (ev: PointerEvent) => {
        if (!dragState.current) return;
        // 手柄在面板左边缘：鼠标左移(负值)意味着面板变宽
        const delta = dragState.current.startX - ev.clientX;
        setWidth(Math.min(Math.max(dragState.current.startWidth + delta, MIN_WIDTH), MAX_WIDTH));
      };
      const onUp = () => {
        dragState.current = null;
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [width],
  );

  return (
    <aside className="flex h-full shrink-0" style={{ width }}>
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label={t.detailPanel.resizePanel}
        tabIndex={0}
        onPointerDown={onDragStart}
        className="h-full w-[3px] shrink-0 cursor-col-resize bg-transparent hover:bg-vscode-accent focus:bg-vscode-accent focus:outline-none"
      />
      <div className="flex h-full min-w-0 flex-1 flex-col border-l border-vscode-border bg-vscode-panel">
        <TabBar tabs={TABS} activeId={activeId} onChange={setActiveId} />
        <div className="min-h-0 flex-1">
          {activeId === "explorer" && <Explorer key={projectKey} projectName={projectName} projectPath={projectPath} onOpenFile={handleExplorerOpenFile} />}
          {activeId === "source-control" && <SourceControl key={projectKey} onOpenDiff={onOpenDiff} />}
          {activeId === "browser" && <Browser source={browserSource} onPopOut={onPopOutBrowser} />}
          {activeId === "artifacts" && <ArtifactList artifacts={artifacts} onOpen={handleOpenArtifact} />}
        </div>
      </div>
    </aside>
  );
}
