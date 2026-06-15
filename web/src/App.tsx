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
  const [voiceMode, setVoiceMode] = useState<'phone' | 'robot'>(() => {
    return (localStorage.getItem('voiceMode') as 'phone' | 'robot') || 'phone';
  });

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
          move_forward: '前進',
          move_backward: '後退',
          turn_left: '左轉',
          turn_right: '右轉',
          dance: '跳舞',
          spin_around: '旋轉',
        };
        actionText = `${dirMap[lastMessage.args.action] || lastMessage.args.action} (${lastMessage.args.duration}ms)`;
      } else if (lastMessage.action === 'robot_expression') {
        const emoMap: Record<string, string> = {
          happy: '開心',
          sad: '難過',
          angry: '生氣',
          surprised: '驚訝',
          neutral: '平靜',
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
    } else if (lastMessage.type === 'error') {
      setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'system', text: lastMessage.data || '未知錯誤', type: 'error' }]);
      setRobotStatus('idle');
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
    }
  }, [isRecording, stopPlaying]);

  // Handle connection loss during active voice session
  useEffect(() => {
    if (!isConnected && (robotStatus === 'processing' || robotStatus === 'listening' || robotStatus === 'speaking')) {
      setRobotStatus('idle');
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        sender: 'system',
        text: '⚠️ 與伺服器的連線已中斷。',
        type: 'error'
      }]);
    }
  }, [isConnected, robotStatus]);

  // Timeout protection for voice processing status (12 seconds)
  useEffect(() => {
    let timeoutId: number | undefined;

    if (robotStatus === 'processing') {
      timeoutId = window.setTimeout(() => {
        setRobotStatus('idle');
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          sender: 'system',
          text: '⚠️ 語音對話超時，伺服器未能在時間內回應。請稍後重試。',
          type: 'error'
        }]);
      }, 12000); // 12 seconds timeout
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [robotStatus]);

  const handleStartRecording = () => {
    startRecording();
  };

  const handleToggleVoiceMode = useCallback(() => {
    setVoiceMode(prev => {
      const next = prev === 'phone' ? 'robot' : 'phone';
      localStorage.setItem('voiceMode', next);
      return next;
    });
  }, []);

  const handleStopRecording = async () => {
    const base64Audio = await stopRecording();
    if (base64Audio) {
      setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'user', text: '語音訊息', type: 'audio' }]);
      if (!isConnected) {
        setRobotStatus('idle');
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          sender: 'system',
          text: '⚠️ 傳送失敗：未連接至伺服器。',
          type: 'error'
        }]);
        return;
      }

      if (voiceMode === 'robot' && !backendStatus?.robot.connected) {
        setRobotStatus('idle');
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          sender: 'system',
          text: '⚠️ 傳送失敗：機器人小車離線中，無法使用機器人模式。',
          type: 'error'
        }]);
        return;
      }

      setRobotStatus('processing');
      const sent = sendMessage({
        type: 'audio',
        data: base64Audio,
        output_to_robot: voiceMode === 'robot'
      });
      if (!sent) {
        setRobotStatus('idle');
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          sender: 'system',
          text: '⚠️ 語音傳送失敗，請確認連線狀態。',
          type: 'error'
        }]);
      }
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

  const handleToggleBackend = useCallback(() => {
    const isLocal = /localhost|127\.0\.0\.1|3001/.test(backendUrl);
    let newUrl = '';
    if (isLocal) {
      newUrl = DEFAULT_BACKEND_URL;
      setBackendUrl(newUrl);
      localStorage.setItem('backendUrl', newUrl);
    } else {
      const lastIp = localStorage.getItem('localComputerIp') || '';
      const localIp = prompt(
        '請輸入您電腦的區域網路 IP (例如 192.168.10.171，網頁端在 HTTPS 下將自動使用 127.0.0.1 連線以繞過瀏覽器 Mixed Content 限制)：',
        lastIp || '192.168.10.'
      );
      if (localIp === null) return; // User cancelled
      
      const trimmedIp = localIp.trim();
      if (trimmedIp) {
        localStorage.setItem('localComputerIp', trimmedIp);
        
        // If web app is loaded over HTTPS, use 127.0.0.1 for browser connection to avoid mixed content block
        const isHttps = window.location.protocol === 'https:';
        newUrl = isHttps ? 'ws://127.0.0.1:3001' : `ws://${trimmedIp}:3001`;
        
        setBackendUrl(newUrl);
        localStorage.setItem('backendUrl', newUrl);
        
        // Also send update config to robot using the actual IP
        sendMessage({
          type: 'update_config',
          websocket_host: trimmedIp,
          websocket_port: 3001,
        });
        alert(`已切換！\n網頁連線端：${newUrl}\n已同步機器人端至：${trimmedIp}:3001\n機器人收到指令後會重新啟動。`);
      }
    }
  }, [backendUrl, sendMessage]);

  const handleSyncToRobot = useCallback((targetUrl: string) => {
    let host = targetUrl.trim();
    let port = 80;
    
    if (host.startsWith('wss://')) {
      host = host.substring(6);
      port = 443;
    } else if (host.startsWith('ws://')) {
      host = host.substring(5);
      port = 80;
    }
    
    const colonIndex = host.lastIndexOf(':');
    if (colonIndex > 0) {
      port = parseInt(host.substring(colonIndex + 1), 10);
      host = host.substring(0, colonIndex);
    }
    
    sendMessage({
      type: 'update_config',
      websocket_host: host,
      websocket_port: port,
    });
    
    alert(`已向伺服器發送同步指令！\n機器人即將被切換至後端：${host}:${port}\n機器人接收指令後會重啟。`);
  }, [sendMessage]);


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
        backendUrl={backendUrl}
        onToggleBackend={handleToggleBackend}
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
          background: 'linear-gradient(135deg, var(--bg-secondary), #FFFFFF)',
          border: '2px solid var(--glass-border)',
          borderRadius: '20px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          transition: 'all 0.2s ease',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: 'var(--glass-shadow)',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'translate(-2px, -2px)';
          e.currentTarget.style.boxShadow = '6px 6px 0px #111111';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'none';
          e.currentTarget.style.boxShadow = 'var(--glass-shadow)';
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
          background: 'radial-gradient(circle, rgba(0, 102, 255, 0.1), transparent 70%)',
          animation: 'float 6s ease-in-out infinite',
          pointerEvents: 'none',
        }} />

        {/* Robot icon */}
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '16px',
          background: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          overflow: 'hidden',
          boxShadow: '2px 2px 0px #111111',
          border: '2px solid #111111',
        }}>
          <img 
            src="/image/cute_robot_avatar.png" 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
            alt="Cute Robot" 
          />
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
        voiceMode={voiceMode}
        onToggleVoiceMode={handleToggleVoiceMode}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={handleSaveSettings}
        onSyncToRobot={handleSyncToRobot}
        robotConnected={backendStatus?.robot.connected || false}
        webConnected={isConnected}
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
        robotConnected={backendStatus?.robot.connected || false}
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
        voiceMode={voiceMode}
        onToggleVoiceMode={handleToggleVoiceMode}
      />
    </div>
  );
}
