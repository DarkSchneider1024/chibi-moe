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
          width: '150px',
          height: '150px',
          borderRadius: '24px',
          background: '#FFFFFF',
          border: '3px solid #111111',
          boxShadow: `6px 6px 0px #111111, 0 0 30px ${getStatusColor()}`,
          transition: 'all 0.5s ease',
          animation: status === 'speaking' || status === 'listening' ? 'pulse-glow 2s infinite' : 'float 6s ease-in-out infinite',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <img 
          src="/image/cute_robot_avatar.png" 
          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
          alt="Gundam Robot Head" 
        />
        {/* Neon status indicator light */}
        <div style={{
          position: 'absolute',
          bottom: '8px',
          right: '8px',
          width: '14px',
          height: '14px',
          borderRadius: '50%',
          backgroundColor: getStatusColor(),
          border: '2px solid #111111',
          boxShadow: `0 0 10px ${getStatusColor()}`,
        }} />
      </div>
      <p style={{ marginTop: '1.5rem', fontWeight: 600, color: getStatusColor(), fontSize: '1.1rem' }}>
        {getStatusText()}
      </p>
    </div>
  );
}
