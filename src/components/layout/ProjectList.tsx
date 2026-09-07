import { useState } from "react";
import { DndContext, DragOverlay, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent, type DragOverEvent, type DragStartEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { IconFolder, IconPlus, IconTrash } from "../icons";
import { useI18n } from "../../i18n";
import type { Project } from "../../hooks/useProjects";

interface ProjectListProps {
  projects: Project[];
  activeProjectId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onReorder: (draggedId: string, targetId: string, position: "before" | "after") => void;
  error: string | null;
}

interface SortableProjectProps {
  project: Project;
  isActive: boolean;
  indicator: "before" | "after" | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
}

function SortableProject({ project, isActive, indicator, onSelect, onRemove }: SortableProjectProps) {
  const { t } = useI18n();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: project.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      className={`group relative flex touch-none cursor-grab items-center gap-1 rounded-sm px-1.5 py-1 active:cursor-grabbing ${isActive ? "bg-vscode-list-active" : "hover:bg-vscode-list-hover"} ${isDragging ? "opacity-25" : ""}`}
    >
      {indicator && (
        <span aria-hidden="true" className={`pointer-events-none absolute left-0 right-0 z-10 h-0.5 rounded-full bg-blue-500 shadow-[0_0_0_1px_rgba(59,130,246,0.12)] ${indicator === "before" ? "-top-[2px]" : "-bottom-[2px]"}`}>
          <span className="absolute -left-0.5 -top-[3px] h-2 w-2 rounded-full border-2 border-blue-500 bg-vscode-sidebar" />
        </span>
      )}
      <button type="button" onClick={() => onSelect(project.id)} title={project.path} className="flex min-w-0 flex-1 items-center gap-1.5 text-left">
        <IconFolder size={13} className="shrink-0 text-vscode-fg-muted" />
        <span className="truncate text-[12.5px] text-vscode-fg">{project.name}</span>
      </button>
      <button
        type="button"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={() => { if (window.confirm(t.sidebar.confirmRemoveProject(project.name))) onRemove(project.id); }}
        title={t.sidebar.removeProject}
        className="shrink-0 rounded p-0.5 text-vscode-fg-dim opacity-0 hover:bg-vscode-list-hover hover:text-vscode-fg group-hover:opacity-100"
      >
        <IconTrash size={12} />
      </button>
    </div>
  );
}

export default function ProjectList({ projects, activeProjectId, onSelect, onAdd, onRemove, onReorder, error }: ProjectListProps) {
  const { t } = useI18n();
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const draggedProject = projects.find((project) => project.id === draggedId);

  const getPosition = (targetId: string): "before" | "after" => {
    const draggedIndex = projects.findIndex((project) => project.id === draggedId);
    const targetIndex = projects.findIndex((project) => project.id === targetId);
    return draggedIndex < targetIndex ? "after" : "before";
  };

  const handleDragStart = ({ active }: DragStartEvent) => setDraggedId(String(active.id));
  const handleDragOver = ({ over }: DragOverEvent) => setOverId(over ? String(over.id) : null);
  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id) onReorder(String(active.id), String(over.id), getPosition(String(over.id)));
    setDraggedId(null);
    setOverId(null);
  };

  return (
    <div className="border-b border-vscode-border px-1.5 pb-2 pt-2">
      <div className="flex items-center justify-between px-1.5 pb-1">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-vscode-fg-muted">{t.sidebar.projects}</span>
        <button type="button" onClick={onAdd} title={t.sidebar.addProject} className="rounded p-1 text-vscode-fg-muted hover:bg-vscode-list-hover hover:text-vscode-fg"><IconPlus size={13} /></button>
      </div>

      {projects.length === 0 ? (
        <p className="px-1.5 py-1 text-[11px] leading-relaxed text-vscode-fg-dim">{t.sidebar.noProjects}</p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragCancel={() => { setDraggedId(null); setOverId(null); }}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={projects.map((project) => project.id)} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-0.5">
              {projects.map((project) => (
                <SortableProject
                  key={project.id}
                  project={project}
                  isActive={project.id === activeProjectId}
                  indicator={overId === project.id && draggedId !== project.id ? getPosition(project.id) : null}
                  onSelect={onSelect}
                  onRemove={onRemove}
                />
              ))}
            </div>
          </SortableContext>
          <DragOverlay dropAnimation={{ duration: 180, easing: "ease" }}>
            {draggedProject ? (
              <div className="flex max-w-[220px] items-center gap-2 rounded-xl border border-vscode-border bg-vscode-sidebar px-3.5 py-2 text-[12.5px] text-vscode-fg shadow-xl">
                <IconFolder size={15} className="shrink-0 text-vscode-fg-muted" />
                <span className="truncate">{draggedProject.name}</span>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {error && <p className="px-1.5 pt-1 text-[11px] leading-relaxed text-git-deleted">{error}</p>}
    </div>
  );
}
