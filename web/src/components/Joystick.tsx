import { useRef, useState, useCallback, useEffect } from 'react';

export interface JoystickDirection {
  action: 'move_forward' | 'move_backward' | 'turn_left' | 'turn_right' | 'stop';
  x: number; // -1 to 1
  y: number; // -1 to 1
}

interface JoystickProps {
  size?: number;
  onMove: (dir: JoystickDirection) => void;
  onRelease: () => void;
  disabled?: boolean;
}

export function Joystick({ size = 160, onMove, onRelease, disabled = false }: JoystickProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const lastActionRef = useRef<string>('stop');
  const radius = size / 2 - 20;

  const calcDirection = useCallback((x: number, y: number): JoystickDirection => {
    const deadzone = 0.25;
    const nx = x / radius;
    const ny = y / radius;

    if (Math.abs(nx) < deadzone && Math.abs(ny) < deadzone) {
      return { action: 'stop', x: 0, y: 0 };
    }

    let action: JoystickDirection['action'];
    if (Math.abs(ny) > Math.abs(nx)) {
      action = ny < 0 ? 'move_forward' : 'move_backward';
    } else {
      action = nx < 0 ? 'turn_left' : 'turn_right';
    }

    return { action, x: nx, y: ny };
  }, [radius]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (disabled) return;
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setIsDragging(true);
  }, [disabled]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    let dx = e.clientX - cx;
    let dy = e.clientY - cy;

    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > radius) {
      dx = (dx / dist) * radius;
      dy = (dy / dist) * radius;
    }

    setKnobPos({ x: dx, y: dy });
    const dir = calcDirection(dx, dy);
    if (dir.action !== lastActionRef.current) {
      lastActionRef.current = dir.action;
      onMove(dir);
    }
  }, [isDragging, radius, calcDirection, onMove]);

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
    setKnobPos({ x: 0, y: 0 });
    lastActionRef.current = 'stop';
    onRelease();
  }, [onRelease]);

  // Direction labels
  const labels = [
    { text: '▲', x: 0, y: -size / 2 + 8, active: knobPos.y < -20 },
    { text: '▼', x: 0, y: size / 2 - 8, active: knobPos.y > 20 },
    { text: '◄', x: -size / 2 + 8, y: 0, active: knobPos.x < -20 },
    { text: '►', x: size / 2 - 8, y: 0, active: knobPos.x > 20 },
  ];

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      onRelease();
    };
  }, [onRelease]);

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(30,41,59,0.9), rgba(15,23,42,0.95))',
        border: `2px solid ${isDragging ? 'var(--accent-blue)' : 'rgba(255,255,255,0.15)'}`,
        position: 'relative',
        touchAction: 'none',
        userSelect: 'none',
        cursor: disabled ? 'not-allowed' : 'grab',
        opacity: disabled ? 0.4 : 1,
        transition: 'border-color 0.3s, opacity 0.3s',
        boxShadow: isDragging
          ? '0 0 30px rgba(59,130,246,0.3), inset 0 0 20px rgba(59,130,246,0.1)'
          : 'inset 0 0 20px rgba(0,0,0,0.3)',
      }}
    >
      {/* Crosshair lines */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '15%',
        right: '15%',
        height: '1px',
        background: 'rgba(255,255,255,0.08)',
      }} />
      <div style={{
        position: 'absolute',
        left: '50%',
        top: '15%',
        bottom: '15%',
        width: '1px',
        background: 'rgba(255,255,255,0.08)',
      }} />

      {/* Direction labels */}
      {labels.map((l, i) => (
        <div key={i} style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: `translate(calc(-50% + ${l.x}px), calc(-50% + ${l.y}px))`,
          fontSize: '0.7rem',
          color: l.active ? 'var(--accent-blue)' : 'rgba(255,255,255,0.2)',
          transition: 'color 0.2s',
          pointerEvents: 'none',
        }}>
          {l.text}
        </div>
      ))}

      {/* Knob */}
      <div style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        width: '50px',
        height: '50px',
        borderRadius: '50%',
        background: isDragging
          ? 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))'
          : 'linear-gradient(135deg, rgba(59,130,246,0.6), rgba(139,92,246,0.6))',
        transform: `translate(calc(-50% + ${knobPos.x}px), calc(-50% + ${knobPos.y}px))`,
        transition: isDragging ? 'none' : 'transform 0.3s ease-out, background 0.3s',
        boxShadow: isDragging
          ? '0 0 20px rgba(59,130,246,0.5)'
          : '0 4px 12px rgba(0,0,0,0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.4)',
          filter: 'blur(1px)',
        }} />
      </div>
    </div>
  );
}
