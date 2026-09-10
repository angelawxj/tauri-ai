import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { IconFile, IconSend } from "../icons";
import { useI18n } from "../../i18n";
import type { Artifact } from "./types";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  artifacts?: Artifact[];
}

interface ChatAreaProps {
  quote?: { id: string; text: string } | null;
  onOpenArtifact: (artifact: Artifact) => void;
  /** 产物一生成就上报，供右侧「产物」Tab 展示完整列表（不用等用户点开卡片）。 */
  onArtifactCreated: (artifact: Artifact) => void;
}

// 简单关键词触发，仅用来在真实模型接入前把"产物"展示能力跑通。
const HTML_TRIGGER = /html|游戏|game|扫雷|minesweeper/i;
const TEXT_TRIGGER = /文本|代码|txt|code/i;
const ARTIFACT_TRIGGER = /创建|生成|写一个|create|generate/i;

export default function ChatArea({ onOpenArtifact, onArtifactCreated, quote }: ChatAreaProps) {
  const { t } = useI18n();
  const [messages, setMessages] = useState<ChatMessage[]>(t.chat.initialMessages);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const input = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (!quote) return;
    setDraft((value) => value ? `${value}\n\n${quote.text}` : quote.text);
    input.current?.focus();
  }, [quote]);

  const send = () => {
    const text = draft.trim();
    if (!text || pending) return;
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setDraft("");
    setPending(true);
    window.setTimeout(() => {
      const artifact = HTML_TRIGGER.test(text)
        ? { id: crypto.randomUUID(), name: t.chat.demoHtmlArtifactName, language: "html", content: t.chat.demoHtmlArtifactContent }
        : TEXT_TRIGGER.test(text)
          ? { id: crypto.randomUUID(), name: t.chat.demoTextArtifactName, language: "text", content: t.chat.demoTextArtifactContent }
          : ARTIFACT_TRIGGER.test(text)
            ? { id: crypto.randomUUID(), name: t.chat.demoArtifactName, language: "markdown", content: t.chat.demoArtifactContent }
            : null;
      const reply: ChatMessage = artifact
        ? { id: crypto.randomUUID(), role: "assistant", content: t.chat.artifactReply, artifacts: [artifact] }
        : { id: crypto.randomUUID(), role: "assistant", content: t.chat.demoReply };
      setMessages((prev) => [...prev, reply]);
      if (artifact) onArtifactCreated(artifact);
      setPending(false);
    }, 500);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-vscode-bg">
      <header className="flex h-10 shrink-0 items-center justify-between border-b border-vscode-border px-4">
        <span className="text-[12.5px] text-vscode-fg-muted">Claude Sonnet 5</span>
        <span className="text-[11px] text-vscode-fg-dim">{t.chat.modelPreviewNote}</span>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-[720px] flex-col gap-5 px-6 py-6">
          {messages.map((msg) => (
            <div key={msg.id} className="flex gap-3">
              <div
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${
                  msg.role === "user"
                    ? "bg-vscode-badge-bg text-vscode-fg"
                    : "bg-vscode-accent text-white"
                }`}
              >
                {msg.role === "user" ? t.chat.you : "AI"}
              </div>
              <div className="min-w-0 flex-1 pt-0.5">
                <div className="text-[13px] leading-relaxed text-vscode-fg">{msg.content}</div>
                {msg.artifacts?.map((artifact) => (
                  <button
                    key={artifact.id}
                    type="button"
                    onClick={() => onOpenArtifact(artifact)}
                    title={t.chat.viewArtifact}
                    className="mt-2 flex w-full max-w-[280px] items-center gap-2 rounded-md border border-vscode-border-light bg-vscode-input-bg px-3 py-2 text-left hover:bg-vscode-list-hover"
                  >
                    <IconFile size={15} className="shrink-0 text-vscode-fg-muted" />
                    <span className="min-w-0 flex-1 truncate text-[12.5px] text-vscode-fg">{artifact.name}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
          {pending && (
            <div className="flex gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-vscode-accent text-[10px] font-semibold text-white">
                AI
              </div>
              <div className="pt-0.5 text-[13px] text-vscode-fg-dim">{t.chat.typing}</div>
            </div>
          )}
        </div>
      </div>

      <div className="shrink-0 border-t border-vscode-border p-3">
        <div className="mx-auto flex max-w-[720px] items-end gap-2 rounded-md border border-vscode-border-light bg-vscode-input-bg px-3 py-2">
          <textarea
            ref={input}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            placeholder={t.chat.placeholder}
            className="max-h-40 flex-1 resize-none bg-transparent text-[13px] text-vscode-fg placeholder:text-vscode-fg-dim focus:outline-none"
          />
          <button
            type="button"
            onClick={send}
            disabled={!draft.trim() || pending}
            className="mb-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded text-vscode-fg-muted enabled:hover:bg-vscode-list-hover enabled:hover:text-vscode-fg disabled:opacity-40"
            title={t.chat.send}
          >
            <IconSend size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
