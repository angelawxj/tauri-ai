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
            git::git_commit_files,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
