// Removed unused React
import { Mic, Square, Settings, Wifi, WifiOff, Cpu, BookOpen, Camera, CameraOff } from 'lucide-react';

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
}

export function ControlPanel({ isRecording, isConnected, onStartRecording, onStopRecording, onOpenSettings, onOpenFirmwareFlasher, onOpenManual, onConnect, cameraEnabled, onToggleCamera }: ControlPanelProps) {
  return (
    <div className="glass-panel" style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between',
      padding: '16px 24px',
      marginTop: 'auto',
      marginBottom: '24px',
      width: '100%',
      maxWidth: '600px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {isConnected ? <Wifi color="var(--success)" size={20} /> : <WifiOff color="var(--danger)" size={20} />}
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          {isConnected ? '已連線 (Connected)' : '未連線 (Disconnected)'}
        </span>
        {!isConnected && (
          <button 
            className="btn-primary" 
            onClick={onConnect}
            style={{ padding: '4px 8px', fontSize: '0.75rem', marginLeft: '8px' }}
          >
            重新連線
          </button>
        )}
      </div>

      <button 
        className="btn-icon" 
        style={{ 
          width: '64px', height: '64px',
          background: isRecording ? 'var(--danger)' : 'var(--glass-bg)',
          color: isRecording ? 'white' : 'var(--accent-blue)',
          borderColor: isRecording ? 'var(--danger)' : 'var(--accent-blue)',
          transform: isRecording ? 'scale(1.1)' : 'scale(1)',
          animation: isRecording ? 'pulse-glow 1.5s infinite' : 'none'
        }}
        onClick={isRecording ? onStopRecording : onStartRecording}
      >
        {isRecording ? <Square size={24} fill="currentColor" /> : <Mic size={28} />}
      </button>

      <div style={{ display: 'flex', gap: '12px' }}>
        <button className="btn-icon" onClick={onToggleCamera} title={cameraEnabled ? "關閉影像 (Disable Camera)" : "開啟影像 (Enable Camera)"}>
          {cameraEnabled ? <Camera size={20} /> : <CameraOff size={20} color="var(--danger)" />}
        </button>
        <button className="btn-icon" onClick={onOpenManual} title="使用手冊 (Manual)">
          <BookOpen size={20} />
        </button>
        <button className="btn-icon" onClick={onOpenFirmwareFlasher} title="韌體刷機 (Firmware Flasher)">
          <Cpu size={20} />
        </button>
        <button className="btn-icon" onClick={onOpenSettings} title="設定 (Settings)">
          <Settings size={20} />
        </button>
      </div>
    </div>
  );
}
