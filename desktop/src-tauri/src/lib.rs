use std::sync::Arc;
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
            // Create an initial (empty) sidecar state so setup completes
            // immediately and the window can render. The actual sidecar process
            // is started on a background thread below.
            let state = Arc::new(sidecar::SidecarState::new_initial());
            app.manage(state.clone());

            // Set up system tray menu
            tray::setup_tray(app)?;

            // Start the sidecar in a background thread so the UI is NOT blocked.
            let handle = app.handle().clone();
            std::thread::spawn(move || {
                log::info!("Background sidecar startup thread started");
                match sidecar::start_sidecar(&handle) {
                    Ok((port, child)) => {
                        let s = handle.state::<Arc<sidecar::SidecarState>>();
                        *s.port.lock().unwrap() = port;
                        *s.child.lock().unwrap() = Some(child);
                        *s.ready.lock().unwrap() = true;
                        log::info!(
                            "Sidecar started successfully on port {}, UI should update",
                            port
                        );
                    }
                    Err(e) => {
                        log::error!("Sidecar failed to start: {}", e);
                        log::error!(
                            "The app UI will remain visible but backend features \
                             will be unavailable. Check logs for details."
                        );
                    }
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_sidecar_port,
            commands::get_sidecar_status,
            commands::check_sidecar_ready,
            commands::open_data_dir,
            commands::get_app_version,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| match event {
            tauri::RunEvent::ExitRequested { api, .. } => {
                // Graceful shutdown: tell sidecar to stop
                let state = app_handle.state::<Arc<sidecar::SidecarState>>();
                sidecar::stop_sidecar(&state);
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
