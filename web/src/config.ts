export const DEFAULT_BACKEND_URL =
  import.meta.env.VITE_BACKEND_WS_URL || 'wss://chibi.carrot-atelier.online';

export function normalizeBackendUrl(value: string) {
  return value.trim().replace(/^ws:\/\//, 'wss://');
}
