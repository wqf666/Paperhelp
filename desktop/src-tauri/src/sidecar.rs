use std::sync::Mutex;
use std::time::{Duration, Instant};

use log::{error, info, warn};
use tauri_plugin_shell::process::CommandEvent;
use tauri_plugin_shell::ShellExt;

/// Shared state for the FastAPI sidecar process.
pub struct SidecarState {
    pub port: Mutex<u16>,
    pub child: Mutex<Option<tauri_plugin_shell::process::CommandChild>>,
}

// ---------------------------------------------------------------------------
// Port helpers
// ---------------------------------------------------------------------------

/// Check whether a TCP port is available by attempting to bind to it.
fn is_port_available(port: u16) -> bool {
    std::net::TcpListener::bind(("127.0.0.1", port)).is_ok()
}

/// Find an available port starting from `base_port`, trying up to `max_attempts`
/// consecutive ports.
fn find_available_port(
    base_port: u16,
    max_attempts: u16,
) -> Result<u16, Box<dyn std::error::Error>> {
    for offset in 0..max_attempts {
        let port = base_port + offset;
        if is_port_available(port) {
            info!("Port {} is available", port);
            return Ok(port);
        }
        warn!("Port {} is already in use, trying next...", port);
    }
    Err(format!(
        "No available port found in range {}-{}",
        base_port,
        base_port + max_attempts - 1
    )
    .into())
}

// ---------------------------------------------------------------------------
// Data directory helpers
// ---------------------------------------------------------------------------

/// Return the Paperhelp data directory (under the platform config dir),
/// creating it and its standard sub-directories if they do not exist.
fn prepare_data_dirs() -> Result<std::path::PathBuf, Box<dyn std::error::Error>> {
    let data_dir = dirs::config_dir()
        .ok_or("Cannot determine platform config directory")?
        .join("Paperhelp");

    std::fs::create_dir_all(&data_dir)?;
    std::fs::create_dir_all(data_dir.join("db"))?;
    std::fs::create_dir_all(data_dir.join("storage"))?;
    std::fs::create_dir_all(data_dir.join("export"))?;

    info!("Data directory: {}", data_dir.display());
    Ok(data_dir)
}

// ---------------------------------------------------------------------------
// Health-check
// ---------------------------------------------------------------------------

/// Poll `GET /health` on the sidecar until it responds 2xx or `timeout`
/// elapses. Uses `reqwest::blocking` so it must NOT be called from an async
/// context.
fn wait_for_health(port: u16, timeout: Duration) -> Result<(), Box<dyn std::error::Error>> {
    let url = format!("http://127.0.0.1:{}/health", port);
    let start = Instant::now();

    while start.elapsed() < timeout {
        match reqwest::blocking::get(&url) {
            Ok(resp) if resp.status().is_success() => {
                info!("Sidecar health check passed on port {}", port);
                return Ok(());
            }
            Ok(resp) => {
                info!(
                    "Sidecar responded with status {}, retrying...",
                    resp.status()
                );
            }
            Err(_) => {
                // Sidecar not ready yet – keep waiting
            }
        }
        std::thread::sleep(Duration::from_millis(500));
    }

    Err(format!(
        "Sidecar did not become healthy within {} seconds",
        timeout.as_secs()
    )
    .into())
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/// Start the FastAPI sidecar process.
///
/// 1. Picks an available port (18080-18089).
/// 2. Prepares the data / db / storage / export directories.
/// 3. Spawns the sidecar with the required environment variables.
/// 4. Forwards stdout / stderr to the `log` crate on a background thread.
/// 5. Blocks until the `/health` endpoint responds (up to 30 s).
///
/// Returns a [`SidecarState`] that the caller should register via
/// `app.manage()`.
pub fn start_sidecar(app: &tauri::App) -> Result<SidecarState, Box<dyn std::error::Error>> {
    // 1. Port
    let port = find_available_port(18080, 10)?;
    let port_str = port.to_string();

    // 2. Directories
    let data_dir = prepare_data_dirs()?;
    let db_path = data_dir
        .join("db")
        .join("paperhelp.db")
        .to_string_lossy()
        .replace('\\', "/");
    let db_url = format!("sqlite:///{}", db_path);
    let storage_path = data_dir.join("storage").to_string_lossy().to_string();
    let export_path = data_dir.join("export").to_string_lossy().to_string();

    // Allow overriding from the outer environment (useful for development)
    let mock_llm = std::env::var("MOCK_LLM").unwrap_or_else(|_| "false".to_string());

    info!(
        "Starting sidecar: PORT={}, DATABASE_URL={}, STORAGE_PATH={}, EXPORT_PATH={}, MOCK_LLM={}",
        port, db_url, storage_path, export_path, mock_llm
    );

    // 3. Spawn
    let (rx, child) = app
        .shell()
        .sidecar("fastapi-server")
        .map_err(|e| format!("Failed to create sidecar command: {}", e))?
        .env("PORT", &port_str)
        .env("DATABASE_URL", &db_url)
        .env("STORAGE_PATH", &storage_path)
        .env("EXPORT_PATH", &export_path)
        .env("MOCK_LLM", &mock_llm)
        .spawn()
        .map_err(|e| format!("Failed to spawn sidecar: {}", e))?;

    // 4. Forward sidecar output to logs on a background thread.
    //    `rx` is a `std::sync::mpsc::Receiver<CommandEvent>`; `recv()` blocks
    //    until an event arrives or the sender is dropped (process terminated).
    std::thread::spawn(move || {
        let rx = rx;
        loop {
            match rx.recv() {
                Ok(CommandEvent::Stdout(line)) => {
                    info!("[sidecar stdout] {}", String::from_utf8_lossy(&line));
                }
                Ok(CommandEvent::Stderr(line)) => {
                    warn!("[sidecar stderr] {}", String::from_utf8_lossy(&line));
                }
                Ok(CommandEvent::Terminated(payload)) => {
                    info!(
                        "[sidecar] Process terminated (exit code: {:?}, signal: {:?})",
                        payload.code, payload.signal
                    );
                    break;
                }
                Ok(CommandEvent::Error(err)) => {
                    error!("[sidecar] Error event: {}", err);
                    break;
                }
                Ok(_) => {}
                Err(_) => {
                    // Channel closed – sidecar process ended
                    info!("[sidecar] Event channel closed");
                    break;
                }
            }
        }
    });

    // 5. Health-check (blocking – this runs during setup, before the window is shown)
    if let Err(e) = wait_for_health(port, Duration::from_secs(30)) {
        error!("Sidecar health check failed: {} – killing process", e);
        let _ = child.kill();
        return Err(e);
    }

    info!("Sidecar is running on port {}", port);

    Ok(SidecarState {
        port: Mutex::new(port),
        child: Mutex::new(Some(child)),
    })
}

/// Attempt a graceful shutdown of the sidecar.
///
/// 1. Send `POST /shutdown` to the FastAPI process.
/// 2. Poll `/health` for up to 5 seconds waiting for it to stop.
/// 3. If it is still alive, force-kill the child process.
pub fn stop_sidecar(state: &SidecarState) {
    let port = *state.port.lock().unwrap();
    info!("Stopping sidecar on port {}...", port);

    // 1. Graceful shutdown request
    let shutdown_url = format!("http://127.0.0.1:{}/shutdown", port);
    let client = reqwest::blocking::Client::builder()
        .timeout(Duration::from_secs(3))
        .build()
        .unwrap_or_else(|_| reqwest::blocking::Client::new());

    if let Err(e) = client.post(&shutdown_url).send() {
        warn!("Failed to send shutdown request: {}", e);
    } else {
        info!("Shutdown request sent, waiting for sidecar to stop...");
    }

    // 2. Wait for the process to become unresponsive
    let health_url = format!("http://127.0.0.1:{}/health", port);
    let start = Instant::now();
    let graceful_timeout = Duration::from_secs(5);

    while start.elapsed() < graceful_timeout {
        if reqwest::blocking::get(&health_url).is_err() {
            info!("Sidecar stopped gracefully");
            // Clean up the child handle
            let _ = state.child.lock().unwrap().take();
            return;
        }
        std::thread::sleep(Duration::from_millis(200));
    }

    // 3. Force kill
    warn!("Sidecar did not stop gracefully – force killing...");
    let mut child_lock = state.child.lock().unwrap();
    if let Some(child) = child_lock.take() {
        if let Err(e) = child.kill() {
            error!("Failed to kill sidecar process: {}", e);
        } else {
            info!("Sidecar process killed");
        }
    }
}
