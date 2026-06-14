import { useState, useEffect, useCallback, useRef } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { useAudioRecorder } from './hooks/useAudioRecorder';
import { useAudioPlayer } from './hooks/useAudioPlayer';
import { SettingsModal } from './components/SettingsModal';
import { RobotAvatar } from './components/RobotAvatar';
import { ControlPanel } from './components/ControlPanel';
import { ChatLog, type ChatMessage } from './components/ChatLog';
import { FirmwareFlasher } from './components/FirmwareFlasher';
import { ManualModal } from './components/ManualModal';
import { CameraView } from './components/CameraView';
import { DEFAULT_BACKEND_URL, normalizeBackendUrl } from './config';
import { BackendStatusPanel } from './components/BackendStatusPanel';
import { BackendLogModal, type BackendLogEntry } from './components/BackendLogModal';
import { SnapshotPanel, type Snapshot } from './components/SnapshotPanel';
import { RobotController } from './components/RobotController';

interface BackendStatus {
  web: {
    connected: boolean;
    count: number;
  };
  robot: {
    connected: boolean;
    count: number;
    lastFrameAt: string;
    frameCount: number;
  };
  unknownClients: number;
  updatedAt: string;
}

export default function App() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isFlasherOpen, setIsFlasherOpen] = useState(false);
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [isBackendLogOpen, setIsBackendLogOpen] = useState(false);
  const [isControllerOpen, setIsControllerOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [backendStatus, setBackendStatus] = useState<BackendStatus | null>(null);
  const [backendLogs, setBackendLogs] = useState<BackendLogEntry[]>([]);
  const [robotStatus, setRobotStatus] = useState<'idle' | 'listening' | 'speaking' | 'processing'>('idle');
  const [backendUrl, setBackendUrl] = useState(() => {
    const saved = localStorage.getItem('backendUrl') || DEFAULT_BACKEND_URL;
    // Auto-upgrade ws:// to wss:// because TLS is required in production.
    const upgraded = normalizeBackendUrl(saved);
    if (upgraded !== saved) {
      localStorage.setItem('backendUrl', upgraded);
    }
    return upgraded;
  });
  const [cameraImageUrl, setCameraImageUrl] = useState<string | null>(null);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const latestBlobRef = useRef<Blob | null>(null);

  const handleBinaryMessage = useCallback((blob: Blob) => {
    latestBlobRef.current = blob;
    setCameraImageUrl(prevUrl => {
      if (prevUrl) URL.revokeObjectURL(prevUrl);
      return URL.createObjectURL(blob);
    });
  }, []);

  const handleSnapshot = useCallback(() => {
    const blob = latestBlobRef.current;
    if (!blob) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const newSnap: Snapshot = {
        id: `snap-${Date.now()}`,
        dataUrl,
        timestamp: new Date(),
      };
      setSnapshots(prev => {
        const updated = [newSnap, ...prev];
        // Keep only the latest 10 snapshots
        return updated.slice(0, 10);
      });
    };
    reader.readAsDataURL(blob);
  }, []);

  const handleDeleteSnapshot = useCallback((id: string) => {
    setSnapshots(prev => prev.filter(s => s.id !== id));
  }, []);

  const handleClearSnapshots = useCallback(() => {
    setSnapshots([]);
  }, []);

  const { isConnected, lastMessage, sendMessage, connect } = useWebSocket(backendUrl, handleBinaryMessage);
  const { isRecording, startRecording, stopRecording } = useAudioRecorder();
  const { isPlaying, playBase64Audio, stopPlaying } = useAudioPlayer();

  const getSavedSettings = useCallback((url = backendUrl) => ({
    apiKey: localStorage.getItem('geminiApiKey') || '',
    ollamaEndpoint: localStorage.getItem('ollamaEndpoint') || 'http://localhost:11434',
    enableMachineOps: localStorage.getItem('enableMachineOps') === 'true',
    backendUrl: url,
  }), [backendUrl]);

  useEffect(() => {
    if (isConnected) {
      sendMessage({ type: 'config', settings: getSavedSettings() });
    }
  }, [isConnected, sendMessage, getSavedSettings]);

  useEffect(() => {
    if (!lastMessage) return;

    if (lastMessage.type === 'backend_status') {
      setBackendStatus(lastMessage);
    } else if (lastMessage.type === 'backend_log_snapshot') {
      setBackendLogs(lastMessage.logs || []);
    } else if (lastMessage.type === 'backend_log') {
      setBackendLogs(prev => [...prev.slice(-199), lastMessage.entry]);
    } else if (lastMessage.type === 'text') {
      setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'robot', text: lastMessage.data }]);
    } else if (lastMessage.type === 'command') {
      let actionText = '';
      if (lastMessage.action === 'robot_move') {
        const dirMap: Record<string, string> = {
          move_forward: '⬆️ 前進',
          move_backward: '⬇️ 後退',
          turn_left: '⬅️ 左轉',
          turn_right: '➡️ 右轉',
          dance: '💃 跳舞',
          spin_around: '🔄 旋轉',
        };
        actionText = `${dirMap[lastMessage.args.action] || lastMessage.args.action} (${lastMessage.args.duration}ms)`;
      } else if (lastMessage.action === 'robot_expression') {
        const emoMap: Record<string, string> = {
          happy: '😊 開心',
          sad: '😢 難過',
          angry: '😠 生氣',
          surprised: '😮 驚訝',
          neutral: '😐 平靜',
        };
        actionText = `表情：${emoMap[lastMessage.args.emotion] || lastMessage.args.emotion}`;
      }

      if (actionText) {
        setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'robot', text: actionText }]);
      }
    } else if (lastMessage.type === 'audio_out') {
      setRobotStatus('speaking');
      playBase64Audio(lastMessage.data);
    } else if (lastMessage.type === 'status') {
      setRobotStatus(lastMessage.state);
    }
  }, [lastMessage, playBase64Audio]);

  useEffect(() => {
    if (!isPlaying && robotStatus === 'speaking') {
      setRobotStatus('idle');
    }
  }, [isPlaying, robotStatus]);

  useEffect(() => {
    if (isRecording) {
      setRobotStatus('listening');
      stopPlaying();
    } else if (!isRecording && robotStatus === 'listening') {
      setRobotStatus('processing');
    }
  }, [isRecording, robotStatus, stopPlaying]);

  const handleStartRecording = () => {
    startRecording();
  };

  const handleStopRecording = async () => {
    const base64Audio = await stopRecording();
    if (base64Audio) {
      setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'user', text: '語音訊息', type: 'audio' }]);
      sendMessage({ type: 'audio', data: base64Audio });
    } else {
      setRobotStatus('idle');
    }
  };

  const handleSaveSettings = (settings: { apiKey: string; ollamaEndpoint: string; enableMachineOps: boolean; backendUrl: string }) => {
    const normalizedUrl = normalizeBackendUrl(settings.backendUrl);
    setBackendUrl(normalizedUrl);
    sendMessage({ type: 'config', settings: getSavedSettings(normalizedUrl) });
  };

  const handleToggleCamera = useCallback(() => {
    const newState = !cameraEnabled;
    setCameraEnabled(newState);
    sendMessage({ type: 'camera_control', enabled: newState });
  }, [cameraEnabled, sendMessage]);


  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      minHeight: '100vh',
      padding: '24px',
      position: 'relative',
    }}>
      <h1 style={{
        position: 'absolute',
        top: '24px',
        left: '24px',
        fontSize: '1.2rem',
        color: 'var(--text-secondary)',
      }}>
        Chibi-Moe
      </h1>

      <BackendStatusPanel
        webConnected={isConnected}
        webCount={backendStatus?.web.count || (isConnected ? 1 : 0)}
        robotConnected={backendStatus?.robot.connected || false}
        robotCount={backendStatus?.robot.count || 0}
        lastFrameAt={backendStatus?.robot.lastFrameAt || ''}
        frameCount={backendStatus?.robot.frameCount || 0}
        onOpenLogs={() => setIsBackendLogOpen(true)}
      />

      {/* ★ Robot Controller Entry Button - Most Prominent */}
      <button
        id="enter-robot-controller"
        onClick={() => setIsControllerOpen(true)}
        style={{
          width: '100%',
          maxWidth: '600px',
          padding: '20px 28px',
          marginBottom: '20px',
          background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(139,92,246,0.15))',
          border: '1px solid rgba(59,130,246,0.3)',
          borderRadius: '20px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          transition: 'all 0.35s ease',
          position: 'relative',
          overflow: 'hidden',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(59,130,246,0.25), rgba(139,92,246,0.25))';
          e.currentTarget.style.borderColor = 'rgba(59,130,246,0.5)';
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 12px 40px rgba(59,130,246,0.2)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(139,92,246,0.15))';
          e.currentTarget.style.borderColor = 'rgba(59,130,246,0.3)';
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        {/* Animated glow bg */}
        <div style={{
          position: 'absolute',
          top: '-50%',
          right: '-20%',
          width: '200px',
          height: '200px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59,130,246,0.15), transparent 70%)',
          animation: 'float 6s ease-in-out infinite',
          pointerEvents: 'none',
        }} />

        {/* Robot icon */}
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.6rem',
          flexShrink: 0,
          boxShadow: '0 4px 16px rgba(59,130,246,0.3)',
        }}>
          🤖
        </div>

        {/* Text */}
        <div style={{ flex: 1, textAlign: 'left' }}>
          <div style={{
            fontSize: '1.1rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
            marginBottom: '4px',
          }}>
            機器人操控台
          </div>
          <div style={{
            fontSize: '0.8rem',
            color: 'var(--text-secondary)',
          }}>
            搖桿控制 · 即時影像 · 語音對話 · 拍照
          </div>
        </div>

        {/* Arrow */}
        <div style={{
          color: 'var(--accent-blue)',
          fontSize: '1.3rem',
          fontWeight: 700,
          flexShrink: 0,
        }}>
          →
        </div>
      </button>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', justifyContent: 'center', alignItems: 'flex-start', width: '100%' }}>
        <RobotAvatar status={robotStatus} />
        <CameraView imageUrl={cameraImageUrl} isConnected={isConnected} onSnapshot={handleSnapshot} />
      </div>

      <SnapshotPanel
        snapshots={snapshots}
        onDelete={handleDeleteSnapshot}
        onClearAll={handleClearSnapshots}
      />

      <ChatLog messages={messages} />

      <ControlPanel
        isRecording={isRecording}
        isConnected={isConnected}
        onStartRecording={handleStartRecording}
        onStopRecording={handleStopRecording}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenFirmwareFlasher={() => setIsFlasherOpen(true)}
        onOpenManual={() => setIsManualOpen(true)}
        onConnect={connect}
        cameraEnabled={cameraEnabled}
        onToggleCamera={handleToggleCamera}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={handleSaveSettings}
      />

      <FirmwareFlasher
        isOpen={isFlasherOpen}
        onClose={() => setIsFlasherOpen(false)}
      />

      <ManualModal
        isOpen={isManualOpen}
        onClose={() => setIsManualOpen(false)}
      />

      <BackendLogModal
        isOpen={isBackendLogOpen}
        logs={backendLogs}
        onClose={() => setIsBackendLogOpen(false)}
      />

      {/* Robot Controller Full-Screen */}
      <RobotController
        isOpen={isControllerOpen}
        onClose={() => setIsControllerOpen(false)}
        isConnected={isConnected}
        imageUrl={cameraImageUrl}
        messages={messages}
        robotStatus={robotStatus}
        isRecording={isRecording}
        onStartRecording={handleStartRecording}
        onStopRecording={handleStopRecording}
        backendUrl={backendUrl}
        cameraEnabled={cameraEnabled}
        onToggleCamera={handleToggleCamera}
        snapshots={snapshots}
        onSnapshot={handleSnapshot}
        onDeleteSnapshot={handleDeleteSnapshot}
        onClearSnapshots={handleClearSnapshots}
      />
    </div>
  );
}
