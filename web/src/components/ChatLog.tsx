import { useEffect, useRef } from 'react';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'robot';
  text: string;
}

interface ChatLogProps {
  messages: ChatMessage[];
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
          Say something to start the conversation!
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
          {msg.text}
        </div>
      ))}
      <div ref={endRef} />
    </div>
  );
}
