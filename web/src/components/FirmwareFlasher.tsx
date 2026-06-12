import { useState } from 'react';
import { ESPLoader, Transport } from 'esptool-js';
import { X, Usb, CloudDownload, ChevronDown, ChevronUp } from 'lucide-react';

interface FirmwareFlasherProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FirmwareFlasher({ isOpen, onClose }: FirmwareFlasherProps) {
  const [esploader, setEsploader] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  const [bootloaderFile, setBootloaderFile] = useState<File | null>(null);
  const [partitionsFile, setPartitionsFile] = useState<File | null>(null);
  const [firmwareFile, setFirmwareFile] = useState<File | null>(null);
  
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [isFlashing, setIsFlashing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);
  const [eraseAll, setEraseAll] = useState(false);

  // Helper to add logs
  const logMsg = (msg: string) => {
    setLogs((prev) => [...prev, msg]);
  };

  const handleConnect = async () => {
    try {
      if (!(navigator as any).serial) {
        alert('Web Serial API is not supported in this browser. Please use Chrome or Edge.');
        return;
      }
      
      const selectedPort = await (navigator as any).serial.requestPort();
      // removed setPort
      
      const newTransport = new Transport(selectedPort);
      // removed setTransport
      
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
      // @ts-ignore
      await loader.main();
      
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
          address: 0x0
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
      
      await esploader.writeFlash({
        fileArray: fileArray,
        flashSize: 'keep',
        flashMode: 'keep',
        flashFreq: 'keep',
        eraseAll: eraseAll,
        compress: true,
        reportProgress: (_fileIndex: number, written: number, total: number) => {
          const percentage = Math.round((written / total) * 100);
          setProgress(percentage);
        }
      });
      
      logMsg('Flashing completed successfully!');
      // Hard reset
      await esploader.after('hard_reset');
    } catch (e: any) {
      console.error(e);
      logMsg('Flash failed: ' + e.message);
    } finally {
      setIsFlashing(false);
    }
  };

  const handleCloudFlash = async () => {
    if (!esploader || !isConnected) return;
    
    setIsFlashing(true);
    setIsDownloading(true);
    setProgress(0);
    logMsg('Fetching latest release info from GitHub...');
    
    try {
      const response = await fetch('https://api.github.com/repos/DarkSchneider1024/chibi-moe/releases/latest');
      if (!response.ok) {
        throw new Error('Failed to fetch release info. Make sure the repository is public or you have internet access.');
      }
      const release = await response.json();
      logMsg(`Found release: ${release.name}`);
      
      const bootloaderAsset = release.assets.find((a: any) => a.name === 'bootloader.bin');
      const partitionsAsset = release.assets.find((a: any) => a.name === 'partitions.bin');
      const firmwareAsset = release.assets.find((a: any) => a.name === 'firmware.bin');
      
      if (!firmwareAsset) throw new Error('firmware.bin not found in release assets.');
      
      const downloadFile = async (url: string, name: string) => {
        logMsg(`Downloading ${name}...`);
        
        // Use the Vercel Serverless Function to proxy the download.
        // This solves Cloudflare blocking public proxies, and works without needing a local backend!
        const proxyUrl = `https://chibi-moe.vercel.app/api/proxy?url=${encodeURIComponent(url)}`;
        
        const res = await fetch(proxyUrl);
        if (!res.ok) throw new Error(`Failed to download ${name}`);
        return await res.arrayBuffer();
      };

      const fileArray = [];
      if (bootloaderAsset) {
        fileArray.push({ data: new Uint8Array(await downloadFile(bootloaderAsset.browser_download_url, 'bootloader')), address: 0x0 });
      }
      if (partitionsAsset) {
        fileArray.push({ data: new Uint8Array(await downloadFile(partitionsAsset.browser_download_url, 'partitions')), address: 0x8000 });
      }
      fileArray.push({ data: new Uint8Array(await downloadFile(firmwareAsset.browser_download_url, 'firmware')), address: 0x10000 });

      setIsDownloading(false);
      logMsg('Starting flash process...');
      
      await esploader.writeFlash({
        fileArray: fileArray,
        flashSize: 'keep',
        flashMode: 'keep',
        flashFreq: 'keep',
        eraseAll: eraseAll,
        compress: true,
        reportProgress: (_fileIndex: number, written: number, total: number) => {
          const percentage = Math.round((written / total) * 100);
          setProgress(percentage);
        }
      });
      
      logMsg('Flashing completed successfully!');
      await esploader.after('hard_reset');
    } catch (e: any) {
      console.error(e);
      logMsg('Cloud Flash failed: ' + e.message);
      setIsDownloading(false);
    } finally {
      setIsFlashing(false);
      setIsDownloading(false);
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
        
        <h2 style={{ display: 'flex', alignItems: 'center' }}><Usb style={{ marginRight: '8px' }} /> 韌體刷機 (Firmware Flasher)</h2>
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>狀態: {isConnected ? <span style={{color: 'var(--success)'}}>已連線</span> : <span style={{color: 'var(--danger)'}}>未連線</span>}</span>
          {!isConnected && (
            <button className="btn-primary" onClick={handleConnect}>連線設備 (Connect Device)</button>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <button 
            className="btn-primary" 
            style={{ 
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              padding: '16px', fontSize: '1.1rem',
              opacity: (!isConnected || isFlashing) ? 0.5 : 1,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)'
            }}
            disabled={!isConnected || isFlashing}
            onClick={handleCloudFlash}
          >
            <CloudDownload size={24} />
            {isDownloading ? '從雲端下載中...' : (isFlashing ? `刷機中... ${progress}%` : '刷入最新雲端版本 (Flash Latest Cloud Release)')}
          </button>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '8px' }}>
            <button 
              onClick={() => setIsAdvancedMode(!isAdvancedMode)}
              style={{ 
                background: 'none', border: 'none', color: 'var(--text-secondary)', 
                display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.9rem',
                margin: '0 auto'
              }}
            >
              {isAdvancedMode ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              進階選項：手動選擇檔案 (Advanced: Manual File Selection)
            </button>
            
            {isAdvancedMode && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '12px', marginTop: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px', color: 'var(--text-secondary)' }}>Bootloader (0x0) - 選填</label>
                  <input type="file" accept=".bin" onChange={(e) => setBootloaderFile(e.target.files?.[0] || null)} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px', color: 'var(--text-secondary)' }}>Partitions (0x8000) - 選填</label>
                  <input type="file" accept=".bin" onChange={(e) => setPartitionsFile(e.target.files?.[0] || null)} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px', color: 'var(--text-secondary)' }}>Firmware (0x10000) - 必填</label>
                  <input type="file" accept=".bin" onChange={(e) => setFirmwareFile(e.target.files?.[0] || null)} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                  <input 
                    type="checkbox" 
                    id="eraseAll" 
                    checked={eraseAll}
                    onChange={(e) => setEraseAll(e.target.checked)} 
                  />
                  <label htmlFor="eraseAll" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>刷機前清除所有記憶體 (Erase all flash, 清除 WiFi 設定)</label>
                </div>
                
                <button 
                  className="btn-primary" 
                  disabled={!isConnected || isFlashing || !firmwareFile} 
                  onClick={handleFlash}
                  style={{ opacity: (!isConnected || isFlashing || !firmwareFile) ? 0.5 : 1, marginTop: '8px' }}
                >
                  {isFlashing && !isDownloading ? `刷機中... ${progress}%` : '開始手動刷機 (Start Manual Flash)'}
                </button>
              </div>
            )}
          </div>
        </div>

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
