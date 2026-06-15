import { Camera, CameraOff, Aperture } from 'lucide-react';
import { useState } from 'react';

interface CameraViewProps {
  imageUrl: string | null;
  isConnected: boolean;
  onSnapshot: () => void;
}

export function CameraView({ imageUrl, isConnected, onSnapshot }: CameraViewProps) {
  const [flashActive, setFlashActive] = useState(false);

  const handleSnapshot = () => {
    if (!imageUrl) return;
    // Trigger flash animation
    setFlashActive(true);
    setTimeout(() => setFlashActive(false), 300);
    onSnapshot();
  };

  return (
    <div style={{
      width: '100%',
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
      marginBottom: '16px',
      boxShadow: 'var(--glass-shadow)',
    }}>
      {imageUrl ? (
        <img 
          src={imageUrl} 
          alt="ESP32-CAM Stream" 
          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#888888', textAlign: 'center', padding: '20px' }}>
          {!isConnected ? (
            <>
              <CameraOff size={48} style={{ marginBottom: '8px', opacity: 0.7, color: 'var(--danger)' }} />
              <p style={{ fontWeight: 700, color: '#FFFFFF' }}>相機離線</p>
            </>
          ) : (
            <>
              <Camera size={48} style={{ marginBottom: '8px', opacity: 0.7, color: 'var(--accent-yellow)' }} />
              <p style={{ fontWeight: 700, color: '#FFFFFF' }}>等待影像傳輸中...</p>
            </>
          )}
        </div>
      )}

      {/* Flash overlay */}
      {flashActive && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(255,255,255,0.9)',
          pointerEvents: 'none',
          animation: 'flashFade 0.3s ease-out forwards',
          zIndex: 10,
        }} />
      )}
      
      {/* Status indicator */}
      <div style={{
        position: 'absolute',
        top: '12px',
        right: '12px',
        padding: '6px 10px',
        borderRadius: '8px',
        background: '#FFFFFF',
        border: '2px solid #111111',
        boxShadow: '2px 2px 0px #111111',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '0.75rem',
        fontWeight: 700,
        color: '#111111',
        zIndex: 5,
      }}>
        {imageUrl ? (
          <>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)', border: '1px solid #111111' }}></div>
            <span>即時影像</span>
          </>
        ) : (
          <>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--danger)', border: '1px solid #111111' }}></div>
            <span>未連線</span>
          </>
        )}
      </div>

      {/* Snapshot button */}
      {imageUrl && (
        <button
          onClick={handleSnapshot}
          style={{
            position: 'absolute',
            bottom: '12px',
            right: '12px',
            background: 'var(--accent-yellow)',
            border: '2px solid #111111',
            borderRadius: '10px',
            padding: '8px 14px',
            cursor: 'pointer',
            color: '#111111',
            fontWeight: 800,
            fontSize: '0.8rem',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.15s ease',
            boxShadow: '2px 2px 0px #111111',
            zIndex: 5,
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
          title="擷取快照"
        >
          <Aperture size={16} />
          拍照
        </button>
      )}
    </div>
  );
}

