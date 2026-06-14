export const DEFAULT_BACKEND_URL =
  import.meta.env.VITE_BACKEND_WS_URL || 'wss://chibi.carrot-atelier.online';

export function normalizeBackendUrl(value: string) {
  return value.trim().replace(/^ws:\/\//, 'wss://');
}

/**
 * Derive HTTP API base URL from the WebSocket URL.
 * wss://chibi.carrot-atelier.online  →  https://chibi.carrot-atelier.online
 * ws://localhost:3001               →  http://localhost:3001
 */
export function getApiBaseUrl(wsUrl: string): string {
  return wsUrl
    .replace(/^wss:\/\//, 'https://')
    .replace(/^ws:\/\//, 'http://')
    .replace(/\/$/, ''); // remove trailing slash
}
