use git2::{Delta, DiffOptions, IndexAddOption, Repository, Sort, Status};
use serde::Serialize;
use std::path::{Path, PathBuf};

#[derive(Serialize, Clone)]
pub struct FileEntry {
    pub path: String,
    pub status: String,
}

#[derive(Serialize)]
pub struct GitStatus {
    pub branch: String,
    pub staged: Vec<FileEntry>,
    pub unstaged: Vec<FileEntry>,
}

#[derive(Serialize)]
pub struct CommitInfo {
    pub hash: String,
    #[serde(rename = "shortHash")]
    pub short_hash: String,
    pub message: String,
    pub author: String,
    pub timestamp: i64,
    pub parents: Vec<String>,
}

/// 固定管理当前项目自身的仓库：CARGO_MANIFEST_DIR 编译期即为 `<repo>/src-tauri`，取其父目录。
fn repo_root() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .expect("src-tauri should have a parent directory")
        .to_path_buf()
}

fn open_repo() -> Result<Repository, String> {
    Repository::open(repo_root()).map_err(|e| e.to_string())
}

fn status_char(s: Status, staged: bool) -> Option<&'static str> {
    if staged {
        if s.is_index_new() {
            return Some("A");
        }
        if s.is_index_modified() || s.is_index_typechange() {
            return Some("M");
        }
        if s.is_index_deleted() {
            return Some("D");
        }
        if s.is_index_renamed() {
            return Some("R");
        }
    } else {
        if s.is_wt_new() {
            return Some("U");
        }
        if s.is_wt_modified() || s.is_wt_typechange() {
            return Some("M");
        }
        if s.is_wt_deleted() {
            return Some("D");
        }
        if s.is_wt_renamed() {
            return Some("R");
        }
    }
    None
}

#[tauri::command]
pub fn git_status() -> Result<GitStatus, String> {
    let repo = open_repo()?;

    let branch = match repo.head() {
        Ok(head) => head.shorthand().unwrap_or("HEAD").to_string(),
        Err(_) => "(无提交)".to_string(),
    };

    let mut opts = git2::StatusOptions::new();
    opts.include_untracked(true).recurse_untracked_dirs(true);
    let statuses = repo.statuses(Some(&mut opts)).map_err(|e| e.to_string())?;

    let mut staged = Vec::new();
    let mut unstaged = Vec::new();

    for entry in statuses.iter() {
        let s = entry.status();
        let path = match entry.path() {
            Some(p) if !p.is_empty() => p.to_string(),
            _ => continue,
        };

        if let Some(st) = status_char(s, true) {
            staged.push(FileEntry {
                path: path.clone(),
                status: st.to_string(),
            });
        }
        if let Some(st) = status_char(s, false) {
            unstaged.push(FileEntry {
                path,
                status: st.to_string(),
            });
        }
    }

    Ok(GitStatus {
        branch,
        staged,
        unstaged,
    })
}

#[tauri::command]
pub fn git_stage(path: String) -> Result<(), String> {
    let repo = open_repo()?;
    let mut index = repo.index().map_err(|e| e.to_string())?;
    let full = repo_root().join(&path);

    if full.exists() {
        index.add_path(Path::new(&path)).map_err(|e| e.to_string())?;
    } else {
        index
            .remove_path(Path::new(&path))
            .map_err(|e| e.to_string())?;
    }
    index.write().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn git_stage_all() -> Result<(), String> {
    let repo = open_repo()?;
    let mut index = repo.index().map_err(|e| e.to_string())?;
    index
        .add_all(["*"].iter(), IndexAddOption::DEFAULT, None)
        .map_err(|e| e.to_string())?;
    index
        .update_all(["*"].iter(), None)
        .map_err(|e| e.to_string())?;
    index.write().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn git_unstage(path: String) -> Result<(), String> {
    let repo = open_repo()?;
    match repo.head() {
        Ok(head) => {
            let commit = head.peel_to_commit().map_err(|e| e.to_string())?;
            repo.reset_default(Some(commit.as_object()), [path.as_str()])
                .map_err(|e| e.to_string())
        }
        Err(_) => {
            // 仓库还没有任何提交：暂存区没有"HEAD 版本"可回退，直接移出索引即可
            let mut index = repo.index().map_err(|e| e.to_string())?;
            index
                .remove_path(Path::new(&path))
                .map_err(|e| e.to_string())?;
            index.write().map_err(|e| e.to_string())
        }
    }
}

#[tauri::command]
pub fn git_unstage_all() -> Result<(), String> {
    let repo = open_repo()?;
    match repo.head() {
        Ok(head) => {
            let commit = head.peel_to_commit().map_err(|e| e.to_string())?;
            repo.reset_default(Some(commit.as_object()), ["*"])
                .map_err(|e| e.to_string())
        }
        Err(_) => {
            let mut index = repo.index().map_err(|e| e.to_string())?;
            index.clear().map_err(|e| e.to_string())?;
            index.write().map_err(|e| e.to_string())
        }
    }
}

#[tauri::command]
pub fn git_discard(path: String) -> Result<(), String> {
    let repo = open_repo()?;
    let full = repo_root().join(&path);

    let is_tracked = {
        let index = repo.index().map_err(|e| e.to_string())?;
        index.get_path(Path::new(&path), 0).is_some()
    };

    if is_tracked {
        let mut checkout = git2::build::CheckoutBuilder::new();
        checkout.path(path.as_str()).force();
        repo.checkout_index(None, Some(&mut checkout))
            .map_err(|e| e.to_string())?;
    } else if full.exists() {
        std::fs::remove_file(&full).map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
pub fn git_commit(message: String) -> Result<String, String> {
    let repo = open_repo()?;
    let mut index = repo.index().map_err(|e| e.to_string())?;
    let tree_id = index.write_tree().map_err(|e| e.to_string())?;
    let tree = repo.find_tree(tree_id).map_err(|e| e.to_string())?;
    let sig = repo.signature().map_err(|e| e.to_string())?;

    let parent_commit = match repo.head() {
        Ok(head) => Some(head.peel_to_commit().map_err(|e| e.to_string())?),
        Err(_) => None,
    };
    let parents: Vec<&git2::Commit> = parent_commit.iter().collect();

    let commit_id = repo
        .commit(Some("HEAD"), &sig, &sig, &message, &tree, &parents)
        .map_err(|e| e.to_string())?;

    Ok(commit_id.to_string())
}

#[tauri::command]
pub fn git_log(limit: usize) -> Result<Vec<CommitInfo>, String> {
    let repo = open_repo()?;
    let mut revwalk = repo.revwalk().map_err(|e| e.to_string())?;
    revwalk
        .set_sorting(Sort::TOPOLOGICAL | Sort::TIME)
        .map_err(|e| e.to_string())?;

    // 推入所有本地分支尖端，这样图谱能画出多分支拓扑，而不只是当前 HEAD 的直系祖先
    if revwalk.push_glob("refs/heads/*").is_err() {
        revwalk.push_head().map_err(|e| e.to_string())?;
    }

    let mut result = Vec::new();
    for oid_res in revwalk {
        if result.len() >= limit {
            break;
        }
        let oid = oid_res.map_err(|e| e.to_string())?;
        let commit = repo.find_commit(oid).map_err(|e| e.to_string())?;
        let author = commit.author();
        let hash = oid.to_string();

        result.push(CommitInfo {
            short_hash: hash.chars().take(7).collect(),
            hash,
            message: commit.summary().unwrap_or("").to_string(),
            author: author.name().unwrap_or("unknown").to_string(),
            timestamp: commit.time().seconds(),
            parents: commit.parent_ids().map(|id| id.to_string()).collect(),
        });
    }

    Ok(result)
}

#[tauri::command]
pub fn git_commit_files(hash: String) -> Result<Vec<FileEntry>, String> {
    let repo = open_repo()?;
    let oid = git2::Oid::from_str(&hash).map_err(|e| e.to_string())?;
    let commit = repo.find_commit(oid).map_err(|e| e.to_string())?;
    let tree = commit.tree().map_err(|e| e.to_string())?;

    let parent_tree = if commit.parent_count() > 0 {
        let parent = commit.parent(0).map_err(|e| e.to_string())?;
        Some(parent.tree().map_err(|e| e.to_string())?)
    } else {
        None
    };

    let mut opts = DiffOptions::new();
    let diff = repo
        .diff_tree_to_tree(parent_tree.as_ref(), Some(&tree), Some(&mut opts))
        .map_err(|e| e.to_string())?;

    let mut files = Vec::new();
    for delta in diff.deltas() {
        let status = match delta.status() {
            Delta::Added | Delta::Copied => "A",
            Delta::Deleted => "D",
            Delta::Renamed => "R",
            _ => "M",
        };
        let path = delta
            .new_file()
            .path()
            .or_else(|| delta.old_file().path())
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_default();
        if path.is_empty() {
            continue;
        }
        files.push(FileEntry {
            path,
            status: status.to_string(),
        });
    }

    Ok(files)
}
