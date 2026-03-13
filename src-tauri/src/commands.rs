use std::collections::BTreeSet;
use std::fs;
use std::path::Path;

use base64::Engine as _;
use image::GenericImageView;
use serde::Serialize;
use tauri::Manager;

use crate::settings;

// ---------------------------------------------------------------------------
// App info (existing)
// ---------------------------------------------------------------------------

#[derive(Serialize)]
pub struct AppInfo {
    pub name: String,
    pub version: String,
    pub author: String,
}

#[tauri::command]
pub fn greet(name: &str) -> String {
    format!("Hello, {}! Welcome to Thamnel Graphics Editor.", name)
}

#[tauri::command]
pub fn get_app_info() -> AppInfo {
    AppInfo {
        name: "Thamnel Graphics Editor".to_string(),
        version: "0.1.0".to_string(),
        author: "Kamrul Islam Rubel".to_string(),
    }
}

// ---------------------------------------------------------------------------
// File operations
// ---------------------------------------------------------------------------

#[tauri::command]
pub fn save_project(path: String, data: String) -> Result<(), String> {
    fs::write(&path, &data).map_err(|e| format!("Failed to save project: {}", e))
}

#[tauri::command]
pub fn load_project(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| format!("Failed to load project: {}", e))
}

#[tauri::command]
pub fn export_image_data(path: String, data: Vec<u8>, format: String) -> Result<(), String> {
    // Validate the format hint (we still just write raw bytes the caller provides)
    let lower = format.to_lowercase();
    if !["png", "jpeg", "jpg", "bmp", "webp"].contains(&lower.as_str()) {
        return Err(format!("Unsupported image format: {}", format));
    }
    fs::write(&path, &data).map_err(|e| format!("Failed to export image: {}", e))
}

#[tauri::command]
pub fn get_temp_dir() -> String {
    std::env::temp_dir().to_string_lossy().to_string()
}

#[tauri::command]
pub fn list_files(dir: String, extensions: Vec<String>) -> Result<Vec<String>, String> {
    let entries =
        fs::read_dir(&dir).map_err(|e| format!("Failed to read directory '{}': {}", dir, e))?;

    let exts_lower: Vec<String> = extensions.iter().map(|e| e.to_lowercase()).collect();

    let mut results: Vec<String> = Vec::new();
    for entry in entries {
        let entry = entry.map_err(|e| format!("Error reading entry: {}", e))?;
        let path = entry.path();
        if path.is_file() {
            if exts_lower.is_empty() {
                results.push(path.to_string_lossy().to_string());
            } else if let Some(ext) = path.extension() {
                if exts_lower.contains(&ext.to_string_lossy().to_lowercase()) {
                    results.push(path.to_string_lossy().to_string());
                }
            }
        }
    }
    results.sort();
    Ok(results)
}

#[tauri::command]
pub fn file_exists(path: String) -> bool {
    Path::new(&path).exists()
}

#[tauri::command]
pub fn create_directory(path: String) -> Result<(), String> {
    fs::create_dir_all(&path).map_err(|e| format!("Failed to create directory: {}", e))
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

#[tauri::command]
pub fn save_settings(app_handle: tauri::AppHandle, data: String) -> Result<(), String> {
    let app_data = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app data dir: {}", e))?;
    fs::create_dir_all(&app_data)
        .map_err(|e| format!("Failed to create app data dir: {}", e))?;
    let file = settings::settings_file_path(&app_data);
    fs::write(&file, &data).map_err(|e| format!("Failed to save settings: {}", e))
}

#[tauri::command]
pub fn load_settings(app_handle: tauri::AppHandle) -> Result<String, String> {
    let app_data = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app data dir: {}", e))?;
    let file = settings::settings_file_path(&app_data);
    if !file.exists() {
        // Return empty JSON object when no settings file yet
        return Ok("{}".to_string());
    }
    fs::read_to_string(&file).map_err(|e| format!("Failed to load settings: {}", e))
}

#[tauri::command]
pub fn get_app_data_dir(app_handle: tauri::AppHandle) -> Result<String, String> {
    let dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app data dir: {}", e))?;
    Ok(dir.to_string_lossy().to_string())
}

// ---------------------------------------------------------------------------
// Image processing (basic)
// ---------------------------------------------------------------------------

#[tauri::command]
pub fn decode_image_dimensions(path: String) -> Result<(u32, u32), String> {
    let img =
        image::open(&path).map_err(|e| format!("Failed to open image '{}': {}", path, e))?;
    let (w, h) = img.dimensions();
    Ok((w, h))
}

#[tauri::command]
pub fn read_image_as_base64(path: String) -> Result<String, String> {
    let bytes = fs::read(&path).map_err(|e| format!("Failed to read file '{}': {}", path, e))?;
    Ok(base64::engine::general_purpose::STANDARD.encode(&bytes))
}

// ---------------------------------------------------------------------------
// Video frame extraction via FFmpeg
// ---------------------------------------------------------------------------

#[derive(Serialize)]
pub struct ExtractedFrame {
    pub timestamp: String,
    pub base64_png: String,
}

/// Try to find FFmpeg executable. Searches:
/// 1. The provided path (if it exists)
/// 2. Tools/ subdirectory relative to the exe
/// 3. The WPF project's Tools directory
/// 4. Common Windows install locations
/// 5. System PATH (just "ffmpeg")
fn find_ffmpeg(hint: &str) -> Result<String, String> {
    // 1. If the hint is a valid path to an existing file, use it
    if !hint.is_empty() && hint != "ffmpeg" {
        let p = Path::new(hint);
        if p.exists() {
            return Ok(hint.to_string());
        }
    }

    // 2. Tools/ next to the running executable
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            let tools_ffmpeg = exe_dir.join("Tools").join("ffmpeg.exe");
            if tools_ffmpeg.exists() {
                return Ok(tools_ffmpeg.to_string_lossy().to_string());
            }
        }
    }

    // 3. WPF project's Tools directory (development fallback)
    let wpf_paths = [
        r"C:\Users\admin\source\repos\rubeldbc\Thamnel\Thamnel\bin\Debug\net8.0-windows\Tools\ffmpeg.exe",
        r"C:\Users\admin\source\repos\rubeldbc\Thamnel\Thamnel\bin\Release\net8.0-windows\Tools\ffmpeg.exe",
    ];
    for p in &wpf_paths {
        if Path::new(p).exists() {
            return Ok(p.to_string());
        }
    }

    // 4. Common locations
    let common = [
        r"C:\ffmpeg\bin\ffmpeg.exe",
        r"C:\Program Files\ffmpeg\bin\ffmpeg.exe",
        r"C:\Tools\ffmpeg.exe",
    ];
    for p in &common {
        if Path::new(p).exists() {
            return Ok(p.to_string());
        }
    }

    // 5. Try "ffmpeg" from PATH - test by running it
    match std::process::Command::new("ffmpeg")
        .arg("-version")
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .output()
    {
        Ok(output) if output.status.success() => return Ok("ffmpeg".to_string()),
        _ => {}
    }

    Err("FFmpeg not found. Please install FFmpeg or set the correct path in Settings.".to_string())
}

/// Get video duration in seconds by parsing FFmpeg stderr output.
fn get_video_duration(ffmpeg_path: &str, video_path: &str) -> Result<f64, String> {
    let output = std::process::Command::new(ffmpeg_path)
        .args(["-i", video_path])
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .output()
        .map_err(|e| format!("Failed to run FFmpeg at '{}': {}", ffmpeg_path, e))?;

    let stderr = String::from_utf8_lossy(&output.stderr);

    // Parse "Duration: HH:MM:SS.ff" from stderr
    // FFmpeg outputs like: "  Duration: 00:03:45.67, start: ..."
    for line in stderr.lines() {
        if let Some(pos) = line.find("Duration:") {
            let after_duration = &line[pos + 9..]; // skip "Duration:"
            let trimmed = after_duration.trim_start();
            // Now trimmed should start with "HH:MM:SS.ff" or "HH:MM:SS,ff"
            let parts: Vec<&str> = trimmed
                .split([':', '.', ','])
                .collect();
            if parts.len() >= 4 {
                let hours: f64 = parts[0].trim().parse().unwrap_or(0.0);
                let mins: f64 = parts[1].trim().parse().unwrap_or(0.0);
                let secs: f64 = parts[2].trim().parse().unwrap_or(0.0);
                let frac: f64 = parts[3].trim_start_matches('0')
                    .chars()
                    .take_while(|c| c.is_ascii_digit())
                    .collect::<String>()
                    .parse::<f64>()
                    .unwrap_or(0.0);
                let frac_str: String = parts[3].chars().take_while(|c| c.is_ascii_digit()).collect();
                let frac_val = if frac_str.is_empty() {
                    0.0
                } else {
                    frac_str.parse::<f64>().unwrap_or(0.0) / 10f64.powi(frac_str.len() as i32)
                };
                let _ = frac; // use frac_val instead
                return Ok(hours * 3600.0 + mins * 60.0 + secs + frac_val);
            }
        }
    }

    Err(format!(
        "Could not parse video duration. FFmpeg stderr:\n{}",
        &stderr[..stderr.len().min(500)]
    ))
}

/// Format seconds to HH:MM:SS.fff string for FFmpeg -ss argument.
fn format_timestamp(seconds: f64) -> String {
    let h = (seconds / 3600.0).floor() as u32;
    let m = ((seconds % 3600.0) / 60.0).floor() as u32;
    let s = seconds % 60.0;
    format!("{:02}:{:02}:{:06.3}", h, m, s)
}

/// Format seconds to mm:ss string for display.
fn format_display_timestamp(seconds: f64) -> String {
    let m = (seconds / 60.0).floor() as u32;
    let s = (seconds % 60.0).floor() as u32;
    format!("{:02}:{:02}", m, s)
}

#[tauri::command]
pub async fn extract_video_frames(
    video_path: String,
    ffmpeg_path: String,
    frame_count: u32,
) -> Result<Vec<ExtractedFrame>, String> {
    // Resolve FFmpeg path
    let resolved_ffmpeg = find_ffmpeg(&ffmpeg_path)?;
    let frame_count = frame_count.clamp(1, 100);

    // Get video duration
    let duration = get_video_duration(&resolved_ffmpeg, &video_path)?;
    if duration < 0.5 {
        return Err("Video is too short to extract frames".to_string());
    }

    // Calculate interval
    let interval = duration / frame_count as f64;
    let actual_count = if interval < 0.5 {
        (duration / 0.5).floor() as u32
    } else {
        frame_count
    };
    let actual_interval = duration / actual_count.max(1) as f64;

    // Create temp directory for frames
    let temp_dir = std::env::temp_dir().join(format!(
        "thamnel_frames_{}",
        uuid::Uuid::new_v4().simple()
    ));
    fs::create_dir_all(&temp_dir)
        .map_err(|e| format!("Failed to create temp directory: {}", e))?;

    let mut frames: Vec<ExtractedFrame> = Vec::new();

    for i in 0..actual_count {
        let timestamp_sec = (i as f64) * actual_interval;
        if timestamp_sec >= duration {
            break;
        }

        let ts_str = format_timestamp(timestamp_sec);
        let output_path = temp_dir.join(format!("frame_{:04}.jpg", i));
        let output_str = output_path.to_string_lossy().to_string();

        // Run FFmpeg: -ss TIMESTAMP -i INPUT -vframes 1 -q:v 2 -y OUTPUT
        let result = std::process::Command::new(&resolved_ffmpeg)
            .args([
                "-ss",
                &ts_str,
                "-i",
                &video_path,
                "-vframes",
                "1",
                "-q:v",
                "2",
                "-y",
                &output_str,
            ])
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped())
            .output();

        if let Ok(_output) = result {
            if output_path.exists() {
                if let Ok(bytes) = fs::read(&output_path) {
                    if !bytes.is_empty() {
                        let b64 =
                            base64::engine::general_purpose::STANDARD.encode(&bytes);
                        frames.push(ExtractedFrame {
                            timestamp: format_display_timestamp(timestamp_sec),
                            base64_png: format!("data:image/jpeg;base64,{}", b64),
                        });
                    }
                }
                let _ = fs::remove_file(&output_path);
            }
        }
    }

    // Cleanup temp directory
    let _ = fs::remove_dir_all(&temp_dir);

    if frames.is_empty() {
        return Err(format!(
            "No frames could be extracted from '{}'. FFmpeg path: '{}'",
            video_path, resolved_ffmpeg
        ));
    }

    Ok(frames)
}

// ---------------------------------------------------------------------------
// System
// ---------------------------------------------------------------------------

#[tauri::command]
pub fn open_in_explorer(path: String) -> Result<(), String> {
    let p = Path::new(&path);
    let dir = if p.is_dir() {
        p
    } else {
        p.parent()
            .ok_or_else(|| "Cannot determine parent directory".to_string())?
    };

    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(dir.as_os_str())
            .spawn()
            .map_err(|e| format!("Failed to open explorer: {}", e))?;
    }

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(dir.as_os_str())
            .spawn()
            .map_err(|e| format!("Failed to open Finder: {}", e))?;
    }

    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(dir.as_os_str())
            .spawn()
            .map_err(|e| format!("Failed to open file manager: {}", e))?;
    }

    Ok(())
}

#[tauri::command]
pub fn get_system_fonts() -> Vec<String> {
    let mut fonts = BTreeSet::new();

    #[cfg(target_os = "windows")]
    {
        // Scan the Windows Fonts directory
        if let Ok(windir) = std::env::var("WINDIR") {
            let fonts_dir = Path::new(&windir).join("Fonts");
            if let Ok(entries) = fs::read_dir(&fonts_dir) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if let Some(ext) = path.extension() {
                        let ext_lower = ext.to_string_lossy().to_lowercase();
                        if ["ttf", "otf", "ttc"].contains(&ext_lower.as_str()) {
                            if let Some(stem) = path.file_stem() {
                                let name = stem.to_string_lossy().to_string();
                                // Clean up common suffixes to approximate family names
                                let family = name
                                    .trim_end_matches(" Bold")
                                    .trim_end_matches(" Italic")
                                    .trim_end_matches(" Regular")
                                    .trim_end_matches(" Light")
                                    .trim_end_matches(" Medium")
                                    .trim_end_matches(" Thin")
                                    .trim_end_matches(" Black")
                                    .trim_end_matches("bd")
                                    .trim_end_matches("bi")
                                    .trim_end_matches("it")
                                    .to_string();
                                if !family.is_empty() {
                                    fonts.insert(family);
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    #[cfg(target_os = "macos")]
    {
        let font_dirs = [
            "/System/Library/Fonts",
            "/Library/Fonts",
        ];
        for font_dir in &font_dirs {
            if let Ok(entries) = fs::read_dir(font_dir) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if let Some(ext) = path.extension() {
                        let ext_lower = ext.to_string_lossy().to_lowercase();
                        if ["ttf", "otf", "ttc"].contains(&ext_lower.as_str()) {
                            if let Some(stem) = path.file_stem() {
                                fonts.insert(stem.to_string_lossy().to_string());
                            }
                        }
                    }
                }
            }
        }
    }

    #[cfg(target_os = "linux")]
    {
        let font_dirs = [
            "/usr/share/fonts",
            "/usr/local/share/fonts",
        ];
        fn collect_fonts_recursive(dir: &Path, fonts: &mut BTreeSet<String>) {
            if let Ok(entries) = fs::read_dir(dir) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if path.is_dir() {
                        collect_fonts_recursive(&path, fonts);
                    } else if let Some(ext) = path.extension() {
                        let ext_lower = ext.to_string_lossy().to_lowercase();
                        if ["ttf", "otf", "ttc"].contains(&ext_lower.as_str()) {
                            if let Some(stem) = path.file_stem() {
                                fonts.insert(stem.to_string_lossy().to_string());
                            }
                        }
                    }
                }
            }
        }
        for font_dir in &font_dirs {
            collect_fonts_recursive(Path::new(font_dir), &mut fonts);
        }
    }

    fonts.into_iter().collect()
}
