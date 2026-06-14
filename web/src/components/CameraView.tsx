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
      background: 'rgba(0,0,0,0.5)',
      borderRadius: '16px',
      overflow: 'hidden',
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: '1px solid rgba(255,255,255,0.1)',
      marginBottom: '16px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
    }}>
      {imageUrl ? (
        <img 
          src={imageUrl} 
          alt="ESP32-CAM Stream" 
          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'var(--text-secondary)' }}>
          {!isConnected ? (
            <>
              <CameraOff size={48} style={{ marginBottom: '8px', opacity: 0.5 }} />
              <p>相機離線 (Camera Offline)</p>
            </>
          ) : (
            <>
              <Camera size={48} style={{ marginBottom: '8px', opacity: 0.5 }} />
              <p>等待影像傳輸中... (Waiting for video stream...)</p>
            </>
          )}
        </div>
      )}

      {/* Flash overlay */}
      {flashActive && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(255,255,255,0.8)',
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
        padding: '4px 8px',
        borderRadius: '12px',
        background: imageUrl ? 'rgba(0,0,0,0.6)' : 'transparent',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '0.75rem',
        backdropFilter: 'blur(4px)'
      }}>
        {imageUrl && (
          <>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)' }}></div>
            <span style={{ color: '#fff' }}>即時影像 (LIVE)</span>
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
            background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))',
            border: 'none',
            borderRadius: '12px',
            padding: '8px 16px',
            cursor: 'pointer',
            color: '#fff',
            fontWeight: 600,
            fontSize: '0.8rem',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.25s ease',
            boxShadow: '0 4px 16px rgba(59,130,246,0.4)',
            backdropFilter: 'blur(4px)',
            zIndex: 5,
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(59,130,246,0.5)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'translateY(0) scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(59,130,246,0.4)';
          }}
          title="擷取快照 (Take Snapshot)"
        >
          <Aperture size={16} />
          拍照
        </button>
      )}
    </div>
  );
}
