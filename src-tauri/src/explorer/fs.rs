use git2::Repository;
use glob::Pattern;
use notify::Watcher;
use regex::RegexBuilder;
use serde::Serialize;
use std::fs;
use std::path::{Component, Path, PathBuf};
use std::process::Command;
use std::sync::Mutex;
use tauri::{Emitter, State};
use tauri_plugin_opener::OpenerExt;

const MAX_PREVIEW_BYTES: u64 = 2 * 1024 * 1024;
/// Event name the frontend listens to for "something changed under the watched root".
/// Payload is intentionally omitted (frontend just refreshes whatever's currently expanded) —
/// mapping raw OS paths back to our forward-slash relative-path cache keys reliably across
/// platforms is more trouble than it's worth for what's ultimately a "please re-check" signal.
const WATCH_EVENT: &str = "explorer://changed";

#[derive(Serialize, Clone, Debug, PartialEq)]
pub struct ExplorerEntry {
    pub name: String,
    pub path: String,
    #[serde(rename = "isDir")]
    pub is_dir: bool,
    pub ignored: bool,
}

#[derive(Serialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ExplorerSearchMatch {
    pub line: usize,
    pub column: usize,
    pub preview: String,
    pub before_text: String,
    pub matched_text: String,
    pub after_text: String,
}

#[derive(Serialize, Clone, Debug, PartialEq)]
pub struct ExplorerSearchFile {
    pub path: String,
    pub matches: Vec<ExplorerSearchMatch>,
}

#[derive(Serialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ExplorerSearchResult {
    pub files: Vec<ExplorerSearchFile>,
    pub total_matches: usize,
    pub truncated: bool,
}

pub struct ExplorerState {
    root: Mutex<PathBuf>,
    /// Kept alive for as long as we want to keep watching; dropping it stops the watch.
    watcher: Mutex<Option<notify::RecommendedWatcher>>,
}

impl ExplorerState {
    pub fn new() -> Self {
        ExplorerState {
            root: Mutex::new(default_root()),
            watcher: Mutex::new(None),
        }
    }
}

fn default_root() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .expect("src-tauri should have a parent directory")
        .to_path_buf()
}

fn project_root(state: &State<ExplorerState>) -> PathBuf {
    state.root.lock().expect("explorer state poisoned").clone()
}

fn to_relative(root: &Path, full: &Path) -> Result<String, String> {
    Ok(full
        .strip_prefix(root)
        .map_err(|e| e.to_string())?
        .to_string_lossy()
        .replace('\\', "/"))
}

fn validate_relative_path(path: &str) -> Result<(), String> {
    if Path::new(path).components().any(|component| {
        matches!(
            component,
            Component::ParentDir | Component::RootDir | Component::Prefix(_)
        )
    }) {
        return Err("路径必须位于当前项目内".to_string());
    }
    Ok(())
}

fn validate_entry_name(name: &str) -> Result<(), String> {
    if name.is_empty()
        || name == "."
        || name == ".."
        || Path::new(name).components().count() != 1
        || name.contains('/')
        || name.contains('\\')
    {
        return Err("名称不能包含路径分隔符".to_string());
    }
    Ok(())
}

fn project_path(root: &Path, relative: &str) -> Result<PathBuf, String> {
    validate_relative_path(relative)?;
    Ok(if relative.is_empty() {
        root.to_path_buf()
    } else {
        root.join(relative)
    })
}

fn start_watching(state: &State<ExplorerState>, app: &tauri::AppHandle, root: &Path) {
    let app_handle = app.clone();
    let mut watcher =
        match notify::recommended_watcher(move |res: notify::Result<notify::Event>| {
            if res.is_ok() {
                let _ = app_handle.emit(WATCH_EVENT, ());
            }
        }) {
            Ok(w) => w,
            Err(_) => return,
        };
    if watcher
        .watch(root, notify::RecursiveMode::Recursive)
        .is_err()
    {
        return;
    }
    *state.watcher.lock().expect("explorer state poisoned") = Some(watcher);
}

/// Filters entries using git2's own ignore rules (falls back to no filtering outside a
/// git repo) so node_modules/target/dist etc. don't flood the tree without a hand-rolled
/// gitignore parser. `show_git_ignored` bypasses that filter (the "Show Git Ignored Files" toggle).
fn list_dir_entries(
    root: &Path,
    relative: &str,
    show_git_ignored: bool,
) -> Result<Vec<ExplorerEntry>, String> {
    let dir = project_path(root, relative)?;
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
            let rel_path = if relative.is_empty() {
                name.clone()
            } else {
                format!("{relative}/{name}")
            };
            let ignored = repo
                .as_ref()
                .is_some_and(|repo| repo.is_path_ignored(&rel_path).unwrap_or(false));
            if !show_git_ignored && ignored {
                return None;
            }
            Some(ExplorerEntry {
                name,
                path: rel_path,
                is_dir,
                ignored,
            })
        })
        .collect();

    entries.sort_by(|a, b| match (a.is_dir, b.is_dir) {
        (true, false) => std::cmp::Ordering::Less,
        (false, true) => std::cmp::Ordering::Greater,
        _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
    });
    Ok(entries)
}

fn copy_dir_recursive(src: &Path, dest: &Path) -> std::io::Result<()> {
    fs::create_dir(dest)?;
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let dest_path = dest.join(entry.file_name());
        if entry.file_type()?.is_dir() {
            copy_dir_recursive(&entry.path(), &dest_path)?;
        } else {
            fs::copy(entry.path(), &dest_path)?;
        }
    }
    Ok(())
}

// ─── Core logic, decoupled from the Tauri State/command machinery so it's unit-testable ───

fn create_file_at(root: &Path, parent_path: &str, name: &str) -> Result<(), String> {
    validate_entry_name(name)?;
    let full = project_path(root, parent_path)?.join(name);
    if full.exists() {
        return Err("同名文件已存在".to_string());
    }
    fs::File::create(&full).map_err(|e| e.to_string())?;
    Ok(())
}

fn create_dir_at(root: &Path, parent_path: &str, name: &str) -> Result<(), String> {
    validate_entry_name(name)?;
    let full = project_path(root, parent_path)?.join(name);
    if full.exists() {
        return Err("同名文件夹已存在".to_string());
    }
    fs::create_dir(&full).map_err(|e| e.to_string())?;
    Ok(())
}

/// Renames within the same parent directory. Returns the new relative path.
fn rename_at(root: &Path, path: &str, new_name: &str) -> Result<String, String> {
    validate_entry_name(new_name)?;
    let full = project_path(root, path)?;
    let parent = full.parent().ok_or("无法确定所在目录")?;
    let new_full = parent.join(new_name);
    if new_full.exists() {
        return Err("目标名称已存在".to_string());
    }
    fs::rename(&full, &new_full).map_err(|e| e.to_string())?;
    to_relative(root, &new_full)
}

/// Moves a file/dir into a different directory (same root), keeping its name. Used for drag & drop.
fn move_at(root: &Path, source_path: &str, dest_dir: &str) -> Result<String, String> {
    let source_full = project_path(root, source_path)?;
    let name = source_full.file_name().ok_or("无效的源路径")?.to_owned();
    let dest_dir_full = project_path(root, dest_dir)?;
    if source_full.is_dir() && dest_dir_full.starts_with(&source_full) {
        return Err("不能将文件夹移动到其自身内部".to_string());
    }
    let dest_full = dest_dir_full.join(&name);
    if dest_full.exists() {
        return Err("目标位置已存在同名文件".to_string());
    }
    fs::rename(&source_full, &dest_full).map_err(|e| e.to_string())?;
    to_relative(root, &dest_full)
}

/// Copies a file/dir alongside itself as "name 副本[.ext]", disambiguating with a counter
/// if that name is already taken. Returns the new relative path.
fn duplicate_at(root: &Path, path: &str) -> Result<String, String> {
    let full = project_path(root, path)?;
    let parent = full.parent().ok_or("无法确定所在目录")?;
    let stem = full
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("untitled")
        .to_string();
    let ext = full
        .extension()
        .and_then(|s| s.to_str())
        .map(|s| s.to_string());
    let is_dir = full.is_dir();

    let name_for = |n: Option<u32>| match (&ext, is_dir) {
        (Some(ext), false) => match n {
            Some(n) => format!("{stem} 副本 {n}.{ext}"),
            None => format!("{stem} 副本.{ext}"),
        },
        _ => match n {
            Some(n) => format!("{stem} 副本 {n}"),
            None => format!("{stem} 副本"),
        },
    };

    let mut candidate = parent.join(name_for(None));
    let mut n = 2;
    while candidate.exists() {
        candidate = parent.join(name_for(Some(n)));
        n += 1;
    }

    if is_dir {
        copy_dir_recursive(&full, &candidate).map_err(|e| e.to_string())?;
    } else {
        fs::copy(&full, &candidate).map_err(|e| e.to_string())?;
    }
    to_relative(root, &candidate)
}

fn parse_patterns(value: &str) -> Vec<Pattern> {
    value
        .split(',')
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .filter_map(|value| Pattern::new(value).ok())
        .collect()
}

fn pattern_matches(pattern: &Pattern, path: &str) -> bool {
    pattern.matches(path) || pattern.matches_path(Path::new(path))
}

fn build_search_matcher(
    query: &str,
    case_sensitive: bool,
    whole_word: bool,
    use_regex: bool,
) -> Result<regex::Regex, String> {
    let expression = if use_regex {
        query.to_string()
    } else {
        regex::escape(query)
    };
    let expression = if whole_word {
        format!(r"\b(?:{expression})\b")
    } else {
        expression
    };
    RegexBuilder::new(&expression)
        .case_insensitive(!case_sensitive)
        .build()
        .map_err(|error| error.to_string())
}

fn search_match_from_line(
    line: &str,
    line_number: usize,
    matcher: &regex::Regex,
) -> Option<ExplorerSearchMatch> {
    let found = matcher.find(line)?;
    let raw_before = line[..found.start()].trim_start();
    let before_text = if raw_before.chars().count() > 26 {
        let tail = raw_before
            .chars()
            .rev()
            .take(26)
            .collect::<String>()
            .chars()
            .rev()
            .collect::<String>();
        format!("…{tail}")
    } else {
        raw_before.to_string()
    };
    Some(ExplorerSearchMatch {
        line: line_number,
        column: line[..found.start()].chars().count() + 1,
        preview: line.trim().to_string(),
        before_text,
        matched_text: line[found.start()..found.end()].to_string(),
        after_text: line[found.end()..].to_string(),
    })
}

fn search_files_with_rg(
    root: &Path,
    query: &str,
    case_sensitive: bool,
    whole_word: bool,
    use_regex: bool,
    include_pattern: &str,
    exclude_pattern: &str,
) -> Result<Option<ExplorerSearchResult>, String> {
    const MAX_MATCHES: usize = 1000;
    let matcher = build_search_matcher(query, case_sensitive, whole_word, use_regex)?;
    let mut command = Command::new("rg");
    command
        .current_dir(root)
        .args(["--line-number", "--column", "--no-heading", "--color", "never"])
        .args(["--hidden", "--max-columns", "4096", "--max-filesize", "2M"])
        .args(["--glob", "!.git/**"]);
    if !case_sensitive {
        command.arg("--ignore-case");
    }
    if whole_word {
        command.arg("--word-regexp");
    }
    if !use_regex {
        command.arg("--fixed-strings");
    }
    for pattern in include_pattern.split(',').map(str::trim).filter(|value| !value.is_empty()) {
        command.args(["--glob", pattern]);
    }
    for pattern in exclude_pattern.split(',').map(str::trim).filter(|value| !value.is_empty()) {
        command.args(["--glob", &format!("!{pattern}")]);
    }
    let output = match command.arg("--").arg(query).arg(".").output() {
        Ok(output) => output,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(None),
        Err(error) => return Err(error.to_string()),
    };
    if !output.status.success() && output.status.code() != Some(1) {
        return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
    }
    let mut result = ExplorerSearchResult {
        files: Vec::new(),
        total_matches: 0,
        truncated: false,
    };
    for output_line in String::from_utf8_lossy(&output.stdout).lines() {
        let mut fields = output_line.splitn(4, ':');
        let path = match fields.next() {
            Some(path) => path.trim_start_matches("./").trim_start_matches(".\\").replace('\\', "/"),
            None => continue,
        };
        let line_number = match fields.next().and_then(|value| value.parse::<usize>().ok()) {
            Some(line_number) => line_number,
            None => continue,
        };
        let _column = fields.next();
        let line = match fields.next() {
            Some(line) => line,
            None => continue,
        };
        let Some(search_match) = search_match_from_line(line, line_number, &matcher) else {
            continue;
        };
        if result.files.last().is_none_or(|file| file.path != path) {
            result.files.push(ExplorerSearchFile { path: path.clone(), matches: Vec::new() });
        }
        if let Some(file) = result.files.last_mut() {
            file.matches.push(search_match);
        }
        result.total_matches += 1;
        if result.total_matches >= MAX_MATCHES {
            result.truncated = true;
            break;
        }
    }
    Ok(Some(result))
}

fn search_files(
    root: &Path,
    query: &str,
    case_sensitive: bool,
    whole_word: bool,
    use_regex: bool,
    include_pattern: &str,
    exclude_pattern: &str,
) -> Result<ExplorerSearchResult, String> {
    const MAX_MATCHES: usize = 1000;
    if query.is_empty() {
        return Ok(ExplorerSearchResult {
            files: Vec::new(),
            total_matches: 0,
            truncated: false,
        });
    }
    if let Some(result) = search_files_with_rg(
        root,
        query,
        case_sensitive,
        whole_word,
        use_regex,
        include_pattern,
        exclude_pattern,
    )? {
        return Ok(result);
    }
    let matcher = build_search_matcher(query, case_sensitive, whole_word, use_regex)?;
    let includes = parse_patterns(include_pattern);
    let excludes = parse_patterns(exclude_pattern);
    let repo = Repository::open(root).ok();
    let mut result = ExplorerSearchResult {
        files: Vec::new(),
        total_matches: 0,
        truncated: false,
    };
    let mut pending = vec![root.to_path_buf()];

    while let Some(directory) = pending.pop() {
        let entries = match fs::read_dir(&directory) {
            Ok(entries) => entries,
            Err(_) => continue,
        };
        for entry in entries.flatten() {
            let full_path = entry.path();
            let relative = match to_relative(root, &full_path) {
                Ok(relative) => relative,
                Err(_) => continue,
            };
            if relative == ".git"
                || relative.starts_with(".git/")
                || excludes
                    .iter()
                    .any(|pattern| pattern_matches(pattern, &relative))
            {
                continue;
            }
            let file_type = match entry.file_type() {
                Ok(file_type) => file_type,
                Err(_) => continue,
            };
            if file_type.is_dir() {
                pending.push(full_path);
                continue;
            }
            if !file_type.is_file()
                || (!includes.is_empty()
                    && !includes
                        .iter()
                        .any(|pattern| pattern_matches(pattern, &relative)))
            {
                continue;
            }
            if repo
                .as_ref()
                .is_some_and(|repo| repo.is_path_ignored(&relative).unwrap_or(false))
            {
                continue;
            }
            if !matches!(entry.metadata(), Ok(metadata) if metadata.len() <= MAX_PREVIEW_BYTES) {
                continue;
            }
            let content = match fs::read_to_string(&full_path) {
                Ok(content) => content,
                Err(_) => continue,
            };
            let mut matches = Vec::new();
            for (line_index, line) in content.lines().enumerate() {
                if let Some(search_match) = search_match_from_line(line, line_index + 1, &matcher) {
                    matches.push(search_match);
                    result.total_matches += 1;
                    if result.total_matches >= MAX_MATCHES {
                        result.truncated = true;
                    }
                }
                if result.truncated {
                    break;
                }
            }
            if !matches.is_empty() {
                result.files.push(ExplorerSearchFile {
                    path: relative,
                    matches,
                });
            }
            if result.truncated {
                return Ok(result);
            }
        }
    }
    result
        .files
        .sort_by(|a, b| a.path.to_lowercase().cmp(&b.path.to_lowercase()));
    Ok(result)
}

// ─── Tauri command wrappers ───

/// Validates the given path is a real directory, switches the app's current explorer root to
/// it, and (re)starts the recursive file watcher on the new root.
#[tauri::command]
pub fn explorer_set_current_project(
    path: String,
    state: State<ExplorerState>,
    app: tauri::AppHandle,
) -> Result<Vec<ExplorerEntry>, String> {
    let candidate = PathBuf::from(&path);
    if !candidate.is_dir() {
        return Err("目录不存在".to_string());
    }
    *state.root.lock().expect("explorer state poisoned") = candidate.clone();
    start_watching(&state, &app, &candidate);
    list_dir_entries(&candidate, "", false)
}

#[tauri::command]
pub fn explorer_list_dir(
    path: Option<String>,
    show_git_ignored: Option<bool>,
    state: State<ExplorerState>,
) -> Result<Vec<ExplorerEntry>, String> {
    let root = project_root(&state);
    list_dir_entries(
        &root,
        &path.unwrap_or_default(),
        show_git_ignored.unwrap_or(false),
    )
}

#[tauri::command]
pub fn explorer_read_file(path: String, state: State<ExplorerState>) -> Result<String, String> {
    let root = project_root(&state);
    let full = project_path(&root, &path)?;
    let metadata = fs::metadata(&full).map_err(|e| e.to_string())?;
    if metadata.len() > MAX_PREVIEW_BYTES {
        return Err("文件过大，无法预览".to_string());
    }
    String::from_utf8(fs::read(&full).map_err(|e| e.to_string())?)
        .map_err(|_| "无法预览此文件（可能是二进制文件）".to_string())
}

#[tauri::command]
pub fn explorer_create_file(
    parent_path: String,
    name: String,
    state: State<ExplorerState>,
) -> Result<(), String> {
    create_file_at(&project_root(&state), &parent_path, &name)
}

#[tauri::command]
pub fn explorer_create_dir(
    parent_path: String,
    name: String,
    state: State<ExplorerState>,
) -> Result<(), String> {
    create_dir_at(&project_root(&state), &parent_path, &name)
}

#[tauri::command]
pub fn explorer_rename(
    path: String,
    new_name: String,
    state: State<ExplorerState>,
) -> Result<String, String> {
    rename_at(&project_root(&state), &path, &new_name)
}

#[tauri::command]
pub fn explorer_move(
    source_path: String,
    dest_dir: String,
    state: State<ExplorerState>,
) -> Result<String, String> {
    move_at(&project_root(&state), &source_path, &dest_dir)
}

/// Sends to the OS trash rather than permanently deleting.
#[tauri::command]
pub fn explorer_delete(paths: Vec<String>, state: State<ExplorerState>) -> Result<(), String> {
    let root = project_root(&state);
    let full_paths: Vec<PathBuf> = paths
        .iter()
        .map(|path| project_path(&root, path))
        .collect::<Result<_, _>>()?;
    trash::delete_all(&full_paths).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn explorer_duplicate(path: String, state: State<ExplorerState>) -> Result<String, String> {
    duplicate_at(&project_root(&state), &path)
}

/// Opens the OS file manager with this path selected.
#[tauri::command]
pub fn explorer_reveal(
    path: String,
    state: State<ExplorerState>,
    app: tauri::AppHandle,
) -> Result<(), String> {
    let root = project_root(&state);
    let full = project_path(&root, &path)?;
    app.opener()
        .reveal_item_in_dir(full)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn explorer_open_current_project(state: State<ExplorerState>) -> Result<(), String> {
    let root = project_root(&state);
    #[cfg(target_os = "windows")]
    let mut command = {
        let mut command = Command::new("explorer.exe");
        command.arg(&root);
        command
    };
    #[cfg(target_os = "macos")]
    let mut command = {
        let mut command = Command::new("open");
        command.arg(&root);
        command
    };
    #[cfg(all(unix, not(target_os = "macos")))]
    let mut command = {
        let mut command = Command::new("xdg-open");
        command.arg(&root);
        command
    };
    command.spawn().map(|_| ()).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn explorer_open_current_project_in_vscode(state: State<ExplorerState>) -> Result<(), String> {
    let root = project_root(&state);
    #[cfg(target_os = "windows")]
    let executable = {
        let local = std::env::var_os("LOCALAPPDATA")
            .map(PathBuf::from)
            .map(|path| path.join("Programs/Microsoft VS Code/Code.exe"));
        let program_files = std::env::var_os("ProgramFiles")
            .map(PathBuf::from)
            .map(|path| path.join("Microsoft VS Code/Code.exe"));
        local
            .filter(|path| path.is_file())
            .or_else(|| program_files.filter(|path| path.is_file()))
            .ok_or_else(|| "未找到 Visual Studio Code".to_string())?
    };
    #[cfg(not(target_os = "windows"))]
    let executable = PathBuf::from("code");
    Command::new(executable)
        .arg(&root)
        .spawn()
        .map(|_| ())
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn explorer_search(
    query: String,
    case_sensitive: bool,
    whole_word: bool,
    use_regex: bool,
    include_pattern: String,
    exclude_pattern: String,
    state: State<ExplorerState>,
) -> Result<ExplorerSearchResult, String> {
    search_files(
        &project_root(&state),
        &query,
        case_sensitive,
        whole_word,
        use_regex,
        &include_pattern,
        &exclude_pattern,
    )
}

#[tauri::command]
pub fn explorer_find_files(
    query: String,
    show_git_ignored: bool,
    state: State<ExplorerState>,
) -> Result<Vec<String>, String> {
    let root = project_root(&state);
    let mut command = Command::new("rg");
    command
        .current_dir(&root)
        .args(["--files", "--hidden", "--glob", "!.git/**"]);
    if show_git_ignored {
        command.arg("--no-ignore");
    }
    let output = match command.output() {
        Ok(output) => output,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
            let lowered = query.to_lowercase();
            let mut paths = Vec::new();
            let mut pending = vec![root.clone()];
            while let Some(directory) = pending.pop() {
                for entry in fs::read_dir(directory).into_iter().flatten().flatten() {
                    let path = entry.path();
                    if path.file_name().is_some_and(|name| name == ".git") {
                        continue;
                    }
                    if path.is_dir() {
                        pending.push(path);
                    } else if let Ok(relative) = to_relative(&root, &path) {
                        if relative.to_lowercase().contains(&lowered) {
                            paths.push(relative);
                        }
                    }
                }
            }
            paths.sort_by_key(|path| path.to_lowercase());
            return Ok(paths);
        }
        Err(error) => return Err(error.to_string()),
    };
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
    }
    let lowered = query.to_lowercase();
    let mut paths = String::from_utf8_lossy(&output.stdout)
        .lines()
        .map(|path| path.replace('\\', "/"))
        .filter(|path| path.to_lowercase().contains(&lowered))
        .collect::<Vec<_>>();
    paths.sort_by_key(|path| path.to_lowercase());
    paths.truncate(2000);
    Ok(paths)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicU32, Ordering};

    static COUNTER: AtomicU32 = AtomicU32::new(0);

    /// A scratch directory under the OS temp dir, removed on drop regardless of test outcome.
    struct TempRoot(PathBuf);

    impl TempRoot {
        fn new() -> Self {
            let n = COUNTER.fetch_add(1, Ordering::SeqCst);
            let dir = std::env::temp_dir()
                .join(format!("tauri-ai-explorer-test-{}-{n}", std::process::id()));
            fs::create_dir_all(&dir).expect("create temp root");
            TempRoot(dir)
        }
        fn path(&self) -> &Path {
            &self.0
        }
    }

    impl Drop for TempRoot {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.0);
        }
    }

    #[test]
    fn create_file_then_list_dir_finds_it() {
        let root = TempRoot::new();
        create_file_at(root.path(), "", "note.txt").unwrap();
        let entries = list_dir_entries(root.path(), "", false).unwrap();
        assert_eq!(
            entries,
            vec![ExplorerEntry {
                name: "note.txt".into(),
                path: "note.txt".into(),
                is_dir: false,
                ignored: false
            }]
        );
    }

    #[test]
    fn create_file_rejects_existing_name() {
        let root = TempRoot::new();
        create_file_at(root.path(), "", "note.txt").unwrap();
        let err = create_file_at(root.path(), "", "note.txt").unwrap_err();
        assert!(!err.is_empty());
    }

    #[test]
    fn create_dir_then_nested_create_file() {
        let root = TempRoot::new();
        create_dir_at(root.path(), "", "sub").unwrap();
        create_file_at(root.path(), "sub", "inner.txt").unwrap();
        let entries = list_dir_entries(root.path(), "sub", false).unwrap();
        assert_eq!(
            entries,
            vec![ExplorerEntry {
                name: "inner.txt".into(),
                path: "sub/inner.txt".into(),
                is_dir: false,
                ignored: false
            }]
        );
    }

    #[test]
    fn rename_moves_the_file_and_returns_new_relative_path() {
        let root = TempRoot::new();
        create_file_at(root.path(), "", "old.txt").unwrap();
        let new_path = rename_at(root.path(), "old.txt", "new.txt").unwrap();
        assert_eq!(new_path, "new.txt");
        assert!(!root.path().join("old.txt").exists());
        assert!(root.path().join("new.txt").exists());
    }

    #[test]
    fn rename_rejects_when_target_name_taken() {
        let root = TempRoot::new();
        create_file_at(root.path(), "", "a.txt").unwrap();
        create_file_at(root.path(), "", "b.txt").unwrap();
        let err = rename_at(root.path(), "a.txt", "b.txt").unwrap_err();
        assert!(!err.is_empty());
        assert!(root.path().join("a.txt").exists());
    }

    #[test]
    fn move_relocates_file_into_destination_dir() {
        let root = TempRoot::new();
        create_dir_at(root.path(), "", "dest").unwrap();
        create_file_at(root.path(), "", "file.txt").unwrap();
        let new_path = move_at(root.path(), "file.txt", "dest").unwrap();
        assert_eq!(new_path, "dest/file.txt");
        assert!(!root.path().join("file.txt").exists());
        assert!(root.path().join("dest/file.txt").exists());
    }

    #[test]
    fn move_rejects_when_destination_already_has_same_name() {
        let root = TempRoot::new();
        create_dir_at(root.path(), "", "dest").unwrap();
        create_file_at(root.path(), "dest", "file.txt").unwrap();
        create_file_at(root.path(), "", "file.txt").unwrap();
        let err = move_at(root.path(), "file.txt", "dest").unwrap_err();
        assert!(!err.is_empty());
        assert!(root.path().join("file.txt").exists());
    }

    #[test]
    fn duplicate_file_appends_copy_suffix_before_extension() {
        let root = TempRoot::new();
        fs::write(root.path().join("doc.txt"), b"hello").unwrap();
        let new_path = duplicate_at(root.path(), "doc.txt").unwrap();
        assert_eq!(new_path, "doc 副本.txt");
        assert_eq!(
            fs::read_to_string(root.path().join("doc 副本.txt")).unwrap(),
            "hello"
        );
    }

    #[test]
    fn duplicate_disambiguates_with_a_counter_when_copy_already_exists() {
        let root = TempRoot::new();
        fs::write(root.path().join("doc.txt"), b"hello").unwrap();
        duplicate_at(root.path(), "doc.txt").unwrap();
        let second = duplicate_at(root.path(), "doc.txt").unwrap();
        assert_eq!(second, "doc 副本 2.txt");
    }

    #[test]
    fn duplicate_directory_copies_recursively() {
        let root = TempRoot::new();
        create_dir_at(root.path(), "", "folder").unwrap();
        fs::write(root.path().join("folder/inner.txt"), b"x").unwrap();
        let new_path = duplicate_at(root.path(), "folder").unwrap();
        assert_eq!(new_path, "folder 副本");
        assert_eq!(
            fs::read_to_string(root.path().join("folder 副本/inner.txt")).unwrap(),
            "x"
        );
    }

    #[test]
    fn list_dir_sorts_directories_before_files_case_insensitively() {
        let root = TempRoot::new();
        create_file_at(root.path(), "", "b.txt").unwrap();
        create_dir_at(root.path(), "", "A").unwrap();
        create_file_at(root.path(), "", "a.txt").unwrap();
        let entries = list_dir_entries(root.path(), "", false).unwrap();
        let names: Vec<_> = entries.iter().map(|e| e.name.as_str()).collect();
        assert_eq!(names, vec!["A", "a.txt", "b.txt"]);
    }

    #[test]
    fn list_dir_skips_dot_git_directory() {
        let root = TempRoot::new();
        create_dir_at(root.path(), "", ".git").unwrap();
        create_file_at(root.path(), "", "readme.md").unwrap();
        let entries = list_dir_entries(root.path(), "", false).unwrap();
        assert_eq!(
            entries,
            vec![ExplorerEntry {
                name: "readme.md".into(),
                path: "readme.md".into(),
                is_dir: false,
                ignored: false
            }]
        );
    }

    #[test]
    fn operations_reject_paths_outside_project_root() {
        let root = TempRoot::new();
        assert!(list_dir_entries(root.path(), "../", false).is_err());
        assert!(create_file_at(root.path(), "..", "escaped.txt").is_err());
        assert!(duplicate_at(root.path(), "../outside.txt").is_err());
    }

    #[test]
    fn create_and_rename_reject_path_like_names() {
        let root = TempRoot::new();
        create_file_at(root.path(), "", "safe.txt").unwrap();
        assert!(create_file_at(root.path(), "", "nested/file.txt").is_err());
        assert!(rename_at(root.path(), "safe.txt", "../escaped.txt").is_err());
    }

    #[test]
    fn move_rejects_directory_descendant_as_destination() {
        let root = TempRoot::new();
        create_dir_at(root.path(), "", "parent").unwrap();
        create_dir_at(root.path(), "parent", "child").unwrap();
        assert!(move_at(root.path(), "parent", "parent/child").is_err());
    }

    #[test]
    fn content_search_groups_matches_by_file_and_line() {
        let root = TempRoot::new();
        fs::write(
            root.path().join("App.tsx"),
            "addProject(first); addProject(second);\naddProject(third);\n",
        )
        .unwrap();
        let result = search_files(root.path(), "addProject(", true, false, false, "*.tsx", "")
            .unwrap();
        assert_eq!(result.total_matches, 2);
        assert_eq!(result.files.len(), 1);
        assert_eq!(result.files[0].matches[0].line, 1);
        assert_eq!(result.files[0].matches[0].matched_text, "addProject(");
    }
}
