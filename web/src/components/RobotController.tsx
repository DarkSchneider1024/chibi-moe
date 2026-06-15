import { useState, useCallback } from 'react';
import { Mic, Square, Camera, CameraOff, Volume2, Cpu, Cog, ArrowLeft, Aperture, Loader2 } from 'lucide-react';
import { Joystick, type JoystickDirection } from './Joystick';
import { SnapshotPanel, type Snapshot } from './SnapshotPanel';
import { ChatLog, type ChatMessage } from './ChatLog';
import { robotMove, robotStop } from '../api/robot';
import { CustomEmoji } from './CustomEmoji';

interface RobotControllerProps {
  isOpen: boolean;
  onClose: () => void;
  isConnected: boolean;
  robotConnected: boolean;
  imageUrl: string | null;
  messages: ChatMessage[];
  robotStatus: 'idle' | 'listening' | 'speaking' | 'processing';
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  backendUrl: string;
  cameraEnabled: boolean;
  onToggleCamera: () => void;
  // Snapshot
  snapshots: Snapshot[];
  onSnapshot: () => void;
  onDeleteSnapshot: (id: string) => void;
  onClearSnapshots: () => void;
  voiceMode: 'phone' | 'robot';
  onToggleVoiceMode: () => void;
}

interface ComponentInfo {
  name: string;
  icon: React.ReactNode;
  status: 'online' | 'offline' | 'standby';
  detail: string;
}

export function RobotController({
  isOpen,
  onClose,
  isConnected,
  robotConnected,
  imageUrl,
  messages,
  robotStatus,
  isRecording,
  onStartRecording,
  onStopRecording,
  cameraEnabled,
  onToggleCamera,
  snapshots,
  onSnapshot,
  onDeleteSnapshot,
  onClearSnapshots,
  backendUrl,
  voiceMode,
  onToggleVoiceMode,
}: RobotControllerProps) {
  const [showComponents, setShowComponents] = useState(false);
  const [flashActive, setFlashActive] = useState(false);
  const [lastApiError, setLastApiError] = useState<string | null>(null);

  const handleJoystickMove = useCallback((dir: JoystickDirection) => {
    if (dir.action === 'stop') return;
    setLastApiError(null);
    robotMove(backendUrl, dir.action, 500).catch(err => {
      console.error('Robot move API error:', err);
      setLastApiError(err.message);
    });
  }, [backendUrl]);

  const handleJoystickRelease = useCallback(() => {
    setLastApiError(null);
    robotStop(backendUrl).catch(err => {
      console.error('Robot stop API error:', err);
      setLastApiError(err.message);
    });
  }, [backendUrl]);

  const handleSnapshot = () => {
    if (!imageUrl) return;
    setFlashActive(true);
    setTimeout(() => setFlashActive(false), 300);
    onSnapshot();
  };

  const components: ComponentInfo[] = [
    {
      name: 'ESP32-S3-CAM',
      icon: <Camera size={18} />,
      status: imageUrl ? 'online' : (robotConnected ? 'standby' : 'offline'),
      detail: '影像串流模組',
    },
    {
      name: 'INMP441 麥克風',
      icon: <Mic size={18} />,
      status: robotConnected ? 'online' : 'offline',
      detail: 'I2S 全向麥克風',
    },
    {
      name: '馬達車底盤',
      icon: <Cog size={18} />,
      status: robotConnected ? 'online' : 'offline',
      detail: '2WD 智能小車',
    },
    {
      name: 'MAX98357 音響',
      icon: <Volume2 size={18} />,
      status: robotConnected ? 'online' : 'offline',
      detail: 'I2S 音訊放大器 + 喇叭',
    },
  ];

  const statusColor = (s: string) => {
    if (s === 'online') return 'var(--success)';
    if (s === 'standby') return 'var(--accent-yellow)';
    return 'var(--danger)';
  };

  const statusLabel = (s: string) => {
    if (s === 'online') return '運作中';
    if (s === 'standby') return '待機';
    return '離線';
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 2000,
      background: 'var(--bg-primary)',
      backgroundImage:
        'radial-gradient(circle at 15% 50%, rgba(0, 102, 255, 0.08), transparent 25%), radial-gradient(circle at 85% 30%, rgba(255, 211, 0, 0.12), transparent 25%)',
      display: 'flex',
      flexDirection: 'column',
      animation: 'fadeIn 0.3s ease',
      overflow: 'hidden',
    }}>
      {/* Top bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 20px',
        background: '#FFFFFF',
        borderBottom: '3px solid #111111',
        flexShrink: 0,
      }}>
        <button
          onClick={onClose}
          className="btn-secondary"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.9rem',
            padding: '6px 12px',
          }}
        >
          <ArrowLeft size={18} />
          返回
        </button>

        <h2 style={{
          fontSize: '1.2rem',
          fontWeight: 800,
          color: '#111111',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <CustomEmoji name="robot" size={24} />
          機器人操控台
        </h2>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: '#FFFFFF',
          border: '2px solid #111111',
          padding: '6px 12px',
          borderRadius: '10px',
          boxShadow: '2px 2px 0px #111111',
        }}>
          <span style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: isConnected ? 'var(--success)' : 'var(--danger)',
            border: '1px solid #111111',
          }} />
          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#111111' }}>
            {isConnected ? '已連線' : '離線'}
          </span>
        </div>
      </div>

      {/* Main content - scrollable */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '24px 16px',
        gap: '24px',
      }}>
        {/* Camera + Controls row */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '24px',
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
          maxWidth: '800px',
        }}>
          {/* Camera View */}
          <div style={{
            flex: '1 1 320px',
            maxWidth: '480px',
            aspectRatio: '4/3',
            background: '#111111',
            borderRadius: '20px',
            overflow: 'hidden',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid #111111',
            boxShadow: 'var(--glass-shadow)',
          }}>
            {imageUrl ? (
              <img src={imageUrl} alt="Camera" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#888888', gap: '12px' }}>
                {cameraEnabled ? (
                  <Camera size={48} style={{ opacity: 0.6, color: 'var(--accent-yellow)' }} />
                ) : (
                  <CameraOff size={48} style={{ opacity: 0.6, color: 'var(--danger)' }} />
                )}
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#FFFFFF' }}>
                  {cameraEnabled ? '等待影像中...' : '影像已關閉'}
                </span>
              </div>
            )}

            {/* Flash */}
            {flashActive && (
              <div style={{
                position: 'absolute', inset: 0,
                background: 'rgba(255,255,255,0.9)',
                pointerEvents: 'none',
                animation: 'flashFade 0.3s ease-out forwards',
                zIndex: 10,
              }} />
            )}

            {/* LIVE badge */}
            {imageUrl && (
              <div style={{
                position: 'absolute', top: '12px', left: '12px',
                background: '#FFFFFF', borderRadius: '8px',
                border: '2px solid #111111',
                padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '6px',
                boxShadow: '2px 2px 0px #111111',
                zIndex: 5,
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: 'var(--success)',
                  border: '1px solid #111111',
                }} />
                <span style={{ color: '#111111', fontSize: '0.75rem', fontWeight: 800 }}>LIVE</span>
              </div>
            )}

            {/* Camera controls */}
            <div style={{
              position: 'absolute', bottom: '12px', right: '12px',
              display: 'flex', gap: '8px',
              zIndex: 5,
            }}>
              <button
                onClick={onToggleCamera}
                style={{
                  background: '#FFFFFF',
                  border: '2px solid #111111',
                  borderRadius: '10px',
                  padding: '6px 12px',
                  cursor: 'pointer',
                  color: cameraEnabled ? '#111111' : 'var(--danger)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  boxShadow: '2px 2px 0px #111111',
                  transition: 'all 0.15s ease',
                }}
                title={cameraEnabled ? '關閉影像' : '開啟影像'}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translate(-1px, -1px)';
                  e.currentTarget.style.boxShadow = '3px 3px 0px #111111';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = '2px 2px 0px #111111';
                }}
              >
                {cameraEnabled ? <Camera size={14} /> : <CameraOff size={14} />}
              </button>
              {imageUrl && (
                <button
                  onClick={handleSnapshot}
                  style={{
                    background: 'var(--accent-yellow)',
                    border: '2px solid #111111',
                    borderRadius: '10px',
                    padding: '6px 14px',
                    cursor: 'pointer',
                    color: '#111111',
                    fontWeight: 800,
                    fontSize: '0.8rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    transition: 'all 0.15s ease',
                    boxShadow: '2px 2px 0px #111111',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translate(-1px, -1px)';
                    e.currentTarget.style.boxShadow = '3px 3px 0px #111111';
                    e.currentTarget.style.background = 'var(--accent-blue)';
                    e.currentTarget.style.color = '#FFFFFF';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = '2px 2px 0px #111111';
                    e.currentTarget.style.background = 'var(--accent-yellow)';
                    e.currentTarget.style.color = '#111111';
                  }}
                  title="拍照"
                >
                  <Aperture size={14} />
                  拍照
                </button>
              )}
            </div>
          </div>

          {/* Joystick + Voice */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            background: '#FFFFFF',
            border: '2px solid #111111',
            borderRadius: '20px',
            padding: '20px 24px',
            boxShadow: 'var(--glass-shadow)',
          }}>
            <Joystick
              size={160}
              onMove={handleJoystickMove}
              onRelease={handleJoystickRelease}
              disabled={!robotConnected}
            />
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
              拖曳搖桿控制移動
            </span>
            {lastApiError && (
              <span style={{
                fontSize: '0.75rem',
                color: 'var(--danger)',
                maxWidth: '180px',
                textAlign: 'center',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}>
                <CustomEmoji name="warning" size={14} />
                <span>{lastApiError}</span>
              </span>
            )}

            {/* Voice button */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
              <button
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  border: '2px solid #111111',
                  background: isRecording ? 'var(--danger)' : 'var(--accent-yellow)',
                  color: isRecording ? '#FFFFFF' : '#111111',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease',
                  boxShadow: isRecording ? '2px 2px 0px #111111' : '3px 3px 0px #111111',
                  animation: isRecording ? 'pulse-glow 1.5s infinite' : 'none',
                  transform: isRecording ? 'scale(1.1)' : 'scale(1)',
                }}
                onClick={isRecording ? onStopRecording : onStartRecording}
                title={isRecording ? '停止錄音' : '語音對話'}
              >
                {isRecording ? <Square size={24} fill="currentColor" /> : <Mic size={28} />}
              </button>
              
              <button 
                className="btn-secondary"
                onClick={onToggleVoiceMode}
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
                    <span>手機收發</span>
                  </>
                ) : (
                  <>
                    <CustomEmoji name="robot" size={14} />
                    <span>機器人收發</span>
                  </>
                )}
              </button>
            </div>
            <span style={{
              fontSize: '0.8rem',
              color: isRecording ? 'var(--danger)' : 'var(--text-primary)',
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}>
              {isRecording ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>錄音中...</span>
                </>
              ) : robotStatus === 'speaking' ? (
                <>
                  <Volume2 size={14} className="animate-bounce" />
                  <span>播放中</span>
                </>
              ) : robotStatus === 'processing' ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>處理中</span>
                </>
              ) : (
                '語音對話'
              )}
            </span>
          </div>
        </div>

        {/* Snapshots */}
        <SnapshotPanel
          snapshots={snapshots}
          onDelete={onDeleteSnapshot}
          onClearAll={onClearSnapshots}
        />

        {/* Component status panel */}
        <div style={{ width: '100%', maxWidth: '800px' }}>
          <button
            onClick={() => setShowComponents(!showComponents)}
            style={{
              background: '#FFFFFF',
              border: '2px solid #111111',
              borderRadius: '10px',
              color: '#111111',
              fontSize: '0.85rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              boxShadow: '2px 2px 0px #111111',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translate(-1px, -1px)';
              e.currentTarget.style.boxShadow = '3px 3px 0px #111111';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = '2px 2px 0px #111111';
            }}
          >
            <Cpu size={16} />
            零件狀態
            <span style={{
              display: 'inline-block',
              transition: 'transform 0.3s',
              transform: showComponents ? 'rotate(180deg)' : 'rotate(0)',
            }}>▾</span>
          </button>

          {showComponents && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: '12px',
              marginTop: '12px',
              animation: 'fadeIn 0.25s ease',
            }}>
              {components.map(comp => (
                <div
                  key={comp.name}
                  className="glass-panel"
                  style={{
                    padding: '12px 14px',
                    borderRadius: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    background: '#FFFFFF',
                    border: `2px solid #111111`,
                    boxShadow: '2px 2px 0px #111111',
                  }}
                >
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: `${statusColor(comp.status)}15`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: statusColor(comp.status),
                    border: `2px solid ${statusColor(comp.status)}`,
                    flexShrink: 0,
                  }}>
                    {comp.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>{comp.name}</div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{comp.detail}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: statusColor(comp.status),
                      border: '1px solid #111111',
                    }} />
                    <span style={{
                      fontSize: '0.7rem',
                      color: statusColor(comp.status),
                      fontWeight: 800,
                    }}>
                      {statusLabel(comp.status)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Chat log */}
        <div style={{
          width: '100%',
          maxWidth: '800px',
          flex: 1,
          minHeight: '120px',
        }}>
          <ChatLog messages={messages} />
        </div>
      </div>
    </div>
  );
}
