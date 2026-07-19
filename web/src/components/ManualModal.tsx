import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { X, BookOpen } from 'lucide-react';
import firmwareDoc from '../../../docs/firmware.md?raw';
import architectureDoc from '../../../docs/architecture.md?raw';
import hardwareDoc from '../../../docs/hardware-setup.md?raw';
import uiUxGuideDoc from '../../../docs/ui-ux-guide.md?raw';

interface ManualModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ManualModal({ isOpen, onClose }: ManualModalProps) {
  const [activeTab, setActiveTab] = useState<'ui-ux' | 'firmware' | 'hardware' | 'architecture'>('ui-ux');

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      backdropFilter: 'blur(8px)',
      padding: '16px'
    }}>
      <div className="glass-panel" style={{ 
        width: '100%', 
        maxWidth: '800px', 
        height: '85vh', 
        padding: '20px', 
        position: 'relative', 
        display: 'flex', 
        flexDirection: 'column',
        boxSizing: 'border-box',
        overflow: 'hidden'
      }}>
        <button onClick={onClose} className="btn-icon" style={{ position: 'absolute', top: '16px', right: '16px', width: '32px', height: '32px' }}>
          <X size={16} />
        </button>
        
        <h2 style={{ display: 'flex', alignItems: 'center', marginBottom: '16px', fontSize: '1.4rem' }}>
          <BookOpen style={{ marginRight: '8px' }} /> 系統說明書
        </h2>
        
        <div style={{ 
          display: 'flex', 
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: '8px', 
          marginBottom: '16px' 
        }}>
          <button 
            className="btn-primary" 
            style={{ 
              opacity: activeTab === 'ui-ux' ? 1 : 0.5, 
              flex: '1 1 0px',
              minWidth: '100px',
              padding: '8px 12px',
              fontSize: '0.9rem',
              whiteSpace: 'nowrap'
            }}
            onClick={() => setActiveTab('ui-ux')}
          >
            UI/UX 操作指引
          </button>
          <button 
            className="btn-primary" 
            style={{ 
              opacity: activeTab === 'firmware' ? 1 : 0.5, 
              flex: '1 1 0px',
              minWidth: '100px',
              padding: '8px 12px',
              fontSize: '0.9rem',
              whiteSpace: 'nowrap'
            }}
            onClick={() => setActiveTab('firmware')}
          >
            韌體燒錄 SOP
          </button>
          <button 
            className="btn-primary" 
            style={{ 
              opacity: activeTab === 'hardware' ? 1 : 0.5, 
              flex: '1 1 0px',
              minWidth: '100px',
              padding: '8px 12px',
              fontSize: '0.9rem',
              whiteSpace: 'nowrap'
            }}
            onClick={() => setActiveTab('hardware')}
          >
            硬體組裝指引
          </button>
          <button 
            className="btn-primary" 
            style={{ 
              opacity: activeTab === 'architecture' ? 1 : 0.5, 
              flex: '1 1 0px',
              minWidth: '100px',
              padding: '8px 12px',
              fontSize: '0.9rem',
              whiteSpace: 'nowrap'
            }}
            onClick={() => setActiveTab('architecture')}
          >
            系統架構
          </button>
        </div>

        {activeTab === 'hardware' && (
          <a
            href="/docs/breadboard-audio-wiring.html"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'block',
              margin: '0 0 10px',
              padding: '10px 16px',
              borderRadius: '10px',
              background: 'var(--accent-yellow, #f5c518)',
              color: '#1a1a1a',
              fontWeight: 700,
              textDecoration: 'none',
              textAlign: 'center',
            }}
          >
            🔌 麥克風／喇叭麵包板接線圖解（互動圖，點我開新分頁）
          </a>
        )}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          background: 'rgba(0,0,0,0.2)',
          padding: '16px',
          borderRadius: '12px',
          color: 'var(--text-primary)',
          lineHeight: '1.6'
        }} className="markdown-body">
          <ReactMarkdown>
            {activeTab === 'ui-ux' ? uiUxGuideDoc : activeTab === 'firmware' ? firmwareDoc : activeTab === 'hardware' ? hardwareDoc : architectureDoc}
          </ReactMarkdown>
        </div>

      </div>
    </div>
  );
}
