import { useState } from "react";
import { IconMoon, IconPlus, IconSearch, IconSettings, IconSun } from "../icons";
import type { Theme } from "../../hooks/useTheme";
import type { Project } from "../../hooks/useProjects";
import { useI18n } from "../../i18n";
import ProjectList from "./ProjectList";

interface SidebarProps {
  theme: Theme;
  onToggleTheme: () => void;
  projects: Project[];
  activeProjectId: string | null;
  onSelectProject: (id: string) => void;
  onAddProject: () => void;
  onRemoveProject: (id: string) => void;
  onReorderProject: (draggedId: string, targetId: string, position: "before" | "after") => void;
  projectError: string | null;
}

export default function Sidebar({
  theme,
  onToggleTheme,
  projects,
  activeProjectId,
  onSelectProject,
  onAddProject,
  onRemoveProject,
  onReorderProject,
  projectError,
}: SidebarProps) {
  const { t, lang, toggleLang } = useI18n();
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
          title={t.sidebar.searchSessions}
        >
          <IconSearch size={14} />
        </button>
      </div>

      <ProjectList
        projects={projects}
        activeProjectId={activeProjectId}
        onSelect={onSelectProject}
        onAdd={onAddProject}
        onRemove={onRemoveProject}
        onReorder={onReorderProject}
        error={projectError}
      />

      <div className="px-3 pb-2">
        <button
          type="button"
          className="flex w-full items-center justify-center gap-1.5 rounded-sm border border-vscode-border-light bg-vscode-button px-3 py-1.5 text-[12px] font-medium text-vscode-button-fg hover:bg-vscode-button-hover"
        >
          <IconPlus size={13} />
          {t.sidebar.newChat}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-1.5 pb-2">
        {t.sidebar.mockSessions.map((session) => {
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
            onClick={toggleLang}
            className="rounded px-1.5 py-1 text-[11px] font-medium text-vscode-fg-muted hover:bg-vscode-list-hover hover:text-vscode-fg"
            title={lang === "zh" ? "Switch to English" : "切换到中文"}
          >
            {lang === "zh" ? "EN" : "中"}
          </button>
          <button
            type="button"
            onClick={onToggleTheme}
            className="rounded p-1 text-vscode-fg-muted hover:bg-vscode-list-hover hover:text-vscode-fg"
            title={theme === "dark" ? t.sidebar.switchToLightTheme : t.sidebar.switchToDarkTheme}
          >
            {theme === "dark" ? <IconSun size={14} /> : <IconMoon size={14} />}
          </button>
          <button
            type="button"
            className="rounded p-1 text-vscode-fg-muted hover:bg-vscode-list-hover hover:text-vscode-fg"
            title={t.sidebar.settings}
          >
            <IconSettings size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}
