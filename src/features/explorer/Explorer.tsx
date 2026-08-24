import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  IconCopy,
  IconEllipsis,
  IconExternalLink,
  IconFile,
  IconFilePlus,
  IconFolderPlus,
  IconListCollapse,
  IconListFilter,
  IconPencil,
  IconRefresh,
  IconTrash2,
  IconX,
} from "./icons";
import { api, isApiUnavailable, onExplorerChanged } from "./api";
import { useExplorerI18n } from "./i18n";
import "./theme.css";
import ExplorerRow from "./ExplorerRow";
import InlineInput from "./InlineInput";
import ExplorerContextMenu, { type ExplorerMenuItem } from "./ContextMenu";
import ExplorerSearch from "./ExplorerSearch";
import type { ExplorerEntry } from "./types";
import { api as gitApi } from "../source-control/api";
import type { FileEntry, FileStatus } from "../source-control/types";
import { FolderOpen } from "lucide-react";

interface ExplorerProps {
  onOpenFile?: (path: string) => void;
  /** 当前项目名，对齐 Orca FileExplorerToolbar 头部展示 repoName 的方式；缺省时退回通用标题。 */
  projectName?: string;
  projectPath?: string;
}

type DirState = "loading" | "error" | ExplorerEntry[];

type FlatRow =
  | { kind: "entry"; entry: ExplorerEntry; depth: number }
  | { kind: "status"; depth: number; status: "error" | "empty" };

interface NameFilterNode {
  entry: ExplorerEntry;
  children: Map<string, NameFilterNode>;
}

interface InlineInputState {
  kind: "new-file" | "new-folder" | "rename";
  /** 新建时是目标目录；重命名时是被改名条目所在的目录（用于改名后刷新哪个目录）。 */
  parentPath: string;
  depth: number;
  existingPath?: string;
  existingName?: string;
}

interface ContextMenuState {
  x: number;
  y: number;
  entry: ExplorerEntry;
  depth: number;
}

interface FileOperation {
  undo: () => Promise<void>;
  redo: () => Promise<void>;
}

const isMac = typeof navigator !== "undefined" && navigator.userAgent.includes("Mac");

const STATUS_PRIORITY: Record<FileStatus, number> = { C: 6, D: 5, M: 4, A: 3, U: 3, R: 2 };

function dominantStatus(statuses: Iterable<FileStatus>): FileStatus | undefined {
  let dominant: FileStatus | undefined;
  for (const status of statuses) {
    if (!dominant || STATUS_PRIORITY[status] > STATUS_PRIORITY[dominant]) dominant = status;
  }
  return dominant;
}

function dirname(path: string): string {
  const idx = path.lastIndexOf("/");
  return idx === -1 ? "" : path.slice(0, idx);
}

function selectionMode(event: React.MouseEvent, mac: boolean): "replace" | "toggle" | "range" {
  if (event.shiftKey) return "range";
  if (mac ? event.metaKey : event.ctrlKey) return "toggle";
  return "replace";
}

export default function Explorer({ onOpenFile, projectName, projectPath }: ExplorerProps) {
  const { t } = useExplorerI18n();
  const [dirCache, setDirCache] = useState<Record<string, DirState>>({});
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [anchorPath, setAnchorPath] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [projectReady, setProjectReady] = useState(false);
  const [rootError, setRootError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [filterQuery, setFilterQuery] = useState("");
  const [nameFilterPaths, setNameFilterPaths] = useState<string[]>([]);
  const [nameFilterLoading, setNameFilterLoading] = useState(false);
  const [gitEntries, setGitEntries] = useState<FileEntry[]>([]);
  const [explorerView, setExplorerView] = useState<"files" | "search">("files");
  const [showDotfiles, setShowDotfiles] = useState(true);
  const [showGitIgnored, setShowGitIgnored] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [, setHistoryVersion] = useState(0);
  const [inlineInput, setInlineInput] = useState<InlineInputState | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [dropTargetPath, setDropTargetPath] = useState<string | null>(null);
  const draggingPathRef = useRef<string | null>(null);
  const expandedPathsRef = useRef(expandedPaths);
  const refreshTimerRef = useRef<number | null>(null);
  const dragExpandTimerRef = useRef<number | null>(null);
  const nameFilterRequestRef = useRef(0);
  const projectGenerationRef = useRef(0);
  const dirRequestIdsRef = useRef(new Map<string, number>());
  const projectReadyRef = useRef(false);
  const undoStackRef = useRef<FileOperation[]>([]);
  const redoStackRef = useRef<FileOperation[]>([]);

  const loadGitStatus = useCallback(() => {
    void gitApi
      .status()
      .then((status) => setGitEntries([...status.staged, ...status.unstaged]))
      .catch(() => setGitEntries([]));
  }, []);

  const commitOperation = (operation: FileOperation) => {
    undoStackRef.current.push(operation);
    redoStackRef.current = [];
    setHistoryVersion((version) => version + 1);
  };

  const undoOperation = async () => {
    const operation = undoStackRef.current.pop();
    if (!operation) return;
    try {
      await operation.undo();
      redoStackRef.current.push(operation);
      setActionError(null);
    } catch (err) {
      undoStackRef.current.push(operation);
      setActionError(err instanceof Error ? err.message : t.explorer.actionFailed);
    }
    setHistoryVersion((version) => version + 1);
  };

  const redoOperation = async () => {
    const operation = redoStackRef.current.pop();
    if (!operation) return;
    try {
      await operation.redo();
      undoStackRef.current.push(operation);
      setActionError(null);
    } catch (err) {
      redoStackRef.current.push(operation);
      setActionError(err instanceof Error ? err.message : t.explorer.actionFailed);
    }
    setHistoryVersion((version) => version + 1);
  };

  useEffect(() => {
    expandedPathsRef.current = expandedPaths;
  }, [expandedPaths]);

  const loadDir = useCallback(
    (path: string) => {
      if (!projectReadyRef.current) return;
      const generation = projectGenerationRef.current;
      const requestId = (dirRequestIdsRef.current.get(path) ?? 0) + 1;
      dirRequestIdsRef.current.set(path, requestId);
      setDirCache((prev) => ({ ...prev, [path]: "loading" }));
      api
        .listDir(path || undefined, showGitIgnored)
        .then((entries) => {
          if (generation !== projectGenerationRef.current || dirRequestIdsRef.current.get(path) !== requestId) return;
          setDirCache((prev) => ({ ...prev, [path]: entries }));
          setUnavailable(false);
          if (path === "") setRootError(null);
        })
        .catch((err) => {
          if (generation !== projectGenerationRef.current || dirRequestIdsRef.current.get(path) !== requestId) return;
          if (isApiUnavailable(err)) {
            setUnavailable(true);
            return;
          }
          const message = err instanceof Error ? err.message : t.explorer.loadDirFailed;
          setDirCache((prev) => ({ ...prev, [path]: "error" }));
          if (path === "") setRootError(message);
        });
    },
    [showGitIgnored, t],
  );

  const initializeProject = useCallback(() => {
    const generation = ++projectGenerationRef.current;
    projectReadyRef.current = false;
    setProjectReady(false);
    dirRequestIdsRef.current.clear();
    setDirCache({ "": "loading" });
    setExpandedPaths(new Set());
    setSelectedPaths(new Set());
    setRootError(null);
    setUnavailable(false);

    const initialize = projectPath
      ? api.setCurrentProject(projectPath)
      : api.listDir(undefined, false);
    void initialize
      .then((entries) => {
        if (generation !== projectGenerationRef.current) return;
        projectReadyRef.current = true;
        setProjectReady(true);
        setDirCache({ "": entries });
      })
      .catch((err) => {
        if (generation !== projectGenerationRef.current) return;
        if (isApiUnavailable(err)) {
          setUnavailable(true);
          return;
        }
        const message = err instanceof Error ? err.message : t.explorer.loadDirFailed;
        setDirCache({ "": "error" });
        setRootError(message);
      });
  }, [projectPath, t]);

  // The explorer owns project initialization so its first directory request cannot
  // race the backend's current-root switch. App only initializes source control.
  useEffect(() => {
    initializeProject();
    return () => {
      projectGenerationRef.current += 1;
      projectReadyRef.current = false;
    };
  }, [initializeProject]);

  // “显示被 Git 忽略的文件”变化后刷新当前可见树；初始化尚未完成时由上面的流程负责首屏。
  useEffect(() => {
    if (!projectReady) return;
    loadDir("");
    expandedPathsRef.current.forEach((path) => loadDir(path));
  }, [showGitIgnored, projectReady, loadDir]);

  useEffect(() => {
    loadGitStatus();
  }, [loadGitStatus]);

  useEffect(() => {
    const query = filterQuery.trim();
    const requestId = ++nameFilterRequestRef.current;
    if (!query) {
      setNameFilterPaths([]);
      setNameFilterLoading(false);
      return;
    }
    setNameFilterLoading(true);
    const timer = window.setTimeout(() => {
      void api
        .findFiles(query, showGitIgnored)
        .then((paths) => {
          if (requestId === nameFilterRequestRef.current) setNameFilterPaths(paths);
        })
        .catch((error) => {
          if (requestId !== nameFilterRequestRef.current) return;
          setNameFilterPaths([]);
          setActionError(error instanceof Error ? error.message : t.explorer.actionFailed);
        })
        .finally(() => {
          if (requestId === nameFilterRequestRef.current) setNameFilterLoading(false);
        });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [filterQuery, showGitIgnored, t]);

  const refreshAll = useCallback(() => {
    setIsRefreshing(true);
    loadDir("");
    expandedPathsRef.current.forEach((p) => loadDir(p));
    loadGitStatus();
    window.setTimeout(() => setIsRefreshing(false), 350);
  }, [loadDir, loadGitStatus]);

  const { fileStatusByPath, folderStatusByPath } = useMemo(() => {
    const fileStatuses = new Map<string, FileStatus[]>();
    const folderStatuses = new Map<string, FileStatus[]>();
    for (const entry of gitEntries) {
      const path = entry.path.replace(/\\/g, "/");
      const statuses = fileStatuses.get(path) ?? [];
      statuses.push(entry.status);
      fileStatuses.set(path, statuses);
      if (entry.status === "D") continue;
      const segments = path.split("/");
      let folderPath = "";
      for (const segment of segments.slice(0, -1)) {
        folderPath = folderPath ? `${folderPath}/${segment}` : segment;
        const inherited = folderStatuses.get(folderPath) ?? [];
        inherited.push(entry.status);
        folderStatuses.set(folderPath, inherited);
      }
    }
    return {
      fileStatusByPath: new Map([...fileStatuses].map(([path, statuses]) => [path, dominantStatus(statuses)])),
      folderStatusByPath: new Map([...folderStatuses].map(([path, statuses]) => [path, dominantStatus(statuses)])),
    };
  }, [gitEntries]);

  // 目录变化监听（notify 后端 watcher），做个简单防抖避免一次保存触发多次刷新
  useEffect(() => {
    const unsubscribe = onExplorerChanged(() => {
      if (refreshTimerRef.current) window.clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = window.setTimeout(refreshAll, 400);
    });
    return () => {
      unsubscribe();
      if (refreshTimerRef.current) window.clearTimeout(refreshTimerRef.current);
    };
  }, [refreshAll]);

  const toggleDir = useCallback(
    (path: string) => {
      setExpandedPaths((prev) => {
        const next = new Set(prev);
        if (next.has(path)) {
          next.delete(path);
        } else {
          next.add(path);
          if (!dirCache[path]) loadDir(path);
        }
        return next;
      });
    },
    [dirCache, loadDir],
  );

  const expandDir = useCallback(
    (path: string) => {
      if (!path) return;
      setExpandedPaths((prev) => (prev.has(path) ? prev : new Set(prev).add(path)));
      if (!dirCache[path]) loadDir(path);
    },
    [dirCache, loadDir],
  );

  // ── 拍平成一维行列表：目录懒加载/折叠状态 + 隐藏文件/过滤 都在这一步应用 ──
  const visibleRows = useMemo(() => {
    const acc: FlatRow[] = [];
    const query = filterQuery.trim().toLowerCase();
    if (query) {
      const roots = new Map<string, NameFilterNode>();
      for (const filePath of nameFilterPaths) {
        const segments = filePath.split("/").filter(Boolean);
        if (!showDotfiles && segments.some((segment) => segment.startsWith("."))) continue;
        let siblings = roots;
        let currentPath = "";
        segments.forEach((segment, index) => {
          currentPath = currentPath ? `${currentPath}/${segment}` : segment;
          let node = siblings.get(segment);
          if (!node) {
            node = {
              entry: { name: segment, path: currentPath, isDir: index < segments.length - 1, ignored: false },
              children: new Map(),
            };
            siblings.set(segment, node);
          }
          siblings = node.children;
        });
      }
      const appendNodes = (nodes: Map<string, NameFilterNode>, depth: number) => {
        const sorted = [...nodes.values()].sort((left, right) => {
          if (left.entry.isDir !== right.entry.isDir) return left.entry.isDir ? -1 : 1;
          return left.entry.name.localeCompare(right.entry.name, undefined, { sensitivity: "base" });
        });
        for (const node of sorted) {
          acc.push({ kind: "entry", entry: node.entry, depth });
          if (node.entry.isDir) appendNodes(node.children, depth + 1);
        }
      };
      appendNodes(roots, 0);
      return acc;
    }
    const entryMatchesQuery = (entry: ExplorerEntry): boolean => {
      if (!query || entry.name.toLowerCase().includes(query)) return true;
      if (!entry.isDir) return false;
      const children = dirCache[entry.path];
      return Array.isArray(children) && children.some(entryMatchesQuery);
    };
    const applyFilters = (entries: ExplorerEntry[]) => {
      let filtered = showDotfiles ? entries : entries.filter((e) => !e.name.startsWith("."));
      if (query) filtered = filtered.filter(entryMatchesQuery);
      return filtered;
    };
    const appendDirRows = (dirPath: string, depth: number) => {
      const state = dirCache[dirPath];
      if (state === "loading" || state === undefined) return;
      if (state === "error") {
        acc.push({ kind: "status", depth, status: "error" });
        return;
      }
      const entries = applyFilters(state);
      if (entries.length === 0) {
        acc.push({ kind: "status", depth, status: "empty" });
        return;
      }
      for (const entry of entries) {
        acc.push({ kind: "entry", entry, depth });
        if (entry.isDir && (expandedPaths.has(entry.path) || (query && entryMatchesQuery(entry)))) {
          appendDirRows(entry.path, depth + 1);
        }
      }
    };
    appendDirRows("", 0);
    return acc;
  }, [dirCache, expandedPaths, showDotfiles, filterQuery, nameFilterPaths]);

  const orderedEntryPaths = useMemo(() => visibleRows.filter((r) => r.kind === "entry").map((r) => (r as { entry: ExplorerEntry }).entry.path), [visibleRows]);

  // ── 选择 ──
  const applySelection = (target: string, mode: "replace" | "toggle" | "range") => {
    if (mode === "replace") {
      setSelectedPaths(new Set([target]));
      setAnchorPath(target);
      return;
    }
    if (mode === "toggle") {
      setSelectedPaths((prev) => {
        const next = new Set(prev);
        if (next.has(target)) next.delete(target);
        else next.add(target);
        return next;
      });
      setAnchorPath(target);
      return;
    }
    const anchorIdx = anchorPath ? orderedEntryPaths.indexOf(anchorPath) : -1;
    const targetIdx = orderedEntryPaths.indexOf(target);
    if (anchorIdx === -1 || targetIdx === -1) {
      setSelectedPaths(new Set([target]));
      return;
    }
    const [start, end] = anchorIdx < targetIdx ? [anchorIdx, targetIdx] : [targetIdx, anchorIdx];
    setSelectedPaths(new Set(orderedEntryPaths.slice(start, end + 1)));
  };

  const handleRowClick = (entry: ExplorerEntry, event: React.MouseEvent<HTMLButtonElement>) => {
    const mode = selectionMode(event, isMac);
    applySelection(entry.path, mode);
    if (mode === "replace") {
      if (entry.isDir) toggleDir(entry.path);
      else onOpenFile?.(entry.path);
    }
  };

  // ── 新建 / 重命名 ──
  const startNewFile = (parentPath: string, depth: number) => {
    if (parentPath) expandDir(parentPath);
    setInlineInput({ kind: "new-file", parentPath, depth });
  };
  const startNewFolder = (parentPath: string, depth: number) => {
    if (parentPath) expandDir(parentPath);
    setInlineInput({ kind: "new-folder", parentPath, depth });
  };
  const startRename = (entry: ExplorerEntry, depth: number) => {
    setInlineInput({ kind: "rename", parentPath: dirname(entry.path), depth, existingPath: entry.path, existingName: entry.name });
  };

  const submitInlineInput = async (value: string) => {
    const current = inlineInput;
    setInlineInput(null);
    const name = value.trim();
    if (!current || !name) return;
    try {
      if (current.kind === "new-file") {
        await api.createFile(current.parentPath, name);
        const createdPath = current.parentPath ? `${current.parentPath}/${name}` : name;
        commitOperation({
          undo: async () => { await api.delete([createdPath]); loadDir(current.parentPath); },
          redo: async () => { await api.createFile(current.parentPath, name); loadDir(current.parentPath); },
        });
      } else if (current.kind === "new-folder") {
        await api.createDir(current.parentPath, name);
        const createdPath = current.parentPath ? `${current.parentPath}/${name}` : name;
        commitOperation({
          undo: async () => { await api.delete([createdPath]); loadDir(current.parentPath); },
          redo: async () => { await api.createDir(current.parentPath, name); loadDir(current.parentPath); },
        });
      } else if (current.existingPath) {
        const oldPath = current.existingPath;
        const newPath = await api.rename(oldPath, name);
        const oldName = current.existingName ?? oldPath.split("/").pop() ?? oldPath;
        commitOperation({
          undo: async () => { await api.rename(newPath, oldName); loadDir(current.parentPath); },
          redo: async () => { await api.rename(oldPath, name); loadDir(current.parentPath); },
        });
      }
      setActionError(null);
      loadDir(current.parentPath);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t.explorer.actionFailed);
    }
  };

  // ── 删除 / 复制 ──
  const requestDelete = async (paths: string[]) => {
    if (paths.length === 0) return;
    const confirmed =
      paths.length === 1
        ? window.confirm(t.explorer.confirmDeleteOne(paths[0].split("/").pop() ?? paths[0]))
        : window.confirm(t.explorer.confirmDeleteMany(paths.length));
    if (!confirmed) return;
    try {
      await api.delete(paths);
      setActionError(null);
      const parents = new Set(paths.map(dirname));
      parents.forEach((p) => loadDir(p));
      setSelectedPaths(new Set());
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t.explorer.actionFailed);
    }
  };

  const requestDuplicate = async (entry: ExplorerEntry) => {
    try {
      const duplicatedPath = await api.duplicate(entry.path);
      const parentPath = dirname(entry.path);
      commitOperation({
        undo: async () => { await api.delete([duplicatedPath]); loadDir(parentPath); },
        redo: async () => { await api.duplicate(entry.path); loadDir(parentPath); },
      });
      setActionError(null);
      loadDir(dirname(entry.path));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t.explorer.actionFailed);
    }
  };

  const requestMove = async (sourcePath: string, destDir: string) => {
    const sourceParent = dirname(sourcePath);
    if (sourceParent === destDir || sourcePath === destDir) return;
    try {
      const movedPath = await api.move(sourcePath, destDir);
      commitOperation({
        undo: async () => { await api.move(movedPath, sourceParent); loadDir(sourceParent); loadDir(destDir); },
        redo: async () => { await api.move(sourcePath, destDir); loadDir(sourceParent); loadDir(destDir); },
      });
      setActionError(null);
      loadDir(sourceParent);
      loadDir(destDir);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t.explorer.actionFailed);
    }
  };

  const copyPath = (path: string) => {
    void navigator.clipboard?.writeText(path);
  };

  const absolutePath = (path: string) => {
    if (!projectPath) return path;
    const separator = projectPath.includes("\\") ? "\\" : "/";
    return `${projectPath.replace(/[\\/]$/, "")}${separator}${path.replace(/\//g, separator)}`;
  };

  const collapseFolderSubtree = (path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      for (const expanded of next) {
        if (expanded === path || expanded.startsWith(`${path}/`)) next.delete(expanded);
      }
      return next;
    });
  };

  const cancelDragExpand = () => {
    if (dragExpandTimerRef.current) window.clearTimeout(dragExpandTimerRef.current);
    dragExpandTimerRef.current = null;
  };

  const reveal = async (path: string) => {
    try {
      await api.reveal(path);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t.explorer.actionFailed);
    }
  };

  // ── 键盘导航 ──
  const handleTreeKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (inlineInput || contextMenu) return;
    const primaryModifier = isMac ? event.metaKey : event.ctrlKey;
    if (primaryModifier && event.key.toLowerCase() === "z") {
      event.preventDefault();
      if (event.shiftKey) void redoOperation();
      else void undoOperation();
      return;
    }
    const active = anchorPath;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (orderedEntryPaths.length === 0) return;
      const idx = active ? orderedEntryPaths.indexOf(active) : -1;
      const nextIdx = event.key === "ArrowDown" ? Math.min(idx + 1, orderedEntryPaths.length - 1) : Math.max(idx - 1, 0);
      const nextPath = orderedEntryPaths[Math.max(nextIdx, 0)];
      applySelection(nextPath, event.shiftKey ? "range" : "replace");
      return;
    }
    if (!active) return;
    const row = visibleRows.find((r) => r.kind === "entry" && r.entry.path === active) as { entry: ExplorerEntry; depth: number } | undefined;
    if (!row) return;
    if (event.key === "ArrowRight") {
      event.preventDefault();
      if (row.entry.isDir && !expandedPaths.has(row.entry.path)) toggleDir(row.entry.path);
      return;
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      if (row.entry.isDir && expandedPaths.has(row.entry.path)) toggleDir(row.entry.path);
      else {
        const parent = dirname(row.entry.path);
        if (parent) applySelection(parent, "replace");
      }
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      if (row.entry.isDir) toggleDir(row.entry.path);
      else onOpenFile?.(row.entry.path);
      return;
    }
    if (event.key === "F2") {
      event.preventDefault();
      startRename(row.entry, row.depth);
      return;
    }
    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      void requestDelete(selectedPaths.size > 0 ? [...selectedPaths] : [active]);
    }
  };

  const buildMenuItems = (entry: ExplorerEntry, depth: number): ExplorerMenuItem[] => {
    const creationParent = entry.isDir ? entry.path : dirname(entry.path);
    const creationDepth = entry.isDir ? depth + 1 : depth;
    const items: ExplorerMenuItem[] = [
      { label: t.explorer.newFile, icon: IconFilePlus, onSelect: () => startNewFile(creationParent, creationDepth) },
      { label: t.explorer.newFolder, icon: IconFolderPlus, onSelect: () => startNewFolder(creationParent, creationDepth) },
    ];
    if (!entry.isDir) {
      items.push({ label: t.explorer.viewFile, icon: IconFile, separatorBefore: true, onSelect: () => onOpenFile?.(entry.path) });
    }
    items.push({ label: t.explorer.duplicate, icon: IconCopy, separatorBefore: entry.isDir, onSelect: () => void requestDuplicate(entry) });
    const menuPaths = selectedPaths.has(entry.path) && selectedPaths.size > 1 ? [...selectedPaths] : [entry.path];
    items.push({ label: t.explorer.copyAbsolutePath, icon: IconCopy, onSelect: () => copyPath(menuPaths.map(absolutePath).join("\n")) });
    items.push({ label: t.explorer.copyRelativePath, icon: IconCopy, onSelect: () => copyPath(menuPaths.join("\n")) });
    if (entry.isDir && expandedPaths.has(entry.path)) {
      items.push({ label: t.explorer.collapseFolder, icon: IconListCollapse, onSelect: () => collapseFolderSubtree(entry.path) });
    }
    items.push({ label: t.explorer.revealInFileManager, icon: IconExternalLink, onSelect: () => void reveal(entry.path) });
    items.push({ label: t.explorer.rename, icon: IconPencil, shortcut: "F2", separatorBefore: true, onSelect: () => startRename(entry, depth) });
    items.push({
      label: t.explorer.delete,
      icon: IconTrash2,
      destructive: true,
      shortcut: isMac ? "⌫" : "Del",
      onSelect: () => void requestDelete(selectedPaths.has(entry.path) && selectedPaths.size > 1 ? [...selectedPaths] : [entry.path]),
    });
    return items;
  };

  const visibleEntries = dirCache[""];
  const isEmpty = Array.isArray(visibleEntries) && visibleEntries.length === 0;

  return (
    <div className="explorer-theme flex h-full flex-col overflow-hidden bg-vscode-bg">
      <div className="flex h-8 min-h-8 shrink-0 items-center gap-1 border-b border-vscode-border px-2">
        <span className="min-w-0 flex-1 truncate text-xs font-medium text-vscode-fg">{projectName || t.explorer.title}</span>
        <button
          type="button"
          title={t.explorer.collapseAll}
          disabled={expandedPaths.size === 0}
          onClick={() => setExpandedPaths(new Set())}
          className="shrink-0 rounded p-1 text-vscode-fg-muted hover:bg-vscode-list-hover hover:text-vscode-fg disabled:cursor-not-allowed disabled:opacity-40"
        >
          <IconListCollapse size={13} />
        </button>
        <button type="button" title={t.common.refresh} disabled={isRefreshing} onClick={refreshAll} className="shrink-0 rounded p-1 text-vscode-fg-muted hover:bg-vscode-list-hover hover:text-vscode-fg disabled:opacity-60">
          <IconRefresh size={13} className={isRefreshing ? "animate-spin" : ""} />
        </button>
        <div className="relative">
          <button type="button" title={t.explorer.moreActions} onClick={() => setMoreMenuOpen((v) => !v)} className="shrink-0 rounded p-1 text-vscode-fg-muted hover:bg-vscode-list-hover hover:text-vscode-fg">
            <IconEllipsis size={13} />
          </button>
          {moreMenuOpen && (
            <>
              <div className="fixed inset-0 z-[90]" onClick={() => setMoreMenuOpen(false)} />
              <div className="absolute right-0 top-full z-[100] mt-1 w-56 rounded-md border border-vscode-border-light bg-vscode-bg py-1 shadow-xl">
                <button type="button" onClick={() => setShowDotfiles((v) => !v)} className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-vscode-fg hover:bg-vscode-list-hover">
                  <span className={`w-3 shrink-0 text-center ${showDotfiles ? "text-vscode-fg" : "text-transparent"}`}>✓</span>
                  <span>{t.explorer.showDotfiles}</span>
                </button>
                <button type="button" onClick={() => setShowGitIgnored((v) => !v)} className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-vscode-fg hover:bg-vscode-list-hover">
                  <span className={`w-3 shrink-0 text-center ${showGitIgnored ? "text-vscode-fg" : "text-transparent"}`}>✓</span>
                  <span>{t.explorer.showGitIgnoredFiles}</span>
                </button>
                <div className="my-1 border-t border-vscode-border" />
                <button type="button" onClick={() => { setMoreMenuOpen(false); void api.openCurrentProjectInVsCode().catch((err) => setActionError(err instanceof Error ? err.message : t.explorer.actionFailed)); }} className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-vscode-fg hover:bg-vscode-list-hover">
                  <img src="https://www.google.com/s2/favicons?domain=code.visualstudio.com&sz=64" width={14} height={14} alt="" aria-hidden className="shrink-0 rounded-[2px]" /> <span>{t.explorer.openInVsCode}</span>
                </button>
                <button type="button" onClick={() => { setMoreMenuOpen(false); void api.openCurrentProject().catch((err) => setActionError(err instanceof Error ? err.message : t.explorer.actionFailed)); }} className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-vscode-fg hover:bg-vscode-list-hover">
                  <FolderOpen size={14} className="shrink-0 text-vscode-fg-muted" /> <span>{t.explorer.openInFileManager}</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {explorerView === "search" && <ExplorerSearch onSelectFiles={() => setExplorerView("files")} onOpenFile={onOpenFile} />}

      {explorerView === "files" && <>
      <div className="border-b border-vscode-border px-2 py-1.5">
        <div className="flex h-7 items-center gap-1 rounded-sm border border-vscode-input-border bg-vscode-input-bg px-1.5 focus-within:border-vscode-accent">
          <IconListFilter size={14} className="shrink-0 text-vscode-fg-muted" />
          <input
            value={filterQuery}
            onChange={(event) => setFilterQuery(event.target.value)}
            placeholder={t.explorer.filterFiles}
            spellCheck={false}
            className="min-w-0 flex-1 bg-transparent py-1 text-xs text-vscode-fg outline-none placeholder:text-vscode-fg-muted/60"
          />
          {filterQuery && (
            <button type="button" title={t.common.close} onClick={() => setFilterQuery("")} className="shrink-0 rounded-sm p-0.5 text-vscode-fg-muted hover:text-vscode-fg">
              <IconX size={12} />
            </button>
          )}
        </div>
        <div className="mt-1 flex h-7 rounded-md bg-vscode-input-bg p-0.5 text-[11px]">
          <button type="button" className="flex-1 rounded bg-vscode-bg font-medium text-vscode-fg shadow-sm">{t.explorer.names}</button>
          <button type="button" onClick={() => setExplorerView("search")} className="flex-1 rounded text-vscode-fg-muted hover:bg-vscode-bg hover:text-vscode-fg">{t.explorer.contents}</button>
        </div>
      </div>

      {actionError && (
        <div className="flex items-center justify-between gap-2 border-b border-vscode-border px-3 py-1.5 text-[11px] text-red-400">
          <span className="min-w-0 flex-1 truncate">{actionError}</span>
          <button type="button" onClick={() => setActionError(null)} className="shrink-0 hover:text-vscode-fg"><IconX size={11} /></button>
        </div>
      )}

      <div
        role="tree"
        tabIndex={0}
        onKeyDown={handleTreeKeyDown}
        onContextMenu={(event) => {
          if (event.target === event.currentTarget) {
            event.preventDefault();
            setContextMenu({ x: event.clientX, y: event.clientY, entry: { name: "", path: "", isDir: true, ignored: false }, depth: -1 });
          }
        }}
        onDrop={(event) => {
          event.preventDefault();
          const source = draggingPathRef.current;
          if (source) void requestMove(source, "");
          setDropTargetPath(null);
        }}
        onDragOver={(event) => event.preventDefault()}
        className="min-h-0 flex-1 overflow-y-auto py-1 outline-none"
      >
        {unavailable && <div className="px-4 py-3 text-center text-[11px] leading-relaxed text-vscode-fg-muted">{t.explorer.browserPreviewNotice}</div>}
        {!unavailable && (dirCache[""] === "loading" || nameFilterLoading) && <div className="flex h-full items-center justify-center text-[11px] text-vscode-fg-muted">{t.explorer.loadingTree}</div>}
        {!unavailable && dirCache[""] === "error" && (
          <button type="button" onClick={initializeProject} className="flex h-full w-full items-center justify-center px-4 text-center text-[11px] text-red-400 hover:bg-vscode-list-hover">
            {rootError || t.explorer.loadDirFailed} · {t.common.refresh}
          </button>
        )}
        {!unavailable && !filterQuery && isEmpty && <div className="flex h-full items-center justify-center px-4 text-center text-[11px] text-vscode-fg-muted">{t.explorer.emptyDirectory}</div>}
        {!unavailable && filterQuery && !nameFilterLoading && visibleRows.length === 0 && <div className="flex h-full items-center justify-center px-4 text-center text-[11px] text-vscode-fg-muted">{t.explorer.noSearchResults}</div>}
        {!unavailable && !nameFilterLoading &&
          visibleRows.map((row, i) => {
            if (row.kind === "status") {
              return (
                row.status === "error" ? (
                  <button key={`status-${i}`} type="button" onClick={() => {
                    const parent = [...visibleRows.slice(0, i)].reverse().find((candidate) => candidate.kind === "entry" && candidate.entry.isDir && candidate.depth === row.depth - 1);
                    if (parent?.kind === "entry") loadDir(parent.entry.path);
                  }} style={{ paddingLeft: row.depth * 16 + 8 + 20 }} className="w-full py-1 text-left text-[11px] text-red-400 hover:bg-vscode-list-hover">
                    {t.explorer.loadDirFailed} · {t.common.refresh}
                  </button>
                ) : (
                  <div key={`status-${i}`} style={{ paddingLeft: row.depth * 16 + 8 + 20 }} className="py-1 text-[11px] text-vscode-fg-dim">{t.explorer.emptyDirectory}</div>
                )
              );
            }
            const { entry, depth } = row;
            if (inlineInput?.kind === "rename" && inlineInput.existingPath === entry.path) {
              return <InlineInput key={entry.path} depth={depth} kind="rename" defaultValue={inlineInput.existingName} onSubmit={submitInlineInput} onCancel={() => setInlineInput(null)} />;
            }
            return (
              <div key={entry.path}>
                <ExplorerRow
                  entry={entry}
                  depth={depth}
                  isExpanded={filterQuery ? entry.isDir : expandedPaths.has(entry.path)}
                  isLoading={!filterQuery && entry.isDir && dirCache[entry.path] === "loading"}
                  isSelected={selectedPaths.has(entry.path)}
                  isDropTarget={dropTargetPath === entry.path}
                  gitStatus={entry.isDir ? folderStatusByPath.get(entry.path) : fileStatusByPath.get(entry.path)}
                  onClick={(event) => handleRowClick(entry, event)}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    if (!selectedPaths.has(entry.path)) setSelectedPaths(new Set([entry.path]));
                    setAnchorPath(entry.path);
                    setContextMenu({ x: event.clientX, y: event.clientY, entry, depth });
                  }}
                  onDragStart={() => {
                    draggingPathRef.current = entry.path;
                  }}
                  onDragEnd={() => {
                    cancelDragExpand();
                    draggingPathRef.current = null;
                    setDropTargetPath(null);
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDropTargetPath(entry.path);
                    if (entry.isDir && !expandedPaths.has(entry.path) && !dragExpandTimerRef.current) {
                      dragExpandTimerRef.current = window.setTimeout(() => {
                        expandDir(entry.path);
                        dragExpandTimerRef.current = null;
                      }, 600);
                    }
                  }}
                  onDragLeave={() => {
                    cancelDragExpand();
                    setDropTargetPath((p) => (p === entry.path ? null : p));
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    // 不冒泡给外层 tree 容器的 onDrop（否则会被当成"拖到根目录"再处理一次）
                    event.stopPropagation();
                    cancelDragExpand();
                    const source = draggingPathRef.current;
                    setDropTargetPath(null);
                    if (source) void requestMove(source, entry.path);
                  }}
                />
                {entry.isDir && inlineInput && inlineInput.kind !== "rename" && inlineInput.parentPath === entry.path && (
                  <InlineInput
                    depth={depth + 1}
                    kind={inlineInput.kind}
                    onSubmit={submitInlineInput}
                    onCancel={() => setInlineInput(null)}
                  />
                )}
              </div>
            );
          })}
        {inlineInput && inlineInput.kind !== "rename" && inlineInput.parentPath === "" && (
          <InlineInput depth={0} kind={inlineInput.kind} onSubmit={submitInlineInput} onCancel={() => setInlineInput(null)} />
        )}
      </div>

      {contextMenu &&
        (contextMenu.depth === -1 ? (
          <ExplorerContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            onClose={() => setContextMenu(null)}
            items={[
              { label: t.explorer.newFile, icon: IconFilePlus, onSelect: () => startNewFile("", 0) },
              { label: t.explorer.newFolder, icon: IconFolderPlus, onSelect: () => startNewFolder("", 0) },
            ]}
          />
        ) : (
          <ExplorerContextMenu x={contextMenu.x} y={contextMenu.y} onClose={() => setContextMenu(null)} items={buildMenuItems(contextMenu.entry, contextMenu.depth)} />
        ))}
      </>}
    </div>
  );
}
