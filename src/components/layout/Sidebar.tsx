import { useState } from "react";
import { IconMoon, IconPlus, IconSearch, IconSettings, IconSun } from "../icons";
import type { Theme } from "../../hooks/useTheme";

interface SessionItem {
  id: string;
  title: string;
  time: string;
}

const MOCK_SESSIONS: SessionItem[] = [
  { id: "1", title: "重构 Git 状态解析逻辑", time: "10:24" },
  { id: "2", title: "为什么 useEffect 触发了两次", time: "昨天" },
  { id: "3", title: "解释 git2 的 revwalk 排序", time: "昨天" },
  { id: "4", title: "生成提交信息文案", time: "周二" },
  { id: "5", title: "Tailwind v4 主题变量迁移", time: "上周" },
];

interface SidebarProps {
  theme: Theme;
  onToggleTheme: () => void;
}

export default function Sidebar({ theme, onToggleTheme }: SidebarProps) {
  const [activeId, setActiveId] = useState("1");

  return (
    <aside className="flex h-full w-[260px] shrink-0 flex-col border-r border-vscode-border bg-vscode-sidebar">
      <div className="flex items-center justify-between px-3 py-3">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-vscode-fg-muted">
          tauri-ai
        </span>
        <button
          type="button"
          className="rounded p-1 text-vscode-fg-muted hover:bg-vscode-list-hover hover:text-vscode-fg"
          title="搜索会话"
        >
          <IconSearch size={14} />
        </button>
      </div>

      <div className="px-3 pb-2">
        <button
          type="button"
          className="flex w-full items-center justify-center gap-1.5 rounded-sm border border-vscode-border-light bg-vscode-button px-3 py-1.5 text-[12px] font-medium text-vscode-button-fg hover:bg-vscode-button-hover"
        >
          <IconPlus size={13} />
          新建对话
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-1.5 pb-2">
        {MOCK_SESSIONS.map((session) => {
          const isActive = session.id === activeId;
          return (
            <button
              key={session.id}
              type="button"
              onClick={() => setActiveId(session.id)}
              className={`group mb-0.5 flex w-full flex-col items-start rounded-sm px-2.5 py-1.5 text-left transition-colors ${
                isActive ? "bg-vscode-list-active" : "hover:bg-vscode-list-hover"
              }`}
            >
              <span className="w-full truncate text-[12.5px] text-vscode-fg">{session.title}</span>
              <span className="text-[11px] text-vscode-fg-dim">{session.time}</span>
            </button>
          );
        })}
      </nav>

      <div className="flex items-center justify-between border-t border-vscode-border px-3 py-2">
        <span className="text-[11px] text-vscode-fg-dim">v0.1.0</span>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={onToggleTheme}
            className="rounded p-1 text-vscode-fg-muted hover:bg-vscode-list-hover hover:text-vscode-fg"
            title={theme === "dark" ? "切换到亮色主题" : "切换到暗色主题"}
          >
            {theme === "dark" ? <IconSun size={14} /> : <IconMoon size={14} />}
          </button>
          <button
            type="button"
            className="rounded p-1 text-vscode-fg-muted hover:bg-vscode-list-hover hover:text-vscode-fg"
            title="设置"
          >
            <IconSettings size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}
