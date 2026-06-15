export const DEFAULT_BACKEND_URL =
  import.meta.env.VITE_BACKEND_WS_URL || 'wss://chibi.carrot-atelier.online';

export function normalizeBackendUrl(value: string) {
  const trimmed = value.trim();
  const isLocal = /localhost|127\.0\.0\.1|\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}|\[::1\]/.test(trimmed);
  if (isLocal) {
    return trimmed;
  }
  return trimmed.replace(/^ws:\/\//, 'wss://');
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
