import { getApiBaseUrl } from '../config';

export interface MoveResult {
  ok: boolean;
  action: string;
  duration?: number;
  robotsReached: number;
}

/**
 * Send a move command to the robot via REST API.
 */
export async function robotMove(
  wsUrl: string,
  action: string,
  duration = 500
): Promise<MoveResult> {
  const base = getApiBaseUrl(wsUrl);
  const res = await fetch(`${base}/api/robot/move`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, duration }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

/**
 * Send a stop command to the robot via REST API.
 */
export async function robotStop(wsUrl: string): Promise<MoveResult> {
  const base = getApiBaseUrl(wsUrl);
  const res = await fetch(`${base}/api/robot/stop`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

/**
 * Send an expression command to the robot via REST API.
 */
export async function robotExpression(
  wsUrl: string,
  emotion: string
): Promise<{ ok: boolean; emotion: string; robotsReached: number }> {
  const base = getApiBaseUrl(wsUrl);
  const res = await fetch(`${base}/api/robot/expression`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emotion }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}
