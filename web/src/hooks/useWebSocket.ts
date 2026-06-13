import { useState, useEffect, useRef, useCallback } from 'react';

function parseMessage(event: MessageEvent, onBinaryMessage?: (data: Blob) => void) {
  if (event.data instanceof Blob) {
    onBinaryMessage?.(event.data);
    return undefined;
  }

  try {
    return JSON.parse(event.data);
  } catch {
    return event.data;
  }
}

export function useWebSocket(url: string, onBinaryMessage?: (data: Blob) => void) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const manuallyClosedRef = useRef(false);
  const reconnectAttemptsRef = useRef(0);
  const connectRef = useRef<((targetUrl?: string) => void) | null>(null);

  const closeCurrentSocket = useCallback(() => {
    manuallyClosedRef.current = true;
    if (reconnectTimerRef.current !== null) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    wsRef.current?.close();
    wsRef.current = null;
    setIsConnected(false);
  }, []);

  const connect = useCallback((targetUrl = url) => {
    if (!targetUrl) {
      return;
    }

    if (reconnectTimerRef.current !== null) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    const current = wsRef.current;
    if (current?.readyState === WebSocket.OPEN || current?.readyState === WebSocket.CONNECTING) {
      return;
    }

    manuallyClosedRef.current = false;

    const ws = new WebSocket(targetUrl);
    ws.binaryType = 'blob';
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('Connected to WebSocket server:', targetUrl);
      reconnectAttemptsRef.current = 0;
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      const parsed = parseMessage(event, onBinaryMessage);
      if (parsed !== undefined) {
        setLastMessage(parsed);
      }
    };

    ws.onerror = () => {
      // Do not fall back to ws:// because TLS is required in production.
      // The browser still emits its native connection failure in DevTools.
      ws.close();
    };

    ws.onclose = () => {
      if (wsRef.current !== ws) {
        return;
      }

      wsRef.current = null;
      setIsConnected(false);
      if (manuallyClosedRef.current) return;

      reconnectAttemptsRef.current += 1;
      const reconnectDelay = Math.min(30000, 3000 * reconnectAttemptsRef.current);
      reconnectTimerRef.current = window.setTimeout(() => {
        reconnectTimerRef.current = null;
        connectRef.current?.(url);
      }, reconnectDelay);
    };
  }, [url, onBinaryMessage]);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  useEffect(() => {
    closeCurrentSocket();
    manuallyClosedRef.current = false;
    connect(url);

    return () => {
      closeCurrentSocket();
    };
  }, [url, connect, closeCurrentSocket]);

  const sendMessage = useCallback((msg: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(typeof msg === 'string' ? msg : JSON.stringify(msg));
      return true;
    }

    console.warn('WebSocket is not connected');
    return false;
  }, []);

  return { isConnected, lastMessage, sendMessage, connect };
}
