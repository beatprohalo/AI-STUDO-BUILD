// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn save_file(path: String, content: Vec<u8>) -> Result<(), String> {
    use std::fs;
    use std::path::Path;
    
    let path = Path::new(&path);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    
    fs::write(path, content).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn capture_screenshot() -> Result<String, String> {
    use std::process::Command;
    
    // Use system screenshot command (works on macOS, Linux, Windows)
    let output = if cfg!(target_os = "macos") {
        Command::new("screencapture")
            .arg("-c") // Copy to clipboard
            .arg("-x") // Don't play sound
            .output()
    } else if cfg!(target_os = "windows") {
        Command::new("powershell")
            .args(&["-Command", "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Screen]::PrimaryScreen.Bounds"])
            .output()
    } else {
        // Linux fallback
        Command::new("gnome-screenshot")
            .arg("-c")
            .output()
    };

    match output {
        Ok(_) => Ok("screenshot_captured".to_string()),
        Err(e) => Err(format!("Failed to capture screenshot: {}", e))
    }
}

#[tauri::command]
async fn get_clipboard_text() -> Result<String, String> {
    use std::process::Command;
    
    let output = if cfg!(target_os = "macos") {
        Command::new("pbpaste").output()
    } else if cfg!(target_os = "windows") {
        Command::new("powershell")
            .args(&["-Command", "Get-Clipboard"])
            .output()
    } else {
        // Linux fallback
        Command::new("xclip")
            .args(&["-selection", "clipboard", "-o"])
            .output()
    };

    match output {
        Ok(output) => {
            if output.status.success() {
                Ok(String::from_utf8_lossy(&output.stdout).to_string())
            } else {
                Err("Failed to get clipboard content".to_string())
            }
        }
        Err(e) => Err(format!("Failed to access clipboard: {}", e))
    }
}

#[derive(serde::Serialize)]
struct ScannedFile {
    name: String,
    path: String,
    file_type: String,
    size: u64,
}

#[tauri::command]
async fn scan_directory_for_audio_files(directory_path: String) -> Result<Vec<ScannedFile>, String> {
    use std::fs;
    use std::path::Path;
    use tokio::task;
    
    let path = Path::new(&directory_path);
    if !path.exists() {
        return Err("Directory does not exist".to_string());
    }
    
    if !path.is_dir() {
        return Err("Path is not a directory".to_string());
    }
    
    let audio_extensions = ["wav", "mp3", "aiff", "flac", "m4a", "aac", "ogg", "wma"];
    let midi_extensions = ["mid", "midi"];
    
    // Run the scanning in a separate thread to prevent blocking the main thread
    let result = task::spawn_blocking(move || {
        let mut audio_files = Vec::new();
        
        fn scan_recursive(dir: &Path, audio_files: &mut Vec<ScannedFile>, audio_extensions: &[&str], midi_extensions: &[&str]) -> Result<(), String> {
            let entries = fs::read_dir(dir).map_err(|e| format!("Failed to read directory: {}", e))?;
            
            for entry in entries {
                let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
                let path = entry.path();
                
                if path.is_dir() {
                    // Limit recursion depth to prevent excessive scanning
                    if audio_files.len() < 10000 { // Reasonable limit to prevent UI blocking
                        scan_recursive(&path, audio_files, audio_extensions, midi_extensions)?;
                    }
                } else if path.is_file() {
                    if let Some(extension) = path.extension() {
                        let ext_str = extension.to_string_lossy().to_lowercase();
                        
                        if audio_extensions.contains(&ext_str.as_str()) || midi_extensions.contains(&ext_str.as_str()) {
                            let metadata = fs::metadata(&path).map_err(|e| format!("Failed to get file metadata: {}", e))?;
                            let file_size = metadata.len();
                            
                            let file_type = if audio_extensions.contains(&ext_str.as_str()) {
                                "audio".to_string()
                            } else {
                                "midi".to_string()
                            };
                            
                            audio_files.push(ScannedFile {
                                name: path.file_name().unwrap().to_string_lossy().to_string(),
                                path: path.to_string_lossy().to_string(),
                                file_type,
                                size: file_size,
                            });
                        }
                    }
                }
            }
            
            Ok(())
        }
        
        scan_recursive(&path, &mut audio_files, &audio_extensions, &midi_extensions)?;
        Ok(audio_files)
    }).await.map_err(|e| format!("Task failed: {}", e))?;
    
    result
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![greet, save_file, capture_screenshot, get_clipboard_text, scan_directory_for_audio_files])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
