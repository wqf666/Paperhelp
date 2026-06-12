use crate::sidecar::SidecarState;

/// Return the port number that the sidecar is listening on.
#[tauri::command]
pub fn get_sidecar_port(state: tauri::State<'_, SidecarState>) -> u16 {
    *state.port.lock().unwrap()
}

/// Check whether the sidecar is healthy by hitting its `/health` endpoint.
#[tauri::command]
pub async fn get_sidecar_status(state: tauri::State<'_, SidecarState>) -> Result<String, String> {
    let port = *state.port.lock().map_err(|e| e.to_string())?;
    let url = format!("http://127.0.0.1:{}/health", port);
    match reqwest::get(&url).await {
        Ok(resp) if resp.status().is_success() => Ok("running".to_string()),
        _ => Ok("stopped".to_string()),
    }
}

/// Open the Paperhelp data directory in the system file manager.
#[tauri::command]
pub fn open_data_dir() -> Result<(), String> {
    let data_dir = dirs::config_dir()
        .ok_or_else(|| "Cannot determine platform config directory".to_string())?
        .join("Paperhelp");
    std::fs::create_dir_all(&data_dir).map_err(|e| e.to_string())?;
    open::that(&data_dir).map_err(|e| format!("Failed to open directory: {}", e))
}

/// Return the application version from `Cargo.toml`.
#[tauri::command]
pub fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}
