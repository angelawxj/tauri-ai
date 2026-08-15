#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod source_control;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(source_control::git::RepoState::new())
        .invoke_handler(tauri::generate_handler![
            source_control::git::set_current_project,
            source_control::git::git_status,
            source_control::git::git_stage,
            source_control::git::git_stage_all,
            source_control::git::git_unstage,
            source_control::git::git_unstage_all,
            source_control::git::git_discard,
            source_control::git::git_commit,
            source_control::git::git_log,
            source_control::git::git_history_context,
            source_control::git::git_commit_files,
            source_control::git::git_committed_files,
            source_control::git::git_diff,
            source_control::git::git_commit_diff,
            source_control::git::git_branches,
            source_control::git::git_checkout_branch,
            source_control::git::git_push,
            source_control::git::git_fetch,
            source_control::git::git_pull,
            source_control::git::git_force_push,
            source_control::git::git_rebase_main,
            source_control::git::git_abort_merge,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
