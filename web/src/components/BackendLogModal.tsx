import { X } from 'lucide-react';

export interface BackendLogEntry {
  time: string;
  level: 'info' | 'warn' | 'error';
  message: string;
}

interface BackendLogModalProps {
  isOpen: boolean;
  logs: BackendLogEntry[];
  onClose: () => void;
}

function getLevelColor(level: BackendLogEntry['level']) {
  if (level === 'error') return 'var(--danger)';
  if (level === 'warn') return '#F59E0B';
  return 'var(--text-secondary)';
}

export function BackendLogModal({ isOpen, logs, onClose }: BackendLogModalProps) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2500,
        backdropFilter: 'blur(6px)',
        padding: '20px',
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: 'min(900px, 100%)',
          height: 'min(680px, 86vh)',
          padding: '20px',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '14px',
        }}
      >
        <button
          onClick={onClose}
          className="btn-icon"
          style={{ position: 'absolute', top: '14px', right: '14px', width: '32px', height: '32px' }}
        >
          <X size={16} />
        </button>

        <h2 style={{ fontSize: '1rem', marginBottom: '16px' }}>後端 LOG</h2>

        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            background: 'rgba(0,0,0,0.28)',
            border: '1px solid var(--glass-border)',
            borderRadius: '10px',
            padding: '12px',
            fontFamily: 'Consolas, Monaco, monospace',
            fontSize: '0.78rem',
            lineHeight: 1.5,
          }}
        >
          {logs.length === 0 ? (
            <div style={{ color: 'var(--text-secondary)' }}>尚無 LOG</div>
          ) : (
            logs.map((log, index) => (
              <div key={`${log.time}-${index}`} style={{ color: 'var(--text-primary)', marginBottom: '6px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>
                  {new Date(log.time).toLocaleString()}
                </span>
                <span style={{ color: getLevelColor(log.level), margin: '0 8px', textTransform: 'uppercase' }}>
                  {log.level}
                </span>
                <span>{log.message}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
