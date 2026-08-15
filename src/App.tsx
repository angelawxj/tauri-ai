import { useEffect, useRef, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import Sidebar from "./components/layout/Sidebar";
import MainArea from "./components/layout/MainArea";
import DetailPanel from "./components/layout/DetailPanel";
import { useTheme } from "./hooks/useTheme";
import { useProjects } from "./hooks/useProjects";
import { api } from "./components/source-control/api";
import type { OpenDiffRequest } from "./components/source-control";

export default function App() {
  const [theme, toggleTheme] = useTheme();
  const [openDiff, setOpenDiff] = useState<OpenDiffRequest | null>(null);
  const { projects, activeProject, setActiveId, addProject, removeProject } = useProjects();
  const [projectError, setProjectError] = useState<string | null>(null);
  const seededRef = useRef(false);

  // First run with no saved projects: seed the list with the backend's default
  // repo (this app's own checkout) so existing single-repo behavior still works.
  // Guarded by a ref (not just projects.length) because React StrictMode fires
  // this effect twice in dev, and both invocations would otherwise race past
  // the empty-list check before the first one's addProject() commits.
  useEffect(() => {
    if (projects.length > 0 || seededRef.current) return;
    seededRef.current = true;
    void (async () => {
      try {
        const status = await api.status();
        addProject(status.repoPath, status.repoName);
      } catch {
        // Not running inside Tauri, or no default repo available — leave the list
        // empty; the user can add a project manually once the app shell is ready.
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the Rust-side "current repo" pointer in sync with the active project.
  useEffect(() => {
    if (!activeProject) return;
    void (async () => {
      try {
        await api.setCurrentProject(activeProject.path);
        setProjectError(null);
      } catch (err) {
        setProjectError(err instanceof Error ? err.message : String(err));
      }
    })();
  }, [activeProject?.path]);

  const handleAddProject = async () => {
    try {
      const selected = await open({ directory: true, multiple: false });
      if (typeof selected !== "string") return;
      const name = selected.split(/[\\/]/).filter(Boolean).pop() ?? selected;
      addProject(selected, name);
    } catch (err) {
      setProjectError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-vscode-bg text-vscode-fg">
      <Sidebar
        theme={theme}
        onToggleTheme={toggleTheme}
        projects={projects}
        activeProjectId={activeProject?.id ?? null}
        onSelectProject={setActiveId}
        onAddProject={() => void handleAddProject()}
        onRemoveProject={removeProject}
        projectError={projectError}
      />
      <MainArea openDiff={openDiff} onCloseDiff={() => setOpenDiff(null)} />
      <DetailPanel onOpenDiff={(path, staged) => setOpenDiff({ path, staged })} projectKey={activeProject?.id} />
    </div>
  );
}
