use log::info;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{TrayIconBuilder, TrayIconEvent};
use tauri::Manager;

/// Create and configure the system tray icon, menu, and event handlers.
pub fn setup_tray(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    // Menu items
    let show = MenuItem::with_id(app, "show", "打开主窗口", true, None::<&str>)?;
    let settings = MenuItem::with_id(app, "settings", "设置", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;

    let menu = Menu::with_items(app, &[&show, &settings, &quit])?;

    TrayIconBuilder::new()
        .menu(&menu)
        .tooltip("Paperhelp - 科研论文写作助手")
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => {
                info!("Tray: show main window");
                if let Some(window) = app.get_webview_window("main") {
                    window.show().unwrap_or_default();
                    window.set_focus().unwrap_or_default();
                }
            }
            "settings" => {
                info!("Tray: open settings");
                if let Some(window) = app.get_webview_window("main") {
                    window.show().unwrap_or_default();
                    window.set_focus().unwrap_or_default();
                    // Navigate to settings page
                    window
                        .eval("window.location.href = '/settings'")
                        .unwrap_or_default();
                }
            }
            "quit" => {
                info!("Tray: quit requested");
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::DoubleClick { .. } = event {
                let app = tray.app_handle();
                if let Some(window) = app.get_webview_window("main") {
                    window.show().unwrap_or_default();
                    window.set_focus().unwrap_or_default();
                }
            }
        })
        .build(app)?;

    info!("System tray initialized");
    Ok(())
}
