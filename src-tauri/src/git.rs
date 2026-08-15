use git2::{BranchType, Delta, DiffOptions, IndexAddOption, Repository, Sort, Status};
use serde::Serialize;
use std::collections::HashMap;
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
    /// local branch / tag names pointing at this commit
    pub refs: Vec<String>,
}

#[derive(Serialize)]
pub struct BranchInfo {
    pub name: String,
    #[serde(rename = "isHead")]
    pub is_head: bool,
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
    let result = match repo.head() {
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
    };
    result
}

#[tauri::command]
pub fn git_unstage_all() -> Result<(), String> {
    let repo = open_repo()?;
    let result = match repo.head() {
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
    };
    result
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

    // commit hash -> 指向它的本地分支/tag 短名，用于历史面板的 ref 徽章
    let mut ref_map: HashMap<String, Vec<String>> = HashMap::new();
    let refs = repo.references().map_err(|e| e.to_string())?;
    for r in refs {
        let r = r.map_err(|e| e.to_string())?;
        let name = r.name().unwrap_or("").to_string();
        if name.starts_with("refs/remotes/") && name.ends_with("/HEAD") {
            continue;
        }
        let short = name
            .strip_prefix("refs/heads/")
            .or_else(|| name.strip_prefix("refs/remotes/"))
            .or_else(|| name.strip_prefix("refs/tags/"))
            .map(|s| s.to_string());
        if let Some(short_name) = short {
            if let Ok(commit) = r.peel_to_commit() {
                ref_map.entry(commit.id().to_string()).or_default().push(short_name);
            }
        }
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

        let refs = ref_map.get(&hash).cloned().unwrap_or_default();
        result.push(CommitInfo {
            short_hash: hash.chars().take(7).collect(),
            hash,
            message: commit.summary().unwrap_or("").to_string(),
            author: author.name().unwrap_or("unknown").to_string(),
            timestamp: commit.time().seconds(),
            parents: commit.parent_ids().map(|id| id.to_string()).collect(),
            refs,
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

/// 未跟踪文件手写一份"整个文件都是新增"的 unified diff。
/// 不走 libgit2 的 workdir diff：实测在这台机器上 `diff_index_to_workdir` 对未跟踪文件
/// 返回的 delta 里 hunk 数始终是 0（size/exists 等元信息正常，就是读不到内容），
/// 直接读文件内容自己拼输出更简单可靠。
fn synthesize_new_file_diff(path: &str) -> Result<String, String> {
    let full = repo_root().join(path);
    let content = std::fs::read_to_string(&full).map_err(|e| e.to_string())?;
    let line_count = content.lines().count();
    let mut out = format!("diff --git a/{path} b/{path}\nnew file mode 100644\n--- /dev/null\n+++ b/{path}\n");
    if line_count > 0 {
        out.push_str(&format!("@@ -0,0 +1,{line_count} @@\n"));
        for line in content.lines() {
            out.push('+');
            out.push_str(line);
            out.push('\n');
        }
    }
    Ok(out)
}

#[tauri::command]
pub fn git_diff(path: String, staged: bool) -> Result<String, String> {
    let repo = open_repo()?;

    if !staged {
        let index = repo.index().map_err(|e| e.to_string())?;
        if index.get_path(Path::new(&path), 0).is_none() {
            // 不在暂存区里 = 未跟踪文件，走手写 diff
            return synthesize_new_file_diff(&path);
        }
    }

    let mut opts = DiffOptions::new();
    opts.pathspec(&path);

    let diff = if staged {
        let tree = match repo.head() {
            Ok(head) => Some(head.peel_to_tree().map_err(|e| e.to_string())?),
            Err(_) => None,
        };
        let index = repo.index().map_err(|e| e.to_string())?;
        repo.diff_tree_to_index(tree.as_ref(), Some(&index), Some(&mut opts))
            .map_err(|e| e.to_string())?
    } else {
        let index = repo.index().map_err(|e| e.to_string())?;
        repo.diff_index_to_workdir(Some(&index), Some(&mut opts))
            .map_err(|e| e.to_string())?
    };

    let mut out = String::new();
    diff.print(git2::DiffFormat::Patch, |_delta, _hunk, line| {
        match line.origin() {
            '+' | '-' | ' ' => out.push(line.origin()),
            _ => {}
        }
        out.push_str(&String::from_utf8_lossy(line.content()));
        true
    })
    .map_err(|e| e.to_string())?;

    Ok(out)
}

#[tauri::command]
pub fn git_branches() -> Result<Vec<BranchInfo>, String> {
    let repo = open_repo()?;
    let branches = repo
        .branches(Some(BranchType::Local))
        .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for entry in branches {
        let (branch, _) = entry.map_err(|e| e.to_string())?;
        let name = match branch.name().map_err(|e| e.to_string())? {
            Some(n) if !n.is_empty() => n.to_string(),
            _ => continue,
        };
        result.push(BranchInfo {
            is_head: branch.is_head(),
            name,
        });
    }

    Ok(result)
}

#[tauri::command]
pub fn git_push(branch: String) -> Result<String, String> {
    // 走系统 git 而不是 git2 的 push API：这个仓库的 remote 是 SSH，直接调用系统 git
    // 能复用用户机器上已经配置好的 SSH agent / credential helper，不用在 Rust 里重新实现凭证逻辑。
    let output = std::process::Command::new("git")
        .args(["push", "origin", &branch])
        .current_dir(repo_root())
        .output()
        .map_err(|e| e.to_string())?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    if output.status.success() {
        Ok(format!("{stdout}{stderr}"))
    } else {
        Err(if stderr.is_empty() { stdout } else { stderr })
    }
}

#[tauri::command]
pub fn git_checkout_branch(name: String) -> Result<(), String> {
    let repo = open_repo()?;
    let branch_ref = format!("refs/heads/{name}");
    let target = repo
        .revparse_single(&branch_ref)
        .map_err(|e| e.to_string())?;

    let mut checkout = git2::build::CheckoutBuilder::new();
    checkout.safe();
    repo.checkout_tree(&target, Some(&mut checkout))
        .map_err(|e| e.to_string())?;
    repo.set_head(&branch_ref).map_err(|e| e.to_string())
}
