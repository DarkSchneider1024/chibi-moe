import { useState, useCallback } from 'react';
import { Mic, Square, Camera, CameraOff, Volume2, Cpu, Cog, ArrowLeft, Aperture } from 'lucide-react';
import { Joystick, type JoystickDirection } from './Joystick';
import { SnapshotPanel, type Snapshot } from './SnapshotPanel';
import { ChatLog, type ChatMessage } from './ChatLog';
import { robotMove, robotStop } from '../api/robot';

interface RobotControllerProps {
  isOpen: boolean;
  onClose: () => void;
  isConnected: boolean;
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
      status: imageUrl ? 'online' : (isConnected ? 'standby' : 'offline'),
      detail: '影像串流模組',
    },
    {
      name: 'INMP441 麥克風',
      icon: <Mic size={18} />,
      status: isConnected ? 'online' : 'offline',
      detail: 'I2S 全向麥克風',
    },
    {
      name: '馬達車底盤',
      icon: <Cog size={18} />,
      status: isConnected ? 'online' : 'offline',
      detail: '2WD 智能小車',
    },
    {
      name: 'MAX98357 音響',
      icon: <Volume2 size={18} />,
      status: isConnected ? 'online' : 'offline',
      detail: 'I2S 音訊放大器 + 喇叭',
    },
  ];

  const statusColor = (s: string) => {
    if (s === 'online') return 'var(--success)';
    if (s === 'standby') return '#F59E0B';
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
        'radial-gradient(circle at 15% 50%, rgba(59,130,246,0.12), transparent 25%), radial-gradient(circle at 85% 30%, rgba(139,92,246,0.12), transparent 25%)',
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
        padding: '12px 16px',
        background: 'rgba(0,0,0,0.3)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        flexShrink: 0,
      }}>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.9rem',
            padding: '6px 10px',
            borderRadius: '8px',
            transition: 'background 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
        >
          <ArrowLeft size={18} />
          返回
        </button>

        <h2 style={{
          fontSize: '1rem',
          fontWeight: 700,
          background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          letterSpacing: '0.04em',
        }}>
          🤖 機器人操控台
        </h2>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: isConnected ? 'var(--success)' : 'var(--danger)',
            boxShadow: isConnected ? '0 0 8px var(--success)' : 'none',
          }} />
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
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
        padding: '16px',
        gap: '16px',
      }}>
        {/* Camera + Controls row */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '16px',
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
            background: 'rgba(0,0,0,0.5)',
            borderRadius: '16px',
            overflow: 'hidden',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          }}>
            {imageUrl ? (
              <img src={imageUrl} alt="Camera" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'var(--text-secondary)', gap: '8px' }}>
                {cameraEnabled ? <Camera size={40} style={{ opacity: 0.4 }} /> : <CameraOff size={40} style={{ opacity: 0.4 }} />}
                <span style={{ fontSize: '0.85rem' }}>{cameraEnabled ? '等待影像...' : '影像已關閉'}</span>
              </div>
            )}

            {/* Flash */}
            {flashActive && (
              <div style={{
                position: 'absolute', inset: 0,
                background: 'rgba(255,255,255,0.8)',
                pointerEvents: 'none',
                animation: 'flashFade 0.3s ease-out forwards',
                zIndex: 10,
              }} />
            )}

            {/* LIVE badge */}
            {imageUrl && (
              <div style={{
                position: 'absolute', top: '10px', left: '10px',
                background: 'rgba(0,0,0,0.6)', borderRadius: '8px',
                padding: '3px 8px', display: 'flex', alignItems: 'center', gap: '5px',
                backdropFilter: 'blur(4px)',
              }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--success)', animation: 'pulse-glow 2s infinite' }} />
                <span style={{ color: '#fff', fontSize: '0.7rem', fontWeight: 600 }}>LIVE</span>
              </div>
            )}

            {/* Camera controls */}
            <div style={{
              position: 'absolute', bottom: '10px', right: '10px',
              display: 'flex', gap: '8px',
            }}>
              <button
                onClick={onToggleCamera}
                style={{
                  background: 'rgba(0,0,0,0.6)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '10px',
                  padding: '6px 10px',
                  cursor: 'pointer',
                  color: cameraEnabled ? '#fff' : 'var(--danger)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.75rem',
                  backdropFilter: 'blur(4px)',
                  transition: 'background 0.2s',
                }}
                title={cameraEnabled ? '關閉影像' : '開啟影像'}
              >
                {cameraEnabled ? <Camera size={14} /> : <CameraOff size={14} />}
              </button>
              {imageUrl && (
                <button
                  onClick={handleSnapshot}
                  style={{
                    background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '6px 12px',
                    cursor: 'pointer',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    transition: 'all 0.25s',
                    boxShadow: '0 4px 12px rgba(59,130,246,0.35)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
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
          }}>
            <Joystick
              size={160}
              onMove={handleJoystickMove}
              onRelease={handleJoystickRelease}
              disabled={!isConnected}
            />
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
              拖曳搖桿控制移動
            </span>
            {lastApiError && (
              <span style={{ fontSize: '0.65rem', color: 'var(--danger)', maxWidth: '160px', textAlign: 'center' }}>
                ⚠ {lastApiError}
              </span>
            )}

            {/* Voice button */}
            <button
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                border: `2px solid ${isRecording ? 'var(--danger)' : 'var(--accent-blue)'}`,
                background: isRecording ? 'var(--danger)' : 'var(--glass-bg)',
                color: isRecording ? '#fff' : 'var(--accent-blue)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s ease',
                boxShadow: isRecording ? '0 0 20px rgba(239,68,68,0.4)' : '0 4px 12px rgba(0,0,0,0.2)',
                animation: isRecording ? 'pulse-glow 1.5s infinite' : 'none',
                transform: isRecording ? 'scale(1.1)' : 'scale(1)',
              }}
              onClick={isRecording ? onStopRecording : onStartRecording}
              title={isRecording ? '停止錄音' : '語音對話'}
            >
              {isRecording ? <Square size={24} fill="currentColor" /> : <Mic size={28} />}
            </button>
            <span style={{
              fontSize: '0.7rem',
              color: isRecording ? 'var(--danger)' : 'var(--text-secondary)',
              fontWeight: isRecording ? 600 : 400,
            }}>
              {isRecording ? '錄音中...' : (
                robotStatus === 'speaking' ? '🔊 播放中' :
                robotStatus === 'processing' ? '⏳ 處理中' :
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
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 4px',
              transition: 'color 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
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
              gap: '10px',
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
                    transition: 'border-color 0.3s',
                    borderColor: comp.status === 'online' ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.1)',
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
                    flexShrink: 0,
                  }}>
                    {comp.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>{comp.name}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{comp.detail}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                    <div style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: statusColor(comp.status),
                      boxShadow: comp.status === 'online' ? `0 0 6px ${statusColor(comp.status)}` : 'none',
                    }} />
                    <span style={{
                      fontSize: '0.65rem',
                      color: statusColor(comp.status),
                      fontWeight: 500,
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
