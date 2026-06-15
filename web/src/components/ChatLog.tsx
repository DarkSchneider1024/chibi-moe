import { useEffect, useRef } from 'react';
import { Mic } from 'lucide-react';
import { CustomEmoji } from './CustomEmoji';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'robot' | 'system';
  text: string;
  type?: 'text' | 'audio' | 'error';
}

interface ChatLogProps {
  messages: ChatMessage[];
}

function AudioBubble() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <Mic size={16} style={{ opacity: 0.9, flexShrink: 0 }} />
      <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>語音訊息</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginLeft: '4px' }}>
        {[1, 2, 3, 4, 5].map(i => (
          <div
            key={i}
            style={{
              width: '3px',
              height: '10px',
              borderRadius: '2px',
              background: '#FFFFFF',
              border: '1px solid #111111',
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

  const renderMessageText = (text: string) => {
    if (text.includes('⚠️')) {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', verticalAlign: 'middle' }}>
          <CustomEmoji name="warning" size={16} />
          <span>{text.replace(/⚠️/g, '').trim()}</span>
        </span>
      );
    }

    let emojiName: 'arrow_up' | 'arrow_down' | 'arrow_left' | 'arrow_right' | 'dance' | 'spin' | 'happy' | 'sad' | 'angry' | 'surprised' | 'neutral' | null = null;

    if (text.includes('前進')) emojiName = 'arrow_up';
    else if (text.includes('後退')) emojiName = 'arrow_down';
    else if (text.includes('左轉')) emojiName = 'arrow_left';
    else if (text.includes('右轉')) emojiName = 'arrow_right';
    else if (text.includes('跳舞')) emojiName = 'dance';
    else if (text.includes('旋轉')) emojiName = 'spin';
    else if (text.includes('開心')) emojiName = 'happy';
    else if (text.includes('難過')) emojiName = 'sad';
    else if (text.includes('生氣')) emojiName = 'angry';
    else if (text.includes('驚訝')) emojiName = 'surprised';
    else if (text.includes('平靜')) emojiName = 'neutral';

    if (emojiName) {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', verticalAlign: 'middle' }}>
          <CustomEmoji name={emojiName} size={18} />
          <span>{text}</span>
        </span>
      );
    }

    return text;
  };

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
        <div style={{ textAlign: 'center', fontWeight: 700, color: 'var(--text-secondary)', marginTop: 'auto', marginBottom: 'auto' }}>
          說點什麼來開始對話吧！
        </div>
      )}
      {messages.map((msg) => (
        <div 
          key={msg.id} 
          style={{
            alignSelf: msg.sender === 'user' ? 'flex-end' : msg.sender === 'system' ? 'center' : 'flex-start',
            background: msg.sender === 'user' 
              ? 'var(--accent-blue)' 
              : msg.sender === 'system' 
                ? 'var(--accent-purple)' 
                : '#FFFFFF',
            color: msg.sender === 'user' 
              ? '#FFFFFF' 
              : msg.sender === 'system' 
                ? '#FFFFFF' 
                : '#111111',
            padding: '12px 16px',
            borderRadius: '16px',
            borderBottomRightRadius: msg.sender === 'user' ? '4px' : '16px',
            borderBottomLeftRadius: msg.sender === 'robot' ? '4px' : '16px',
            border: '2px solid #111111',
            maxWidth: '80%',
            boxShadow: '2px 2px 0px #111111',
            fontSize: msg.sender === 'system' ? '0.85rem' : '1rem',
            fontWeight: msg.sender === 'system' ? 700 : 600,
          }}
        >
          {msg.type === 'audio' ? <AudioBubble /> : renderMessageText(msg.text)}
        </div>
      ))}
      <div ref={endRef} />
    </div>
  );
}

