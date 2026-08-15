import { useEffect, useState } from "react";

export interface Project {
  id: string;
  name: string;
  path: string;
}

const PROJECTS_KEY = "projects";
const ACTIVE_PROJECT_KEY = "activeProjectId";

function readStoredProjects(): Project[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(PROJECTS_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function readStoredActiveId(): string | null {
  return localStorage.getItem(ACTIVE_PROJECT_KEY);
}

interface UseProjectsResult {
  projects: Project[];
  activeProject: Project | null;
  setActiveId: (id: string) => void;
  addProject: (path: string, name: string) => Project;
  removeProject: (id: string) => void;
}

export function useProjects(): UseProjectsResult {
  const [projects, setProjects] = useState<Project[]>(readStoredProjects);
  const [activeId, setActiveId] = useState<string | null>(readStoredActiveId);

  useEffect(() => {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    if (activeId) {
      localStorage.setItem(ACTIVE_PROJECT_KEY, activeId);
    } else {
      localStorage.removeItem(ACTIVE_PROJECT_KEY);
    }
  }, [activeId]);

  const addProject = (path: string, name: string): Project => {
    const existing = projects.find((p) => p.path === path);
    const project = existing ?? { id: crypto.randomUUID(), name, path };
    if (!existing) setProjects((prev) => [...prev, project]);
    setActiveId(project.id);
    return project;
  };

  const removeProject = (id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
    setActiveId((current) => (current === id ? null : current));
  };

  const activeProject = projects.find((p) => p.id === activeId) ?? null;

  return { projects, activeProject, setActiveId, addProject, removeProject };
}
