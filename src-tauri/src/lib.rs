mod commands;
mod document_bridge;
mod render_bridge;
mod settings;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(document_bridge::AppDocumentState::default())
        .manage(render_bridge::AppRenderState::default())
        .invoke_handler(tauri::generate_handler![
            // Existing
            commands::greet,
            commands::get_app_info,
            // File operations
            commands::save_project,
            commands::load_project,
            commands::export_image_data,
            commands::get_temp_dir,
            commands::list_files,
            commands::file_exists,
            commands::create_directory,
            // Settings
            commands::save_settings,
            commands::load_settings,
            commands::get_app_data_dir,
            // Image processing
            commands::decode_image_dimensions,
            commands::read_image_as_base64,
            // Video
            commands::extract_video_frames,
            // System
            commands::open_in_explorer,
            commands::get_system_fonts,
            // Document bridge (Phase 0)
            document_bridge::get_document,
            document_bridge::set_document,
            document_bridge::apply_command,
            document_bridge::undo_document,
            document_bridge::redo_document,
            document_bridge::get_history_state,
            document_bridge::load_legacy_rbl,
            // Render bridge (Phase 2)
            render_bridge::render_frame,
            render_bridge::export_render,
            // Hit-testing (Phase 3)
            render_bridge::hit_test,
            render_bridge::hit_test_all,
            render_bridge::marquee_select,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|_app_handle, event| {
            if let tauri::RunEvent::Exit = event {
                // Force-terminate the process to ensure all WebView2 child
                // processes and memory are fully cleaned up on Windows.
                std::process::exit(0);
            }
        });
}
