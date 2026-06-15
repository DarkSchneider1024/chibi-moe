import { FileText } from 'lucide-react';
import { CustomEmoji } from './CustomEmoji';

interface BackendStatusPanelProps {
  webConnected: boolean;
  webCount: number;
  robotConnected: boolean;
  robotCount: number;
  lastFrameAt: string;
  frameCount: number;
  onOpenLogs: () => void;
  backendUrl: string;
  onToggleBackend: () => void;
}

function StatusLight({ active }: { active: boolean }) {
  return (
    <span
      style={{
        width: '12px',
        height: '12px',
        borderRadius: '50%',
        background: active ? 'var(--success)' : 'var(--danger)',
        border: '2px solid #111111',
        boxShadow: active ? '2px 2px 0px #111111' : 'none',
        flex: '0 0 auto',
      }}
    />
  );
}

export function BackendStatusPanel({
  webConnected,
  webCount,
  robotConnected,
  robotCount,
  lastFrameAt,
  frameCount,
  onOpenLogs,
  backendUrl,
  onToggleBackend,
}: BackendStatusPanelProps) {
  const lastFrameText = lastFrameAt
    ? new Date(lastFrameAt).toLocaleTimeString()
    : '尚未收到影像';

  const isLocal = /localhost|127\.0\.0\.1|3001/.test(backendUrl);

  return (
    <div
      className="glass-panel"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        padding: '12px 18px',
        margin: '56px 0 16px',
        width: '100%',
        maxWidth: '760px',
        flexWrap: 'wrap',
        borderRadius: '16px',
        background: '#FFFFFF',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <StatusLight active={webConnected} />
        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
          網頁 {webConnected ? '已連線' : '未連線'}
        </span>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
          {webCount} 個
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <StatusLight active={robotConnected} />
        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
          機器人 {robotConnected ? '已連線' : '未連線'}
        </span>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
          {robotCount} 個
        </span>
      </div>

      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', flex: '1 1 180px' }}>
        影像 {frameCount} frames / {lastFrameText}
      </div>

      <button
        className="btn-secondary"
        onClick={onToggleBackend}
        title={isLocal ? "切換至雲端後端 (Switch to Cloud)" : "切換至本地後端 (Switch to Local)"}
        style={{
          padding: '6px 12px',
          fontSize: '0.8rem',
          borderRadius: '8px',
          background: isLocal ? 'var(--accent-yellow)' : '#FFFFFF',
          border: '2px solid #111111',
          boxShadow: '2px 2px 0px #111111',
          color: '#111111',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontWeight: 700,
        }}
      >
        {isLocal ? (
          <>
            <CustomEmoji name="local_pc" size={14} />
            <span>本機後端</span>
          </>
        ) : (
          <>
            <CustomEmoji name="cloud" size={14} />
            <span>雲端後端</span>
          </>
        )}
      </button>

      <button
        className="btn-icon"
        onClick={onOpenLogs}
        title="查看後端 LOG"
        style={{ width: '36px', height: '36px' }}
      >
        <FileText size={18} />
      </button>
    </div>
  );
}

