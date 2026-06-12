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
 * Initialize the desktop port.
 * In desktop (Tauri) mode, this polls check_sidecar_ready until the backend
 * is ready, then fetches the port and sets window.__PAPERHELP_PORT__.
 * In web/dev mode, this is a no-op.
 */
let portInitPromise: Promise<void> | null = null;

export async function initDesktopPort(): Promise<void> {
  if (portInitPromise) return portInitPromise;

  portInitPromise = (async () => {
    if (typeof window === 'undefined') return;
    if (window.__PAPERHELP_PORT__) return; // Already set (e.g., by Tauri init script)

    // Detect if running inside Tauri
    const isTauri =
      typeof window !== 'undefined' && '__TAURI__' in window;
    if (!isTauri) return; // Web/dev mode, use default port from env

    // Poll until sidecar is ready (max 60 seconds)
    const maxAttempts = 60;
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const ready = await invoke<boolean>('check_sidecar_ready');
        if (ready) {
          const port = await invoke<number>('get_sidecar_port');
          if (port > 0) {
            window.__PAPERHELP_PORT__ = port;
            console.log(`[Paperhelp Desktop] Sidecar port: ${port}`);
          }
          return;
        }
      } catch {
        // Tauri command failed, retry
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    console.warn('[Paperhelp Desktop] Sidecar did not become ready within 60s');
  })();

  return portInitPromise;
}

export const desktopApi = {
  /** Get the sidecar port number */
  getSidecarPort: () => invoke<number>('get_sidecar_port'),

  /** Check if sidecar is running */
  getSidecarStatus: () => invoke<string>('get_sidecar_status'),

  /** Check if sidecar has finished booting (returns boolean) */
  checkSidecarReady: () => invoke<boolean>('check_sidecar_ready'),

  /** Open the data directory in file explorer */
  openDataDir: () => invoke<void>('open_data_dir'),

  /** Get app version */
  getAppVersion: () => invoke<string>('get_app_version'),

  /** Check if running in desktop mode */
  isDesktop: (): boolean => {
    return typeof window !== 'undefined' && !!window.__PAPERHELP_PORT__;
  },
};
