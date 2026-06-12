import React, { useState, useEffect } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { useAudioRecorder } from './hooks/useAudioRecorder';
import { useAudioPlayer } from './hooks/useAudioPlayer';
import { SettingsModal } from './components/SettingsModal';
import { RobotAvatar } from './components/RobotAvatar';
import { ControlPanel } from './components/ControlPanel';
import { ChatLog, ChatMessage } from './components/ChatLog';
import { FirmwareFlasher } from './components/FirmwareFlasher';

export default function App() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isFlasherOpen, setIsFlasherOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [robotStatus, setRobotStatus] = useState<'idle' | 'listening' | 'speaking' | 'processing'>('idle');

  // Load Settings
  const [apiKey, setApiKey] = useState(localStorage.getItem('geminiApiKey') || '');
  const [ollamaEndpoint, setOllamaEndpoint] = useState(localStorage.getItem('ollamaEndpoint') || 'http://localhost:11434');

  const { isConnected, lastMessage, sendMessage } = useWebSocket('ws://localhost:3001');
  const { isRecording, startRecording, stopRecording } = useAudioRecorder();
  const { isPlaying, playBase64Audio, stopPlaying } = useAudioPlayer();

  useEffect(() => {
    if (!lastMessage) return;
    
    // Handle incoming messages from the backend
    if (lastMessage.type === 'text') {
      setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'robot', text: lastMessage.data }]);
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

  const handleSaveSettings = (settings: { apiKey: string; ollamaEndpoint: string }) => {
    setApiKey(settings.apiKey);
    setOllamaEndpoint(settings.ollamaEndpoint);
    // Send updated settings to backend if needed
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

      <RobotAvatar status={robotStatus} />
      
      <ChatLog messages={messages} />

      <ControlPanel 
        isRecording={isRecording}
        isConnected={isConnected}
        onStartRecording={handleStartRecording}
        onStopRecording={handleStopRecording}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenFirmwareFlasher={() => setIsFlasherOpen(true)}
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
    </div>
  );
}
