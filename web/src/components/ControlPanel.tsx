// Removed unused React
import { Mic, Square, Settings, WifiOff, Cpu, BookOpen, Camera, CameraOff } from 'lucide-react';
import { CustomEmoji } from './CustomEmoji';

interface ControlPanelProps {
  isRecording: boolean;
  isConnected: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onOpenSettings: () => void;
  onOpenFirmwareFlasher: () => void;
  onOpenManual: () => void;
  onConnect: () => void;
  cameraEnabled: boolean;
  onToggleCamera: () => void;
  voiceMode: 'phone' | 'robot';
  onToggleVoiceMode: () => void;
}

export function ControlPanel({
  isRecording,
  isConnected,
  onStartRecording,
  onStopRecording,
  onOpenSettings,
  onOpenFirmwareFlasher,
  onOpenManual,
  onConnect,
  cameraEnabled,
  onToggleCamera,
  voiceMode,
  onToggleVoiceMode,
}: ControlPanelProps) {
  return (
    <div className="glass-panel" style={{ 
      display: 'grid', 
      gridTemplateColumns: '1.2fr auto 1.2fr',
      alignItems: 'center', 
      padding: '16px 24px',
      marginTop: 'auto',
      marginBottom: '24px',
      width: '100%',
      maxWidth: '600px',
      gap: '8px',
      background: '#FFFFFF',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifySelf: 'start' }}>
        {!isConnected ? (
          <>
            <WifiOff color="var(--danger)" size={20} />
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
              未連線
            </span>
            <button 
              className="btn-primary" 
              onClick={onConnect}
              style={{ padding: '6px 12px', fontSize: '0.75rem', marginLeft: '8px', boxShadow: '2px 2px 0px #111111' }}
            >
              重新連線
            </button>
          </>
        ) : (
          <button 
            className="btn-secondary" 
            onClick={onToggleVoiceMode}
            title="切換語音收發模式"
            style={{
              padding: '6px 12px',
              fontSize: '0.8rem',
              borderRadius: '8px',
              background: voiceMode === 'phone' ? '#FFFFFF' : 'var(--accent-blue)',
              color: voiceMode === 'phone' ? '#111111' : '#FFFFFF',
              border: '2px solid #111111',
              boxShadow: '2px 2px 0px #111111',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 700,
            }}
          >
            {voiceMode === 'phone' ? (
              <>
                <CustomEmoji name="phone" size={14} />
                <span>手機模式</span>
              </>
            ) : (
              <>
                <CustomEmoji name="robot" size={14} />
                <span>機器人模式</span>
              </>
            )}
          </button>
        )}
      </div>

      <button 
        className="btn-icon" 
        style={{ 
          width: '64px', height: '64px',
          background: isRecording ? 'var(--danger)' : 'var(--accent-yellow)',
          color: isRecording ? 'white' : '#111111',
          borderColor: '#111111',
          borderWidth: '2px',
          transform: isRecording ? 'scale(1.1)' : 'scale(1)',
          boxShadow: isRecording ? '2px 2px 0px #111111' : '3px 3px 0px #111111',
          animation: isRecording ? 'pulse-glow 1.5s infinite' : 'none'
        }}
        onClick={isRecording ? onStopRecording : onStartRecording}
      >
        {isRecording ? <Square size={24} fill="currentColor" /> : <Mic size={28} />}
      </button>

      <div style={{ display: 'flex', gap: '12px', justifySelf: 'end' }}>
        <button className="btn-icon" onClick={onToggleCamera} title={cameraEnabled ? "關閉影像" : "開啟影像"}>
          {cameraEnabled ? <Camera size={20} /> : <CameraOff size={20} color="var(--danger)" />}
        </button>
        <button className="btn-icon" onClick={onOpenManual} title="使用手冊">
          <BookOpen size={20} />
        </button>
        <button className="btn-icon" onClick={onOpenFirmwareFlasher} title="韌體刷機">
          <Cpu size={20} />
        </button>
        <button className="btn-icon" onClick={onOpenSettings} title="設定">
          <Settings size={20} />
        </button>
      </div>
    </div>
  );
}

