import { useState, useEffect, useRef, useCallback } from 'react';

export function useWebSocket(url: string, onBinaryMessage?: (data: Blob) => void) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(url);
    ws.binaryType = 'blob'; // Ensure we receive Blob objects

    ws.onopen = () => {
      console.log('Connected to WebSocket server');
      setIsConnected(true);
    };

    ws.onclose = () => {
      console.log('Disconnected from WebSocket server');
      setIsConnected(false);
      // Auto-reconnect after 3 seconds
      setTimeout(connect, 3000);
    };

    ws.onerror = (error) => {
      console.error('WebSocket Error:', error);
      ws.close();
    };

    ws.onmessage = (event) => {
      if (event.data instanceof Blob) {
        if (onBinaryMessage) {
          onBinaryMessage(event.data);
        }
        return;
      }
      
      try {
        const data = JSON.parse(event.data);
        setLastMessage(data);
      } catch (err) {
        setLastMessage(event.data);
      }
    };

    wsRef.current = ws;
  }, [url, onBinaryMessage]);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
    };
  }, [connect]);

  const sendMessage = useCallback((msg: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } else {
      console.warn('WebSocket is not connected');
    }
  }, []);

  return { isConnected, lastMessage, sendMessage };
}
