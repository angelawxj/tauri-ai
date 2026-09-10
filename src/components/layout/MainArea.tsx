import { useEffect, useState } from "react";
import { IconCompass, IconFile, IconGitBranch, IconMessageCircle, IconSparkle, IconX } from "../icons";
import { DiffTab, type OpenDiffRequest } from "../../features/source-control";
import { FileTab, type OpenFileRequest } from "../../features/explorer";
import { useI18n } from "../../i18n";
import ChatArea from "./ChatArea";
import { describeSelection, type FileSelection } from "../file-selection";
import ArtifactTab from "./ArtifactTab";
import PoppedBrowserTab from "./PoppedBrowserTab";
import type { PoppedBrowser } from "./Browser";
import { isRenderableName } from "./artifact-kind";
import type { Artifact } from "./types";

interface MainAreaProps {
  openDiff: OpenDiffRequest | null;
  onCloseDiff: () => void;
  openFile: OpenFileRequest | null;
  onCloseFile: () => void;
  /** HTML/Markdown artifacts render in the 浏览器 tab instead of this component's own plain-text tab. */
  onOpenRenderableArtifact: (artifact: Artifact) => void;
  /** 产物一生成就上报给 App，供右侧「产物」Tab 展示完整列表。 */
  onArtifactCreated: (artifact: Artifact) => void;
  /** 从右侧「产物」Tab 点了一个非可渲染产物，请求在这里打开对应标签页。 */
  textArtifactRequest: Artifact | null;
  /** 从右侧「浏览器」Tab 点了"在中间区域打开"，把已渲染内容开成一个宽屏标签页。 */
  openBrowser: PoppedBrowser | null;
  onCloseBrowser: () => void;
}

type ActiveTab = "chat" | "diff" | "file" | "browser" | { artifactId: string };

export default function MainArea({
  openDiff,
  onCloseDiff,
  openFile,
  onCloseFile,
  onOpenRenderableArtifact,
  onArtifactCreated,
  textArtifactRequest,
  openBrowser,
  onCloseBrowser,
}: MainAreaProps) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<ActiveTab>("chat");
  const [chatQuote, setChatQuote] = useState<{ id: string; text: string } | null>(null);
  const addSelectionToChat = (selection: FileSelection, instruction?: string) => {
    setChatQuote({ id: crypto.randomUUID(), text: `${instruction ? instruction + "\n\n" : ""}${describeSelection(selection)}` });
    setActiveTab("chat");
  };
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);

  // Source Control / Explorer 里点新文件时，自动切到对应标签页
  useEffect(() => {
    if (openDiff) setActiveTab("diff");
  }, [openDiff]);
  useEffect(() => {
    if (openFile) setActiveTab("file");
  }, [openFile]);
  useEffect(() => {
    if (openBrowser) setActiveTab("browser");
  }, [openBrowser]);

  const closeDiffTab = () => {
    onCloseDiff();
    setActiveTab("chat");
  };
  const closeFileTab = () => {
    onCloseFile();
    setActiveTab("chat");
  };
  const closeBrowserTab = () => {
    onCloseBrowser();
    setActiveTab("chat");
  };
  const openArtifact = (artifact: Artifact) => {
    if (isRenderableName(artifact.name)) {
      onOpenRenderableArtifact(artifact);
      return;
    }
    setArtifacts((prev) => (prev.some((a) => a.id === artifact.id) ? prev : [...prev, artifact]));
    setActiveTab({ artifactId: artifact.id });
  };
  // 右侧「产物」Tab 点了一个非可渲染产物时，在这里打开对应标签页
  useEffect(() => {
    if (textArtifactRequest) openArtifact(textArtifactRequest);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [textArtifactRequest]);
  const closeArtifactTab = (id: string) => {
    setArtifacts((prev) => prev.filter((a) => a.id !== id));
    setActiveTab((current) => (typeof current === "object" && current.artifactId === id ? "chat" : current));
  };

  const diffFileName = openDiff?.path.split("/").pop() ?? "";
  const fileName = openFile?.path.split("/").pop() ?? "";
  const isArtifactActive = (id: string) => typeof activeTab === "object" && activeTab.artifactId === id;

  return (
    <main className="flex min-w-0 flex-1 flex-col bg-vscode-bg">
      <div className="flex h-9 shrink-0 items-stretch border-b border-vscode-border bg-vscode-panel-header">
        <button
          type="button"
          onClick={() => setActiveTab("chat")}
          title={t.tabs.chat}
          aria-label={t.tabs.chat}
          className={`relative flex w-10 items-center justify-center transition-colors ${
            activeTab === "chat" ? "text-vscode-fg" : "text-vscode-fg-muted hover:text-vscode-fg"
          }`}
        >
          <IconMessageCircle size={16} />
          {activeTab === "chat" && <span className="absolute inset-x-0 bottom-0 h-[2px] bg-vscode-accent" />}
        </button>

        {openDiff && (
          <div
            className={`group relative flex items-center gap-1.5 pl-3 pr-1.5 text-[12px] transition-colors ${
              activeTab === "diff" ? "text-vscode-fg" : "text-vscode-fg-muted hover:text-vscode-fg"
            }`}
          >
            <button type="button" onClick={() => setActiveTab("diff")} className="flex max-w-[160px] items-center gap-1.5" title={openDiff.path}>
              <IconGitBranch size={13} className="shrink-0" />
              <span className="truncate">Diff · {diffFileName}</span>
            </button>
            <button type="button" onClick={closeDiffTab} title={t.common.close} className="rounded p-0.5 opacity-0 hover:bg-vscode-list-hover group-hover:opacity-100">
              <IconX size={11} />
            </button>
            {activeTab === "diff" && <span className="absolute inset-x-0 bottom-0 h-[2px] bg-vscode-accent" />}
          </div>
        )}

        {openFile && (
          <div
            className={`group relative flex items-center gap-1.5 pl-3 pr-1.5 text-[12px] transition-colors ${
              activeTab === "file" ? "text-vscode-fg" : "text-vscode-fg-muted hover:text-vscode-fg"
            }`}
          >
            <button type="button" onClick={() => setActiveTab("file")} className="flex max-w-[160px] items-center gap-1.5" title={openFile.path}>
              <IconFile size={13} className="shrink-0" />
              <span className="truncate">{fileName}</span>
            </button>
            <button type="button" onClick={closeFileTab} title={t.common.close} className="rounded p-0.5 opacity-0 hover:bg-vscode-list-hover group-hover:opacity-100">
              <IconX size={11} />
            </button>
            {activeTab === "file" && <span className="absolute inset-x-0 bottom-0 h-[2px] bg-vscode-accent" />}
          </div>
        )}

        {openBrowser && (
          <div
            className={`group relative flex items-center gap-1.5 pl-3 pr-1.5 text-[12px] transition-colors ${
              activeTab === "browser" ? "text-vscode-fg" : "text-vscode-fg-muted hover:text-vscode-fg"
            }`}
          >
            <button type="button" onClick={() => setActiveTab("browser")} className="flex max-w-[160px] items-center gap-1.5" title={openBrowser.title}>
              <IconCompass size={13} className="shrink-0" />
              <span className="truncate">{openBrowser.title}</span>
            </button>
            <button type="button" onClick={closeBrowserTab} title={t.common.close} className="rounded p-0.5 opacity-0 hover:bg-vscode-list-hover group-hover:opacity-100">
              <IconX size={11} />
            </button>
            {activeTab === "browser" && <span className="absolute inset-x-0 bottom-0 h-[2px] bg-vscode-accent" />}
          </div>
        )}

        {artifacts.map((artifact) => (
          <div
            key={artifact.id}
            className={`group relative flex items-center gap-1.5 pl-3 pr-1.5 text-[12px] transition-colors ${
              isArtifactActive(artifact.id) ? "text-vscode-fg" : "text-vscode-fg-muted hover:text-vscode-fg"
            }`}
          >
            <button type="button" onClick={() => setActiveTab({ artifactId: artifact.id })} className="flex max-w-[160px] items-center gap-1.5" title={artifact.name}>
              <IconSparkle size={13} className="shrink-0" />
              <span className="truncate">{artifact.name}</span>
            </button>
            <button type="button" onClick={() => closeArtifactTab(artifact.id)} title={t.common.close} className="rounded p-0.5 opacity-0 hover:bg-vscode-list-hover group-hover:opacity-100">
              <IconX size={11} />
            </button>
            {isArtifactActive(artifact.id) && <span className="absolute inset-x-0 bottom-0 h-[2px] bg-vscode-accent" />}
          </div>
        ))}
      </div>

      <div className="min-h-0 flex-1">
        <div className={activeTab === "chat" ? "h-full" : "hidden"}><ChatArea quote={chatQuote} onOpenArtifact={openArtifact} onArtifactCreated={onArtifactCreated} /></div>
        {activeTab === "diff" && openDiff && (
          <DiffTab path={openDiff.path} staged={openDiff.staged} commitHash={openDiff.commitHash} onClose={closeDiffTab} />
        )}
        {openFile && <div className={activeTab === "file" ? "h-full" : "hidden"}><FileTab key={openFile.path} path={openFile.path} onClose={closeFileTab} onAddToChat={addSelectionToChat} onRequestEdit={addSelectionToChat} /></div>}
        {activeTab === "browser" && openBrowser && <PoppedBrowserTab browser={openBrowser} onClose={closeBrowserTab} />}
        {typeof activeTab === "object" &&
          artifacts
            .filter((a) => a.id === activeTab.artifactId)
            .map((a) => <ArtifactTab key={a.id} artifact={a} onClose={() => closeArtifactTab(a.id)} />)}
      </div>
    </main>
  );
}
