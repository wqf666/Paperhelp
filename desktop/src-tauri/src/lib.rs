use tauri::Manager;

mod commands;
mod sidecar;
mod tray;

pub fn run() {
    env_logger::init();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            // Start the FastAPI sidecar
            let sidecar_handle = sidecar::start_sidecar(app)?;
            app.manage(sidecar_handle);

            // Set up system tray menu
            tray::setup_tray(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_sidecar_port,
            commands::get_sidecar_status,
            commands::open_data_dir,
            commands::get_app_version,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| match event {
            tauri::RunEvent::ExitRequested { api, .. } => {
                // Graceful shutdown: tell sidecar to stop
                let state = app_handle.state::<sidecar::SidecarState>();
                sidecar::stop_sidecar(state);
                api.prevent_exit();
                // Actually exit after cleanup
                std::thread::spawn(|| {
                    std::thread::sleep(std::time::Duration::from_secs(2));
                    std::process::exit(0);
                });
            }
            tauri::RunEvent::WindowEvent {
                label,
                event: tauri::WindowEvent::CloseRequested { api, .. },
                ..
            } => {
                // Minimize to tray instead of closing
                if let Some(window) = app_handle.get_webview_window(&label) {
                    window.hide().unwrap_or_default();
                    api.prevent_close();
                }
            }
            _ => {}
        });
}
