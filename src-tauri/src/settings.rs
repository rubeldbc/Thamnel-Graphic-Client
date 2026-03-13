use std::path::{Path, PathBuf};

/// Returns the path to the settings JSON file inside the given app data directory.
pub fn settings_file_path(app_data_dir: &Path) -> PathBuf {
    app_data_dir.join("settings.json")
}
