use git2::Repository;
use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::State;

const MAX_PREVIEW_BYTES: u64 = 2 * 1024 * 1024;

#[derive(Serialize, Clone)]
pub struct ExplorerEntry {
    pub name: String,
    pub path: String,
    #[serde(rename = "isDir")]
    pub is_dir: bool,
}

pub struct ExplorerState(pub Mutex<PathBuf>);

impl ExplorerState {
    pub fn new() -> Self {
        ExplorerState(Mutex::new(default_root()))
    }
}

fn default_root() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .expect("src-tauri should have a parent directory")
        .to_path_buf()
}

fn project_root(state: &State<ExplorerState>) -> PathBuf {
    state.0.lock().expect("explorer state poisoned").clone()
}

/// Filters entries using git2's own ignore rules (falls back to no filtering outside a
/// git repo) so node_modules/target/dist etc. don't flood the tree without a hand-rolled
/// gitignore parser.
fn list_dir_entries(root: &Path, relative: &str) -> Result<Vec<ExplorerEntry>, String> {
    let dir = if relative.is_empty() { root.to_path_buf() } else { root.join(relative) };
    let repo = Repository::open(root).ok();

    let mut entries: Vec<ExplorerEntry> = fs::read_dir(&dir)
        .map_err(|e| e.to_string())?
        .filter_map(|entry| entry.ok())
        .filter_map(|entry| {
            let name = entry.file_name().to_string_lossy().to_string();
            if name == ".git" {
                return None;
            }
            let is_dir = entry.file_type().ok()?.is_dir();
            let rel_path = if relative.is_empty() { name.clone() } else { format!("{relative}/{name}") };
            if let Some(repo) = &repo {
                if repo.is_path_ignored(&rel_path).unwrap_or(false) {
                    return None;
                }
            }
            Some(ExplorerEntry { name, path: rel_path, is_dir })
        })
        .collect();

    entries.sort_by(|a, b| match (a.is_dir, b.is_dir) {
        (true, false) => std::cmp::Ordering::Less,
        (false, true) => std::cmp::Ordering::Greater,
        _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
    });
    Ok(entries)
}

/// Validates the given path is a real directory and switches the app's current explorer root to it.
#[tauri::command]
pub fn explorer_set_current_project(path: String, state: State<ExplorerState>) -> Result<Vec<ExplorerEntry>, String> {
    let candidate = PathBuf::from(&path);
    if !candidate.is_dir() {
        return Err("目录不存在".to_string());
    }
    *state.0.lock().expect("explorer state poisoned") = candidate.clone();
    list_dir_entries(&candidate, "")
}

#[tauri::command]
pub fn explorer_list_dir(path: Option<String>, state: State<ExplorerState>) -> Result<Vec<ExplorerEntry>, String> {
    let root = project_root(&state);
    list_dir_entries(&root, &path.unwrap_or_default())
}

#[tauri::command]
pub fn explorer_read_file(path: String, state: State<ExplorerState>) -> Result<String, String> {
    let root = project_root(&state);
    let full = root.join(&path);
    let metadata = fs::metadata(&full).map_err(|e| e.to_string())?;
    if metadata.len() > MAX_PREVIEW_BYTES {
        return Err("文件过大，无法预览".to_string());
    }
    String::from_utf8(fs::read(&full).map_err(|e| e.to_string())?)
        .map_err(|_| "无法预览此文件（可能是二进制文件）".to_string())
}
