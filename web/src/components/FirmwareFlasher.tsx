import React, { useState } from 'react';
import { ESPLoader, Transport } from 'esptool-js';
import { X, Usb } from 'lucide-react';

interface FirmwareFlasherProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FirmwareFlasher({ isOpen, onClose }: FirmwareFlasherProps) {
  const [port, setPort] = useState<any>(null);
  const [transport, setTransport] = useState<any>(null);
  const [esploader, setEsploader] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  const [bootloaderFile, setBootloaderFile] = useState<File | null>(null);
  const [partitionsFile, setPartitionsFile] = useState<File | null>(null);
  const [firmwareFile, setFirmwareFile] = useState<File | null>(null);
  
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [isFlashing, setIsFlashing] = useState(false);

  // Helper to add logs
  const logMsg = (msg: string) => {
    setLogs((prev) => [...prev, msg]);
  };

  const handleConnect = async () => {
    try {
      if (!navigator.serial) {
        alert('Web Serial API is not supported in this browser. Please use Chrome or Edge.');
        return;
      }
      
      const selectedPort = await (navigator as any).serial.requestPort();
      setPort(selectedPort);
      
      const newTransport = new Transport(selectedPort);
      setTransport(newTransport);
      
      // ESP32 default baud rate for flashing is 460800 or 115200
      const options = {
        transport: newTransport,
        baudrate: 115200,
        terminal: {
          clean() { setLogs([]); },
          writeLine(data: string) { logMsg(data); },
          write(data: string) { logMsg(data); }
        }
      };

      const loader = new ESPLoader(options);
      await loader.main_fn();
      
      setEsploader(loader);
      setIsConnected(true);
      logMsg('Connected to ESP device.');
    } catch (e: any) {
      console.error(e);
      logMsg('Connection failed: ' + e.message);
    }
  };

  const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  const handleFlash = async () => {
    if (!esploader || !isConnected) return;
    if (!firmwareFile) {
      alert("Please upload at least the firmware file!");
      return;
    }

    setIsFlashing(true);
    setProgress(0);

    try {
      const fileArray = [];
      
      if (bootloaderFile) {
        fileArray.push({
          data: new Uint8Array(await readFileAsArrayBuffer(bootloaderFile)),
          address: 0x1000
        });
      }
      if (partitionsFile) {
        fileArray.push({
          data: new Uint8Array(await readFileAsArrayBuffer(partitionsFile)),
          address: 0x8000
        });
      }
      if (firmwareFile) {
        fileArray.push({
          data: new Uint8Array(await readFileAsArrayBuffer(firmwareFile)),
          address: 0x10000
        });
      }

      logMsg('Starting flash process...');
      
      await esploader.write_flash({
        fileArray: fileArray,
        flashSize: 'keep',
        flashMode: 'keep',
        flashFreq: 'keep',
        eraseAll: false,
        compress: true,
        reportProgress: (fileIndex: number, written: number, total: number) => {
          const percentage = Math.round((written / total) * 100);
          setProgress(percentage);
        }
      });
      
      logMsg('Flashing completed successfully!');
      // Hard reset
      await esploader.hard_reset();
    } catch (e: any) {
      console.error(e);
      logMsg('Flash failed: ' + e.message);
    } finally {
      setIsFlashing(false);
    }
  };

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
      <div className="glass-panel" style={{ width: '600px', padding: '24px', position: 'relative', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <button onClick={onClose} className="btn-icon" style={{ position: 'absolute', top: '16px', right: '16px', width: '32px', height: '32px' }}>
          <X size={16} />
        </button>
        
        <h2 style={{ display: 'flex', alignItems: 'center' }}><Usb style={{ marginRight: '8px' }} /> Firmware Flasher</h2>
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Status: {isConnected ? <span style={{color: 'var(--success)'}}>Connected</span> : <span style={{color: 'var(--danger)'}}>Disconnected</span>}</span>
          {!isConnected && (
            <button className="btn-primary" onClick={handleConnect}>Connect Device</button>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px', color: 'var(--text-secondary)' }}>Bootloader (0x1000) - Optional</label>
            <input type="file" accept=".bin" onChange={(e) => setBootloaderFile(e.target.files?.[0] || null)} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px', color: 'var(--text-secondary)' }}>Partitions (0x8000) - Optional</label>
            <input type="file" accept=".bin" onChange={(e) => setPartitionsFile(e.target.files?.[0] || null)} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px', color: 'var(--text-secondary)' }}>Firmware (0x10000) - Required</label>
            <input type="file" accept=".bin" onChange={(e) => setFirmwareFile(e.target.files?.[0] || null)} />
          </div>
        </div>

        <button 
          className="btn-primary" 
          disabled={!isConnected || isFlashing || !firmwareFile} 
          onClick={handleFlash}
          style={{ opacity: (!isConnected || isFlashing || !firmwareFile) ? 0.5 : 1 }}
        >
          {isFlashing ? `Flashing... ${progress}%` : 'Start Flashing'}
        </button>

        {isFlashing && (
          <div style={{ width: '100%', height: '8px', background: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: 'var(--accent-blue)', transition: 'width 0.2s' }}></div>
          </div>
        )}

        <div style={{
          background: '#000', color: '#0f0', fontFamily: 'monospace', fontSize: '0.8rem',
          padding: '12px', borderRadius: '8px', height: '150px', overflowY: 'auto',
          display: 'flex', flexDirection: 'column'
        }}>
          {logs.map((log, idx) => (
            <div key={idx}>{log}</div>
          ))}
        </div>

      </div>
    </div>
  );
}
