import { useEffect, useState } from "react";
import { IconX } from "../icons";
import { DiffTab, type OpenDiffRequest } from "../source-control";
import ChatArea from "./ChatArea";

interface MainAreaProps {
  openDiff: OpenDiffRequest | null;
  onCloseDiff: () => void;
}

export default function MainArea({ openDiff, onCloseDiff }: MainAreaProps) {
  const [activeTab, setActiveTab] = useState<"chat" | "diff">("chat");

  // Source Control 里点新文件时，自动切到 diff 标签页
  useEffect(() => {
    if (openDiff) setActiveTab("diff");
  }, [openDiff]);

  const closeDiffTab = () => {
    onCloseDiff();
    setActiveTab("chat");
  };

  const fileName = openDiff?.path.split("/").pop() ?? "";

  return (
    <main className="flex min-w-0 flex-1 flex-col bg-vscode-bg">
      <div className="flex h-9 shrink-0 items-stretch border-b border-vscode-border bg-vscode-panel-header">
        <button
          type="button"
          onClick={() => setActiveTab("chat")}
          className={`relative px-3 text-[12px] transition-colors ${
            activeTab === "chat" ? "text-vscode-fg" : "text-vscode-fg-muted hover:text-vscode-fg"
          }`}
        >
          对话
          {activeTab === "chat" && <span className="absolute inset-x-0 bottom-0 h-[2px] bg-vscode-accent" />}
        </button>

        {openDiff && (
          <div
            className={`group relative flex items-center gap-1 pl-3 pr-1.5 text-[12px] transition-colors ${
              activeTab === "diff" ? "text-vscode-fg" : "text-vscode-fg-muted hover:text-vscode-fg"
            }`}
          >
            <button
              type="button"
              onClick={() => setActiveTab("diff")}
              className="max-w-[160px] truncate"
              title={openDiff.path}
            >
              Diff · {fileName}
            </button>
            <button
              type="button"
              onClick={closeDiffTab}
              title="关闭"
              className="rounded p-0.5 opacity-0 hover:bg-vscode-list-hover group-hover:opacity-100"
            >
              <IconX size={11} />
            </button>
            {activeTab === "diff" && <span className="absolute inset-x-0 bottom-0 h-[2px] bg-vscode-accent" />}
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1">
        {activeTab === "chat" && <ChatArea />}
        {activeTab === "diff" && openDiff && (
          <DiffTab path={openDiff.path} staged={openDiff.staged} onClose={closeDiffTab} />
        )}
      </div>
    </main>
  );
}
