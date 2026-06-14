// Removed unused React

interface RobotAvatarProps {
  status: 'idle' | 'listening' | 'speaking' | 'processing';
}

export function RobotAvatar({ status }: RobotAvatarProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'listening': return 'var(--accent-purple)';
      case 'speaking': return 'var(--accent-blue)';
      case 'processing': return 'var(--success)';
      default: return 'var(--text-secondary)';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'listening': return '聆聽中 (Listening)';
      case 'speaking': return '說話中 (Speaking)';
      case 'processing': return '處理中 (Processing)';
      default: return '待命閒置 (Idle)';
    }
  };

  return (
    <div className="avatar-container" style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem'
    }}>
      <div 
        className={`avatar-orb ${status !== 'idle' ? 'animating' : ''}`}
        style={{
          width: '120px',
          height: '120px',
          borderRadius: '50%',
          background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.8), ${getStatusColor()})`,
          boxShadow: `0 0 30px ${getStatusColor()}`,
          transition: 'all 0.5s ease',
          animation: status === 'speaking' || status === 'listening' ? 'pulse-glow 2s infinite' : 'float 6s ease-in-out infinite'
        }}
      >
        <div style={{
          position: 'absolute',
          top: '25%',
          left: '20%',
          width: '20px',
          height: '20px',
          background: 'rgba(255,255,255,0.9)',
          borderRadius: '50%',
          filter: 'blur(2px)'
        }}></div>
      </div>
      <p style={{ marginTop: '1.5rem', fontWeight: 500, color: getStatusColor() }}>
        {getStatusText()}
      </p>
    </div>
  );
}
