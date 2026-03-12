mod commands;
mod settings;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
