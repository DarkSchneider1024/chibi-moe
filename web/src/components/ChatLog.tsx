import { useEffect, useRef } from 'react';
import { Mic } from 'lucide-react';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'robot';
  text: string;
  type?: 'text' | 'audio';
}

interface ChatLogProps {
  messages: ChatMessage[];
}

function AudioBubble() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <Mic size={16} style={{ opacity: 0.9, flexShrink: 0 }} />
      <span style={{ fontSize: '0.85rem' }}>語音訊息</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginLeft: '4px' }}>
        {[1, 2, 3, 4, 5].map(i => (
          <div
            key={i}
            style={{
              width: '3px',
              borderRadius: '2px',
              background: 'rgba(255,255,255,0.7)',
              animation: `audioWave 1.2s ease-in-out ${i * 0.1}s infinite`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function ChatLog({ messages }: ChatLogProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div style={{
      flex: 1,
      width: '100%',
      maxWidth: '600px',
      overflowY: 'auto',
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      maskImage: 'linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)',
      WebkitMaskImage: '-webkit-linear-gradient(top, transparent, black 10%, black 90%, transparent)'
    }}>
      {messages.length === 0 && (
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: 'auto', marginBottom: 'auto' }}>
          說點什麼來開始對話吧！
        </div>
      )}
      {messages.map((msg) => (
        <div 
          key={msg.id} 
          style={{
            alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
            background: msg.sender === 'user' ? 'var(--accent-blue)' : 'var(--glass-bg)',
            color: 'white',
            padding: '12px 16px',
            borderRadius: '16px',
            borderBottomRightRadius: msg.sender === 'user' ? '4px' : '16px',
            borderBottomLeftRadius: msg.sender === 'robot' ? '4px' : '16px',
            maxWidth: '80%',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}
        >
          {msg.type === 'audio' ? <AudioBubble /> : msg.text}
        </div>
      ))}
      <div ref={endRef} />
    </div>
  );
}
