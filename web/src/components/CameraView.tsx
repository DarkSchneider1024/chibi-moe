import { Camera, CameraOff } from 'lucide-react';

interface CameraViewProps {
  imageUrl: string | null;
  isConnected: boolean;
}

export function CameraView({ imageUrl, isConnected }: CameraViewProps) {
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
    </div>
  );
}
