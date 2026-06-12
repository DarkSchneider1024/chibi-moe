import { useState, useEffect, useCallback } from 'react';
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

export default function App() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isFlasherOpen, setIsFlasherOpen] = useState(false);
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [robotStatus, setRobotStatus] = useState<'idle' | 'listening' | 'speaking' | 'processing'>('idle');

  // Load Settings (no longer kept in App state since they are not used here except backendUrl)
  const [backendUrl, setBackendUrl] = useState(localStorage.getItem('backendUrl') || 'ws://localhost:3001');

  // Camera stream state
  const [cameraImageUrl, setCameraImageUrl] = useState<string | null>(null);

  const handleBinaryMessage = useCallback((blob: Blob) => {
    setCameraImageUrl(prevUrl => {
      if (prevUrl) URL.revokeObjectURL(prevUrl);
      return URL.createObjectURL(blob);
    });
  }, []);

  const { isConnected, lastMessage, sendMessage } = useWebSocket(backendUrl, handleBinaryMessage);
  const { isRecording, startRecording, stopRecording } = useAudioRecorder();
  const { isPlaying, playBase64Audio, stopPlaying } = useAudioPlayer();

  useEffect(() => {
    if (!lastMessage) return;
    
    // Handle incoming messages from the backend
    if (lastMessage.type === 'text') {
      setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'robot', text: lastMessage.data }]);
    } else if (lastMessage.type === 'command') {
      let actionText = '';
      if (lastMessage.action === 'robot_move') {
        actionText = `🤖 執行動作: 移動 (${lastMessage.args.action}, ${lastMessage.args.duration}ms)`;
      } else if (lastMessage.action === 'robot_expression') {
        actionText = `🤖 執行表情: ${lastMessage.args.emotion}`;
      }
      setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'robot', text: actionText }]);
    } else if (lastMessage.type === 'audio_out') {
      setRobotStatus('speaking');
      playBase64Audio(lastMessage.data);
    } else if (lastMessage.type === 'status') {
      // Backend tells us it's processing
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
      stopPlaying(); // Stop any currently playing audio if user interrupts
    } else if (!isRecording && robotStatus === 'listening') {
      setRobotStatus('processing');
    }
  }, [isRecording, stopPlaying]);

  const handleStartRecording = () => {
    startRecording();
  };

  const handleStopRecording = async () => {
    const base64Audio = await stopRecording();
    if (base64Audio) {
      setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'user', text: '(Audio Message)' }]);
      sendMessage({ type: 'audio', data: base64Audio });
    } else {
      setRobotStatus('idle');
    }
  };

  const handleSaveSettings = (settings: { apiKey: string; ollamaEndpoint: string; enableMachineOps: boolean; backendUrl: string }) => {
    setBackendUrl(settings.backendUrl);
    // Send updated settings to backend
    sendMessage({ type: 'config', settings });
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      minHeight: '100vh',
      padding: '24px',
      position: 'relative'
    }}>
      <h1 style={{ 
        position: 'absolute', top: '24px', left: '24px', 
        fontSize: '1.2rem', color: 'var(--text-secondary)' 
      }}>
        Chibi-Moe
      </h1>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', justifyContent: 'center', alignItems: 'flex-start', width: '100%' }}>
        <RobotAvatar status={robotStatus} />
        <CameraView imageUrl={cameraImageUrl} isConnected={isConnected} />
      </div>
      
      <ChatLog messages={messages} />

      <ControlPanel 
        isRecording={isRecording}
        isConnected={isConnected}
        onStartRecording={handleStartRecording}
        onStopRecording={handleStopRecording}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenFirmwareFlasher={() => setIsFlasherOpen(true)}
        onOpenManual={() => setIsManualOpen(true)}
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
    </div>
  );
}
