import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { X, BookOpen } from 'lucide-react';
import firmwareDoc from '../../../docs/firmware.md?raw';
import architectureDoc from '../../../docs/architecture.md?raw';

interface ManualModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ManualModal({ isOpen, onClose }: ManualModalProps) {
  const [activeTab, setActiveTab] = useState<'firmware' | 'architecture'>('firmware');

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
      backdropFilter: 'blur(8px)'
    }}>
      <div className="glass-panel" style={{ width: '800px', height: '80vh', padding: '24px', position: 'relative', display: 'flex', flexDirection: 'column' }}>
        <button onClick={onClose} className="btn-icon" style={{ position: 'absolute', top: '16px', right: '16px', width: '32px', height: '32px' }}>
          <X size={16} />
        </button>
        
        <h2 style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}><BookOpen style={{ marginRight: '8px' }} /> 系統說明書</h2>
        
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <button 
            className="btn-primary" 
            style={{ opacity: activeTab === 'firmware' ? 1 : 0.5, flex: 1 }}
            onClick={() => setActiveTab('firmware')}
          >
            韌體燒錄 SOP
          </button>
          <button 
            className="btn-primary" 
            style={{ opacity: activeTab === 'architecture' ? 1 : 0.5, flex: 1 }}
            onClick={() => setActiveTab('architecture')}
          >
            系統架構
          </button>
        </div>

        <div style={{ 
          flex: 1, 
          overflowY: 'auto', 
          background: 'rgba(0,0,0,0.2)', 
          padding: '24px', 
          borderRadius: '12px',
          color: 'var(--text-primary)',
          lineHeight: '1.6'
        }} className="markdown-body">
          <ReactMarkdown>
            {activeTab === 'firmware' ? firmwareDoc : architectureDoc}
          </ReactMarkdown>
        </div>

      </div>
    </div>
  );
}
