import { useState, type KeyboardEvent } from "react";
import { IconSend } from "../icons";
import { useI18n } from "../../i18n";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export default function ChatArea() {
  const { t } = useI18n();
  const [messages, setMessages] = useState<ChatMessage[]>(t.chat.initialMessages);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);

  const send = () => {
    const text = draft.trim();
    if (!text || pending) return;
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setDraft("");
    setPending(true);
    window.setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: t.chat.demoReply,
        },
      ]);
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
              <div className="min-w-0 flex-1 pt-0.5 text-[13px] leading-relaxed text-vscode-fg">
                {msg.content}
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
