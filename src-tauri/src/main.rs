#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod explorer;
mod source_control;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .manage(source_control::git::RepoState::new())
        .manage(explorer::fs::ExplorerState::new())
        .invoke_handler(tauri::generate_handler![
            explorer::fs::explorer_set_current_project,
            explorer::fs::explorer_list_dir,
            explorer::fs::explorer_read_file,
            explorer::fs::explorer_create_file,
            explorer::fs::explorer_create_dir,
            explorer::fs::explorer_rename,
            explorer::fs::explorer_move,
            explorer::fs::explorer_delete,
            explorer::fs::explorer_duplicate,
              explorer::fs::explorer_reveal,
              explorer::fs::explorer_open_current_project,
              explorer::fs::explorer_open_current_project_in_vscode,
            explorer::fs::explorer_search,
            explorer::fs::explorer_find_files,
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
