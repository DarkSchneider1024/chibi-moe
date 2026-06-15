import React from 'react';

export type EmojiName =
  | 'arrow_up'
  | 'arrow_down'
  | 'arrow_left'
  | 'arrow_right'
  | 'dance'
  | 'spin'
  | 'happy'
  | 'sad'
  | 'angry'
  | 'surprised'
  | 'neutral'
  | 'warning'
  | 'phone'
  | 'robot'
  | 'local_pc'
  | 'cloud';

interface CustomEmojiProps {
  name: EmojiName;
  size?: number;
  style?: React.CSSProperties;
  className?: string;
}

export function CustomEmoji({ name, size = 20, style, className }: CustomEmojiProps) {
  const positions: Record<EmojiName, { x: string; y: string }> = {
    arrow_up: { x: '0%', y: '0%' },
    arrow_down: { x: '33.333%', y: '0%' },
    arrow_left: { x: '66.666%', y: '0%' },
    arrow_right: { x: '100%', y: '0%' },
    
    dance: { x: '0%', y: '33.333%' },
    spin: { x: '33.333%', y: '33.333%' },
    happy: { x: '66.666%', y: '33.333%' },
    sad: { x: '100%', y: '33.333%' },
    
    angry: { x: '0%', y: '66.666%' },
    surprised: { x: '33.333%', y: '66.666%' },
    neutral: { x: '66.666%', y: '66.666%' },
    warning: { x: '100%', y: '66.666%' },
    
    phone: { x: '0%', y: '100%' },
    robot: { x: '33.333%', y: '100%' },
    local_pc: { x: '66.666%', y: '100%' },
    cloud: { x: '100%', y: '100%' },
  };

  const pos = positions[name] || { x: '0%', y: '0%' };

  return (
    <span
      className={className}
      style={{
        display: 'inline-block',
        width: `${size}px`,
        height: `${size}px`,
        backgroundImage: "url('/image/cute_emojis_sprite.png')",
        backgroundSize: '400% 400%',
        backgroundPosition: `${pos.x} ${pos.y}`,
        backgroundRepeat: 'no-repeat',
        verticalAlign: 'middle',
        flexShrink: 0,
        ...style,
      }}
    />
  );
}
