import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { DEFAULT_BACKEND_URL, normalizeBackendUrl } from '../config';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: { apiKey: string; ollamaEndpoint: string; enableMachineOps: boolean; backendUrl: string }) => void;
  onSyncToRobot?: (url: string) => void;
  robotConnected?: boolean;
  webConnected?: boolean;
}

export function SettingsModal({ isOpen, onClose, onSave, onSyncToRobot, robotConnected, webConnected }: SettingsModalProps) {
  const [apiKey, setApiKey] = useState('');
  const [ollamaEndpoint, setOllamaEndpoint] = useState('http://localhost:11434');
  const [backendUrl, setBackendUrl] = useState(DEFAULT_BACKEND_URL);
  const [enableMachineOps, setEnableMachineOps] = useState(false);

  useEffect(() => {
    const savedApiKey = localStorage.getItem('geminiApiKey');
    const savedEndpoint = localStorage.getItem('ollamaEndpoint');
    const savedUrl = localStorage.getItem('backendUrl');
    const savedOps = localStorage.getItem('enableMachineOps');

    if (savedApiKey) setApiKey(savedApiKey);
    if (savedEndpoint) setOllamaEndpoint(savedEndpoint);
    setBackendUrl(normalizeBackendUrl(savedUrl || DEFAULT_BACKEND_URL));
    setEnableMachineOps(savedOps === 'true');
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    localStorage.setItem('geminiApiKey', apiKey);
    localStorage.setItem('ollamaEndpoint', ollamaEndpoint);
    const normalizedUrl = normalizeBackendUrl(backendUrl);
    localStorage.setItem('backendUrl', normalizedUrl);
    localStorage.setItem('enableMachineOps', enableMachineOps.toString());
    onSave({ apiKey, ollamaEndpoint, enableMachineOps, backendUrl: normalizedUrl });
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(4px)',
    }}>
      <div className="glass-panel" style={{ width: '460px', padding: '24px', position: 'relative' }}>
        <button onClick={onClose} className="btn-icon" style={{ position: 'absolute', top: '16px', right: '16px', width: '32px', height: '32px' }}>
          <X size={16} />
        </button>

        <h2 style={{ marginBottom: '24px' }}>設定</h2>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            後端 WebSocket 網址
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              className="input-glass"
              value={backendUrl}
              onChange={(e) => setBackendUrl(e.target.value)}
              placeholder="wss://chibi.carrot-atelier.online"
              style={{ flex: 1 }}
            />
            {onSyncToRobot && (
              <button
                className="btn-secondary"
                disabled={!webConnected || !robotConnected}
                onClick={() => onSyncToRobot(backendUrl)}
                title={(!webConnected || !robotConnected) ? "需要網頁與機器人皆連線至目前的伺服器" : "將此後端網址發送給機器人，使機器人切換並重啟"}
                style={{
                  fontSize: '0.8rem',
                  padding: '0 12px',
                  whiteSpace: 'nowrap',
                  opacity: (!webConnected || !robotConnected) ? 0.5 : 1,
                  cursor: (!webConnected || !robotConnected) ? 'not-allowed' : 'pointer'
                }}
              >
                同步到機器人
              </button>
            )}
          </div>
          <small style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', display: 'block', marginTop: '4px' }}>
            正式環境建議使用 wss://；本機測試才使用 ws://。
          </small>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Gemini API Key
          </label>
          <input
            type="password"
            className="input-glass"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="AIzaSy..."
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Ollama Endpoint
          </label>
          <input
            type="text"
            className="input-glass"
            value={ollamaEndpoint}
            onChange={(e) => setOllamaEndpoint(e.target.value)}
            placeholder="http://localhost:11434"
          />
        </div>

        <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="checkbox"
            id="enableOps"
            checked={enableMachineOps}
            onChange={(e) => setEnableMachineOps(e.target.checked)}
            style={{ width: '18px', height: '18px', accentColor: 'var(--accent-blue)' }}
          />
          <label htmlFor="enableOps" style={{ fontSize: '0.9rem', color: 'var(--text-primary)', cursor: 'pointer' }}>
            啟用機器人動作控制
          </label>
        </div>

        <button className="btn-primary" style={{ width: '100%' }} onClick={handleSave}>
          儲存設定
        </button>
      </div>
    </div>
  );
}
