#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod git;

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            git::git_status,
            git::git_stage,
            git::git_stage_all,
            git::git_unstage,
            git::git_unstage_all,
            git::git_discard,
            git::git_commit,
            git::git_log,
            git::git_history_context,
            git::git_commit_files,
            git::git_committed_files,
            git::git_diff,
            git::git_commit_diff,
            git::git_branches,
            git::git_checkout_branch,
            git::git_push,
            git::git_fetch,
            git::git_pull,
            git::git_force_push,
            git::git_rebase_main,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
