import { useState, type KeyboardEvent } from "react";
import { IconSend } from "../icons";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const INITIAL_MESSAGES: ChatMessage[] = [
  { id: "m1", role: "user", content: "右侧的 Git 管理面板现在能看到暂存区和提交历史了吗？" },
  {
    id: "m2",
    role: "assistant",
    content:
      "可以，右侧「Git 管理」Tab 已经还原了 VSCode 源代码管理面板的核心交互：暂存/取消暂存、提交输入框、以及带分支图的提交历史，点击某条提交还能展开看它改了哪些文件。",
  },
];

export default function ChatArea() {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
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
          content: "（示例回复，尚未接入真实模型 —— 当前只搭建了问答区的界面壳子）",
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
        <span className="text-[11px] text-vscode-fg-dim">UI 预览 · 未接入真实模型</span>
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
                {msg.role === "user" ? "我" : "AI"}
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
              <div className="pt-0.5 text-[13px] text-vscode-fg-dim">正在输入…</div>
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
            placeholder="发消息给 AI…（Enter 发送，Shift+Enter 换行）"
            className="max-h-40 flex-1 resize-none bg-transparent text-[13px] text-vscode-fg placeholder:text-vscode-fg-dim focus:outline-none"
          />
          <button
            type="button"
            onClick={send}
            disabled={!draft.trim() || pending}
            className="mb-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded text-vscode-fg-muted enabled:hover:bg-vscode-list-hover enabled:hover:text-vscode-fg disabled:opacity-40"
            title="发送"
          >
            <IconSend size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
