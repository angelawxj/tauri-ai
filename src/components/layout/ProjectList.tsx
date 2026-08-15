import { IconFolder, IconPlus, IconTrash } from "../icons";
import { useI18n } from "../../i18n";
import type { Project } from "../../hooks/useProjects";

interface ProjectListProps {
  projects: Project[];
  activeProjectId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  error: string | null;
}

export default function ProjectList({ projects, activeProjectId, onSelect, onAdd, onRemove, error }: ProjectListProps) {
  const { t } = useI18n();

  return (
    <div className="border-b border-vscode-border px-1.5 pb-2 pt-2">
      <div className="flex items-center justify-between px-1.5 pb-1">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-vscode-fg-muted">{t.sidebar.projects}</span>
        <button
          type="button"
          onClick={onAdd}
          title={t.sidebar.addProject}
          className="rounded p-1 text-vscode-fg-muted hover:bg-vscode-list-hover hover:text-vscode-fg"
        >
          <IconPlus size={13} />
        </button>
      </div>

      {projects.length === 0 ? (
        <p className="px-1.5 py-1 text-[11px] leading-relaxed text-vscode-fg-dim">{t.sidebar.noProjects}</p>
      ) : (
        <div className="flex flex-col gap-0.5">
          {projects.map((project) => {
            const isActive = project.id === activeProjectId;
            return (
              <div
                key={project.id}
                className={`group flex items-center gap-1 rounded-sm px-1.5 py-1 ${
                  isActive ? "bg-vscode-list-active" : "hover:bg-vscode-list-hover"
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelect(project.id)}
                  title={project.path}
                  className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
                >
                  <IconFolder size={13} className="shrink-0 text-vscode-fg-muted" />
                  <span className="truncate text-[12.5px] text-vscode-fg">{project.name}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(t.sidebar.confirmRemoveProject(project.name))) onRemove(project.id);
                  }}
                  title={t.sidebar.removeProject}
                  className="shrink-0 rounded p-0.5 text-vscode-fg-dim opacity-0 hover:bg-vscode-list-hover hover:text-vscode-fg group-hover:opacity-100"
                >
                  <IconTrash size={12} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {error && <p className="px-1.5 pt-1 text-[11px] leading-relaxed text-git-deleted">{error}</p>}
    </div>
  );
}
