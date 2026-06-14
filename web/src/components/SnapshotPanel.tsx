import { Download, Trash2, X, Image as ImageIcon } from 'lucide-react';
import { useState } from 'react';

export interface Snapshot {
  id: string;
  dataUrl: string;
  timestamp: Date;
}

interface SnapshotPanelProps {
  snapshots: Snapshot[];
  onDelete: (id: string) => void;
  onClearAll: () => void;
}

export function SnapshotPanel({ snapshots, onDelete, onClearAll }: SnapshotPanelProps) {
  const [previewId, setPreviewId] = useState<string | null>(null);

  if (snapshots.length === 0) return null;

  const previewSnap = snapshots.find(s => s.id === previewId);

  const handleDownload = (snap: Snapshot) => {
    const a = document.createElement('a');
    a.href = snap.dataUrl;
    const ts = snap.timestamp;
    const pad = (n: number) => String(n).padStart(2, '0');
    a.download = `chibi-moe_${ts.getFullYear()}${pad(ts.getMonth() + 1)}${pad(ts.getDate())}_${pad(ts.getHours())}${pad(ts.getMinutes())}${pad(ts.getSeconds())}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const formatTime = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };

  return (
    <>
      <div style={{
        width: '100%',
        maxWidth: '480px',
        marginBottom: '16px',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '10px',
          padding: '0 4px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ImageIcon size={16} style={{ color: 'var(--accent-blue)' }} />
            <span style={{
              fontSize: '0.85rem',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              letterSpacing: '0.02em',
            }}>
              快照紀錄 ({snapshots.length}/10)
            </span>
          </div>
          <button
            onClick={onClearAll}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--danger)',
              fontSize: '0.75rem',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: '6px',
              transition: 'background 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.15)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            title="清除全部"
          >
            <Trash2 size={12} />
            清除全部
          </button>
        </div>

        {/* Thumbnail strip */}
        <div style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '6px',
          scrollbarWidth: 'thin',
        }}>
          {snapshots.map((snap, idx) => (
            <div
              key={snap.id}
              style={{
                position: 'relative',
                flexShrink: 0,
                width: '88px',
                borderRadius: '10px',
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(0,0,0,0.4)',
                cursor: 'pointer',
                transition: 'all 0.25s ease',
                boxShadow: previewId === snap.id
                  ? '0 0 0 2px var(--accent-blue), 0 4px 16px rgba(59,130,246,0.3)'
                  : '0 2px 8px rgba(0,0,0,0.2)',
              }}
              onMouseEnter={e => {
                if (previewId !== snap.id) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.3)';
                }
              }}
              onMouseLeave={e => {
                if (previewId !== snap.id) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
                }
              }}
              onClick={() => setPreviewId(previewId === snap.id ? null : snap.id)}
            >
              <img
                src={snap.dataUrl}
                alt={`快照 #${idx + 1}`}
                style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', display: 'block' }}
              />
              {/* Time label */}
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
                padding: '12px 6px 4px',
                fontSize: '0.65rem',
                color: 'rgba(255,255,255,0.85)',
                textAlign: 'center',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {formatTime(snap.timestamp)}
              </div>
              {/* Index badge */}
              <div style={{
                position: 'absolute',
                top: '4px',
                left: '4px',
                background: 'rgba(0,0,0,0.6)',
                borderRadius: '6px',
                padding: '1px 5px',
                fontSize: '0.6rem',
                color: 'rgba(255,255,255,0.7)',
                backdropFilter: 'blur(4px)',
              }}>
                #{idx + 1}
              </div>
              {/* Action buttons on hover */}
              <div
                className="snap-actions"
                style={{
                  position: 'absolute',
                  top: '3px',
                  right: '3px',
                  display: 'flex',
                  gap: '3px',
                  opacity: 0,
                  transition: 'opacity 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
              >
                <button
                  onClick={(e) => { e.stopPropagation(); handleDownload(snap); }}
                  style={{
                    background: 'rgba(59,130,246,0.85)',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '4px',
                    cursor: 'pointer',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backdropFilter: 'blur(4px)',
                  }}
                  title="下載"
                >
                  <Download size={12} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(snap.id); if (previewId === snap.id) setPreviewId(null); }}
                  style={{
                    background: 'rgba(239,68,68,0.85)',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '4px',
                    cursor: 'pointer',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backdropFilter: 'blur(4px)',
                  }}
                  title="刪除"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Full-size preview modal */}
      {previewSnap && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(8px)',
            animation: 'fadeIn 0.2s ease',
          }}
          onClick={() => setPreviewId(null)}
        >
          <div
            style={{
              position: 'relative',
              maxWidth: '90vw',
              maxHeight: '80vh',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <img
              src={previewSnap.dataUrl}
              alt="快照預覽"
              style={{ maxWidth: '90vw', maxHeight: '80vh', display: 'block', objectFit: 'contain' }}
            />
            {/* Top bar */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 16px',
              background: 'linear-gradient(rgba(0,0,0,0.7), transparent)',
            }}>
              <span style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 600 }}>
                {previewSnap.timestamp.toLocaleString('zh-TW')}
              </span>
              <button
                onClick={() => setPreviewId(null)}
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#fff',
                  backdropFilter: 'blur(4px)',
                }}
              >
                <X size={18} />
              </button>
            </div>
            {/* Bottom bar */}
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              display: 'flex',
              justifyContent: 'center',
              gap: '12px',
              padding: '16px',
              background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
            }}>
              <button
                onClick={() => handleDownload(previewSnap)}
                style={{
                  background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '8px 20px',
                  cursor: 'pointer',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(59,130,246,0.4)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <Download size={16} />
                下載
              </button>
              <button
                onClick={() => { onDelete(previewSnap.id); setPreviewId(null); }}
                style={{
                  background: 'rgba(239,68,68,0.2)',
                  border: '1px solid rgba(239,68,68,0.4)',
                  borderRadius: '10px',
                  padding: '8px 20px',
                  cursor: 'pointer',
                  color: 'var(--danger)',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'transform 0.2s, background 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.background = 'rgba(239,68,68,0.3)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.background = 'rgba(239,68,68,0.2)'; }}
              >
                <Trash2 size={16} />
                刪除
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
