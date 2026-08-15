use git2::{BranchType, Delta, DiffOptions, IndexAddOption, Repository, Sort, Status};
use serde::Serialize;
use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::State;

#[derive(Serialize, Clone)]
pub struct FileEntry {
    pub path: String,
    pub status: String,
    pub additions: u32,
    pub deletions: u32,
}

#[derive(Serialize)]
pub struct GitStatus {
    pub branch: String,
    /// HEAD is included even on a clean working tree so the renderer can
    /// notice commits made by another Git client.
    pub head: Option<String>,
    #[serde(rename = "repoName")]
    pub repo_name: String,
    #[serde(rename = "repoPath")]
    pub repo_path: String,
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
pub struct HistoryRef {
    pub id: String,
    pub name: String,
    pub revision: Option<String>,
}

#[derive(Serialize)]
pub struct GitHistoryContext {
    #[serde(rename = "currentRef")]
    pub current_ref: Option<HistoryRef>,
    #[serde(rename = "remoteRef")]
    pub remote_ref: Option<HistoryRef>,
    #[serde(rename = "baseRef")]
    pub base_ref: Option<HistoryRef>,
    #[serde(rename = "mergeBase")]
    pub merge_base: Option<String>,
    #[serde(rename = "hasIncomingChanges")]
    pub has_incoming_changes: bool,
    #[serde(rename = "hasOutgoingChanges")]
    pub has_outgoing_changes: bool,
}

#[derive(Serialize)]
pub struct BranchInfo {
    pub name: String,
    #[serde(rename = "isHead")]
    pub is_head: bool,
}

/// Holds the repo path the UI is currently pointed at. Defaults to this project's own
/// repo (CARGO_MANIFEST_DIR's parent) so existing single-repo behavior keeps working
/// until the user adds/selects another project from the sidebar.
pub struct RepoState(pub Mutex<PathBuf>);

impl RepoState {
    pub fn new() -> Self {
        RepoState(Mutex::new(default_repo_root()))
    }
}

fn default_repo_root() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .expect("src-tauri should have a parent directory")
        .to_path_buf()
}

fn repo_root(state: &State<RepoState>) -> PathBuf {
    state.0.lock().expect("repo state poisoned").clone()
}

fn open_repo(state: &State<RepoState>) -> Result<Repository, String> {
    Repository::open(repo_root(state)).map_err(|e| e.to_string())
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

fn numstat(args: &[&str], root: &Path) -> HashMap<String, (u32, u32)> {
    let output = std::process::Command::new("git")
        .args(args)
        .current_dir(root)
        .output();
    let Ok(output) = output else { return HashMap::new() };
    if !output.status.success() {
        return HashMap::new();
    }
    String::from_utf8_lossy(&output.stdout)
        .lines()
        .filter_map(|line| {
            let mut parts = line.splitn(3, '\t');
            let additions = parts.next()?.parse::<u32>().ok()?;
            let deletions = parts.next()?.parse::<u32>().ok()?;
            let path = parts.next()?.to_string();
            Some((path, (additions, deletions)))
        })
        .collect()
}

fn untracked_numstat(path: &str, root: &Path) -> (u32, u32) {
    let lines = std::fs::read_to_string(root.join(path))
        .map(|content| content.lines().count() as u32)
        .unwrap_or(0);
    (lines, 0)
}

/// Validates the given path is a git repository and switches the app's current project to it.
#[tauri::command]
pub fn set_current_project(path: String, state: State<RepoState>) -> Result<GitStatus, String> {
    let candidate = PathBuf::from(&path);
    Repository::open(&candidate).map_err(|e| e.to_string())?;
    *state.0.lock().expect("repo state poisoned") = candidate;
    git_status(state)
}

#[tauri::command]
pub fn git_status(state: State<RepoState>) -> Result<GitStatus, String> {
    let repo = open_repo(&state)?;
    let root = repo_root(&state);

    let (branch, head) = match repo.head() {
        Ok(reference) => (
            reference.shorthand().unwrap_or("HEAD").to_string(),
            reference.target().map(|oid| oid.to_string()),
        ),
        Err(_) => ("(无提交)".to_string(), None),
    };

    let mut opts = git2::StatusOptions::new();
    opts.include_untracked(true).recurse_untracked_dirs(true);
    let statuses = repo.statuses(Some(&mut opts)).map_err(|e| e.to_string())?;

    let mut staged = Vec::new();
    let mut unstaged = Vec::new();
    let staged_numstat = numstat(&["diff", "--numstat", "--cached"], &root);
    let unstaged_numstat = numstat(&["diff", "--numstat"], &root);

    for entry in statuses.iter() {
        let s = entry.status();
        let path = match entry.path() {
            Some(p) if !p.is_empty() => p.to_string(),
            _ => continue,
        };

        if s.is_conflicted() {
            unstaged.push(FileEntry {
                path,
                status: "C".to_string(),
                additions: 0,
                deletions: 0,
            });
            continue;
        }

        if let Some(st) = status_char(s, true) {
            let (additions, deletions) = staged_numstat.get(&path).copied().unwrap_or((0, 0));
            staged.push(FileEntry {
                path: path.clone(),
                status: st.to_string(),
                additions,
                deletions,
            });
        }
        if let Some(st) = status_char(s, false) {
            let (additions, deletions) = if st == "U" { untracked_numstat(&path, &root) } else { unstaged_numstat.get(&path).copied().unwrap_or((0, 0)) };
            unstaged.push(FileEntry {
                path,
                status: st.to_string(),
                additions,
                deletions,
            });
        }
    }

    Ok(GitStatus {
        branch,
        head,
        repo_name: root
            .file_name()
            .and_then(|name| name.to_str())
            .unwrap_or("repository")
            .to_string(),
        repo_path: root.to_string_lossy().to_string(),
        staged,
        unstaged,
    })
}

#[tauri::command]
pub fn git_stage(path: String, state: State<RepoState>) -> Result<(), String> {
    let repo = open_repo(&state)?;
    let mut index = repo.index().map_err(|e| e.to_string())?;
    let full = repo_root(&state).join(&path);

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
pub fn git_stage_all(state: State<RepoState>) -> Result<(), String> {
    let repo = open_repo(&state)?;
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
pub fn git_unstage(path: String, state: State<RepoState>) -> Result<(), String> {
    let repo = open_repo(&state)?;
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
pub fn git_unstage_all(state: State<RepoState>) -> Result<(), String> {
    let repo = open_repo(&state)?;
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
pub fn git_discard(path: String, state: State<RepoState>) -> Result<(), String> {
    let repo = open_repo(&state)?;
    let full = repo_root(&state).join(&path);

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
pub fn git_commit(message: String, state: State<RepoState>) -> Result<String, String> {
    let repo = open_repo(&state)?;
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
pub fn git_log(limit: usize, state: State<RepoState>) -> Result<Vec<CommitInfo>, String> {
    let repo = open_repo(&state)?;
    let mut revwalk = repo.revwalk().map_err(|e| e.to_string())?;
    revwalk
        .set_sorting(Sort::TOPOLOGICAL | Sort::TIME)
        .map_err(|e| e.to_string())?;

    // Keep Source Control scoped to the checked-out workspace history. Orca does
    // the same and represents upstream-only commits through boundary rows instead
    // of mixing every local branch tip into the revwalk.
    revwalk.push_head().map_err(|e| e.to_string())?;

    // Orca avoids rendering origin/dev and dev as two separate reference chips.
    // Keep remote-only branches, but drop a remote ref when its local peer exists.
    let local_ref_names: HashSet<String> = repo
        .references()
        .map_err(|e| e.to_string())?
        .filter_map(|reference| {
            let reference = reference.ok()?;
            reference
                .name()?
                .strip_prefix("refs/heads/")
                .map(str::to_string)
        })
        .collect();

    // commit hash -> 指向它的分支/tag 短名，用于历史面板的 ref 徽章
    let mut ref_map: HashMap<String, Vec<String>> = HashMap::new();
    let refs = repo.references().map_err(|e| e.to_string())?;
    for r in refs {
        let r = r.map_err(|e| e.to_string())?;
        let name = r.name().unwrap_or("").to_string();
        if name.starts_with("refs/remotes/") && name.ends_with("/HEAD") {
            continue;
        }
        if let Some(remote_name) = name.strip_prefix("refs/remotes/") {
            if let Some((_, local_peer)) = remote_name.split_once('/') {
                if local_ref_names.contains(local_peer) {
                    continue;
                }
            }
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

/// Supplies the reference relationship that Orca uses to build its history graph.
/// The visible log remains HEAD/local-history only; upstream-only commits are represented
/// by boundary rows in the renderer, using this merge-base information.
#[tauri::command]
pub fn git_history_context(state: State<RepoState>) -> Result<GitHistoryContext, String> {
    let repo = open_repo(&state)?;
    let head = match repo.head() {
        Ok(head) => head,
        Err(_) => {
            return Ok(GitHistoryContext {
                current_ref: None,
                remote_ref: None,
                base_ref: None,
                merge_base: None,
                has_incoming_changes: false,
                has_outgoing_changes: false,
            })
        }
    };
    let head_oid = match head.target() {
        Some(oid) => oid,
        None => {
            return Ok(GitHistoryContext {
                current_ref: None,
                remote_ref: None,
                base_ref: None,
                merge_base: None,
                has_incoming_changes: false,
                has_outgoing_changes: false,
            })
        }
    };
    let branch_name = head.shorthand().unwrap_or("HEAD").to_string();
    let current_ref = HistoryRef {
        id: head.name().unwrap_or("HEAD").to_string(),
        name: branch_name.clone(),
        revision: Some(head_oid.to_string()),
    };

    let remote_ref = if head.is_branch() {
        repo.find_branch(&branch_name, BranchType::Local)
            .ok()
            .and_then(|branch| branch.upstream().ok())
            .and_then(|upstream| {
                let reference = upstream.get();
                let revision = reference.target().or_else(|| reference.peel_to_commit().ok().map(|commit| commit.id()))?;
                Some(HistoryRef {
                    id: reference.name()?.to_string(),
                    name: reference.shorthand()?.to_string(),
                    revision: Some(revision.to_string()),
                })
            })
    } else {
        None
    };

    let merge_base = remote_ref
        .as_ref()
        .and_then(|remote| remote.revision.as_ref())
        .and_then(|revision| git2::Oid::from_str(revision).ok())
        .filter(|remote_oid| *remote_oid != head_oid)
        .and_then(|remote_oid| repo.merge_base(head_oid, remote_oid).ok())
        .map(|oid| oid.to_string());
    let has_incoming_changes = remote_ref
        .as_ref()
        .and_then(|remote| remote.revision.as_ref())
        .zip(merge_base.as_ref())
        .is_some_and(|(remote, base)| remote != base);
    let has_outgoing_changes = merge_base
        .as_ref()
        .is_some_and(|base| head_oid.to_string() != *base);

    // Orca gives the branch at the fork point its own base-ref lane.  Selecting
    // a local ref at the merge base prevents the current branch's blue lane
    // from incorrectly coloring the entire shared history.
    let base_ref = merge_base.as_ref().and_then(|base_revision| {
        let base_oid = git2::Oid::from_str(base_revision).ok()?;
        let mut candidates = repo
            .references()
            .ok()?
            .filter_map(|reference| {
                let reference = reference.ok()?;
                let full_name = reference.name()?.to_string();
                let short_name = full_name.strip_prefix("refs/heads/")?.to_string();
                (reference.target() == Some(base_oid) && full_name != current_ref.id).then_some(HistoryRef {
                    id: full_name,
                    name: short_name,
                    revision: Some(base_revision.clone()),
                })
            })
            .collect::<Vec<_>>();
        candidates.sort_by_key(|reference| match reference.name.as_str() {
            "dev" => 0,
            "main" => 1,
            _ => 2,
        });
        candidates.into_iter().next()
    });

    Ok(GitHistoryContext {
        current_ref: Some(current_ref),
        remote_ref,
        base_ref,
        merge_base,
        has_incoming_changes,
        has_outgoing_changes,
    })
}

#[tauri::command]
pub fn git_commit_files(hash: String, state: State<RepoState>) -> Result<Vec<FileEntry>, String> {
    let repo = open_repo(&state)?;
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
            additions: 0,
            deletions: 0,
        });
    }

    Ok(files)
}

/// 未跟踪文件手写一份"整个文件都是新增"的 unified diff。
/// 不走 libgit2 的 workdir diff：实测在这台机器上 `diff_index_to_workdir` 对未跟踪文件
/// 返回的 delta 里 hunk 数始终是 0（size/exists 等元信息正常，就是读不到内容），
/// 直接读文件内容自己拼输出更简单可靠。
fn synthesize_new_file_diff(path: &str, root: &Path) -> Result<String, String> {
    let full = root.join(path);
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
pub fn git_diff(path: String, staged: bool, state: State<RepoState>) -> Result<String, String> {
    let repo = open_repo(&state)?;

    if !staged {
        let index = repo.index().map_err(|e| e.to_string())?;
        if index.get_path(Path::new(&path), 0).is_none() {
            // 不在暂存区里 = 未跟踪文件，走手写 diff
            return synthesize_new_file_diff(&path, &repo_root(&state));
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

/// Files committed on the current branch relative to its upstream/base. This is
/// intentionally separate from the commit history list, matching Orca's
/// "Committed Changes" source-control section.
#[tauri::command]
pub fn git_committed_files(state: State<RepoState>) -> Result<Vec<FileEntry>, String> {
    let repo = open_repo(&state)?;
    let root = repo_root(&state);
    let head = repo.head().map_err(|e| e.to_string())?;
    let head_oid = match head.target() {
        Some(oid) => oid,
        None => return Ok(Vec::new()),
    };
    let branch_name = head.shorthand().unwrap_or("");
    // Orca's "Committed Changes" is a branch comparison, not a list of commits
    // pending push. The current branch's upstream is the primary comparison
    // target; using origin/main first incorrectly shows old dev history after
    // dev has already been pushed to origin/dev.
    let upstream_oid = repo
        .find_branch(branch_name, BranchType::Local)
        .ok()
        .and_then(|branch| branch.upstream().ok())
        .and_then(|branch| branch.get().target())
        .or_else(|| repo.find_reference("refs/remotes/origin/main").ok().and_then(|reference| reference.target()))
        .or_else(|| repo.find_reference("refs/heads/main").ok().and_then(|reference| reference.target()));
    let Some(upstream_oid) = upstream_oid else { return Ok(Vec::new()) };
    let base_oid = repo.merge_base(head_oid, upstream_oid).unwrap_or(upstream_oid);
    if base_oid == head_oid {
        return Ok(Vec::new());
    }
    let base_tree = repo.find_commit(base_oid).and_then(|commit| commit.tree()).map_err(|e| e.to_string())?;
    let head_tree = repo.find_commit(head_oid).and_then(|commit| commit.tree()).map_err(|e| e.to_string())?;
    let diff = repo.diff_tree_to_tree(Some(&base_tree), Some(&head_tree), None).map_err(|e| e.to_string())?;
    let base_revision = base_oid.to_string();
    let committed_numstat = numstat(&["diff", "--numstat", &base_revision, "HEAD"], &root);
    let mut files = Vec::new();
    for delta in diff.deltas() {
        let status = match delta.status() {
            Delta::Added | Delta::Copied => "A",
            Delta::Deleted => "D",
            Delta::Renamed => "R",
            _ => "M",
        };
        let path = delta.new_file().path().or_else(|| delta.old_file().path()).map(|path| path.to_string_lossy().to_string()).unwrap_or_default();
        if !path.is_empty() {
            let (additions, deletions) = committed_numstat.get(&path).copied().unwrap_or((0, 0));
            files.push(FileEntry { path, status: status.to_string(), additions, deletions });
        }
    }
    Ok(files)
}

/// Returns one file's patch as introduced by a historical commit, compared with
/// its first parent. This powers file clicks inside the lazy commit-history list.
#[tauri::command]
pub fn git_commit_diff(hash: String, path: String, state: State<RepoState>) -> Result<String, String> {
    let repo = open_repo(&state)?;
    let oid = git2::Oid::from_str(&hash).map_err(|e| e.to_string())?;
    let commit = repo.find_commit(oid).map_err(|e| e.to_string())?;
    let tree = commit.tree().map_err(|e| e.to_string())?;
    let parent_tree = if commit.parent_count() > 0 {
        Some(commit.parent(0).map_err(|e| e.to_string())?.tree().map_err(|e| e.to_string())?)
    } else {
        None
    };
    let mut opts = DiffOptions::new();
    opts.pathspec(&path);
    let diff = repo
        .diff_tree_to_tree(parent_tree.as_ref(), Some(&tree), Some(&mut opts))
        .map_err(|e| e.to_string())?;
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
pub fn git_branches(state: State<RepoState>) -> Result<Vec<BranchInfo>, String> {
    let repo = open_repo(&state)?;
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
pub fn git_push(branch: String, state: State<RepoState>) -> Result<String, String> {
    // 走系统 git 而不是 git2 的 push API：这个仓库的 remote 是 SSH，直接调用系统 git
    // 能复用用户机器上已经配置好的 SSH agent / credential helper，不用在 Rust 里重新实现凭证逻辑。
    let output = std::process::Command::new("git")
        .args(["push", "origin", &branch])
        .current_dir(repo_root(&state))
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

fn run_git(args: &[&str], root: &Path) -> Result<String, String> {
    let output = std::process::Command::new("git")
        .args(args)
        .current_dir(root)
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
pub fn git_fetch(state: State<RepoState>) -> Result<String, String> {
    run_git(&["fetch", "origin"], &repo_root(&state))
}

#[tauri::command]
pub fn git_pull(state: State<RepoState>) -> Result<String, String> {
    run_git(&["pull", "--ff-only"], &repo_root(&state))
}

#[tauri::command]
pub fn git_force_push(branch: String, state: State<RepoState>) -> Result<String, String> {
    run_git(&["push", "--force-with-lease", "origin", &branch], &repo_root(&state))
}

#[tauri::command]
pub fn git_rebase_main(state: State<RepoState>) -> Result<String, String> {
    run_git(&["rebase", "origin/main"], &repo_root(&state))
}

#[tauri::command]
pub fn git_abort_merge(state: State<RepoState>) -> Result<String, String> {
    run_git(&["merge", "--abort"], &repo_root(&state))
}

#[tauri::command]
pub fn git_checkout_branch(name: String, state: State<RepoState>) -> Result<(), String> {
    let repo = open_repo(&state)?;
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
