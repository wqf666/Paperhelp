/**
 * Desktop-specific API helpers using Tauri IPC.
 * These functions call into the Tauri Rust backend for native features.
 */

// Safely invoke Tauri commands
async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  try {
    // @ts-ignore - Tauri injects this at runtime
    const { invoke: tauriInvoke } = await import('@tauri-apps/api/core');
    return await tauriInvoke<T>(cmd, args);
  } catch {
    // Fallback for web mode (not running in Tauri)
    throw new Error(`Tauri not available: ${cmd}`);
  }
}

/**
 * Initialize the sidecar port for desktop mode.
 * Call this once at app startup. It fetches the port from the Tauri backend
 * and sets window.__PAPERHELP_PORT__ so all API calls use the correct URL.
 * In web/dev mode, this is a no-op.
 */
let portInitPromise: Promise<void> | null = null;

export async function initDesktopPort(): Promise<void> {
  if (portInitPromise) return portInitPromise;

  portInitPromise = (async () => {
    if (typeof window === 'undefined') return;
    if (window.__PAPERHELP_PORT__) return; // Already set (e.g., by Tauri init script)

    try {
      const port = await invoke<number>('get_sidecar_port');
      if (port > 0) {
        window.__PAPERHELP_PORT__ = port;
        console.log(`[Paperhelp Desktop] Sidecar port: ${port}`);
      }
    } catch {
      // Not running in Tauri — web/dev mode, use default
    }
  })();

  return portInitPromise;
}

export const desktopApi = {
  /** Get the sidecar port number */
  getSidecarPort: () => invoke<number>('get_sidecar_port'),

  /** Check if sidecar is running */
  getSidecarStatus: () => invoke<string>('get_sidecar_status'),

  /** Open the data directory in file explorer */
  openDataDir: () => invoke<void>('open_data_dir'),

  /** Get app version */
  getAppVersion: () => invoke<string>('get_app_version'),

  /** Check if running in desktop mode */
  isDesktop: (): boolean => {
    return typeof window !== 'undefined' && !!window.__PAPERHELP_PORT__;
  },
};
