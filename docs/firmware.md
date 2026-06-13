# Chibi-Moe 機器人韌體燒錄標準作業程序 (SOP)

這份 SOP 將指導您如何一步一步將編譯好的韌體（Firmware）燒錄到您的 Chibi-Moe 機器人硬體（以 ESP32 晶片為例）。

---

## 第一階段：事前準備

### 1. 硬體準備
- **Chibi-Moe 機器人主板** (ESP32 等相容開發板)
- **傳輸用的 USB 線**
  > [!WARNING]
  > 請確保這是一條**支援資料傳輸 (Data Sync)** 的 USB 線。市面上許多廉價的線材僅支援充電，無法用來燒錄韌體！
- **可上網的電腦** (Windows / macOS / Linux 皆可)

### 2. 取得韌體檔案
確保您已經拿到最新的韌體二進位檔案，通常會包含以下幾個檔案：
- `bootloader.bin`
- `partitions.bin`
- `firmware.bin` (主程式)

---

## 第二階段：開始燒錄 (請選擇一種最適合您的方法)

### 方法 A：使用網頁一鍵雲端更新 (Web Serial) - 🌟 最推薦新手！

這是最簡單的方法，不需要安裝任何驅動或軟體，而且會自動抓取最新版韌體。

1. **開啟瀏覽器**：請務必使用最新版的 **Google Chrome** 或 **Microsoft Edge**。
2. **連接硬體**：將機器人插上 USB 線，另一頭接上電腦。
3. **開啟網頁**：進入 Chibi-Moe 的 Web 系統首頁。
4. **進入燒錄介面**：在網頁下方的控制面板（Control Panel）中，點擊 **CPU 圖示**（Firmware Flasher）按鈕。
5. **連線設備**：
   - 點擊「**Connect Device**」按鈕。
   - 瀏覽器會跳出一個小視窗，請選擇對應的序列埠（在 Windows 上通常叫 `COM3` 或 `COM4`，在 Mac 上通常叫 `/dev/tty.usbmodem...` 或 `cu.usbserial...`）。
   - 選擇後點擊「連線」。
6. **執行一鍵燒錄**：
   - 點擊藍紫色按鈕「**Flash Latest Cloud Release**」。
   - 系統會自動從 GitHub 下載最新編譯的韌體，並開始燒錄進度。
   - 請耐心等待網頁上的進度條跑到 100%（約需 30~60 秒）。
   - 燒錄期間**絕對不可以拔除 USB 線**。
7. **完成**：顯示「Flashing completed successfully!」後，機器人會自動重啟。

---

### 方法 B：手動選擇檔案燒錄 (Advanced Mode)

如果你有自己修改程式碼並在本地端編譯（例如使用 PlatformIO），請在 Firmware Flasher 中點擊展開「**Advanced: Manual File Selection**」，然後手動選取你編譯出的三個檔案 (`bootloader.bin`, `partitions.bin`, `firmware.bin`) 並點擊「Start Manual Flash」。

---

### 方法 B：使用 esptool 開發者命令列工具

如果您是開發者或想在無圖形介面的環境下燒錄，請使用此方法。

1. **安裝 Python 環境**
   確保電腦已安裝 Python，並開啟終端機 (Terminal / PowerShell)。
   ```bash
   # 安裝 esptool 燒錄工具
   pip install esptool
   ```

2. **找出設備的 COM Port**
   - **Windows**: 右鍵點擊開始選單 -> 裝置管理員 -> 展開「連接埠 (COM 和 LPT)」-> 找到您的板子 (例如 `COM5`)。
   - **Mac/Linux**: 終端機輸入 `ls /dev/tty.*` 找到對應的 USB 設備。

3. **執行燒錄指令**
   開啟存放 `.bin` 檔案的資料夾，並執行以下指令（請將 `COM5` 替換為您的序列埠）：
   ```bash
   esptool.py --port COM5 --baud 460800 write_flash -z \
     0x1000 bootloader.bin \
     0x8000 partitions.bin \
     0x10000 firmware.bin
   ```

4. **等待完成**
   看到 `Hash of data verified.` 與 `Leaving... Hard resetting via RTS pin...` 就代表燒錄成功！

---

## 第三階段：常見問題排除 (Troubleshooting)

| 遇到的狀況 | 可能的原因 | 解決方案 |
| :--- | :--- | :--- |
| **找不到 COM Port** | 線材問題或缺少驅動程式 | 1. 換一條確定有資料傳輸功能的 USB 線。<br>2. 安裝 CH340 或 CP2102 的 USB-to-Serial 驅動程式。 |
| **燒錄到一半出現 Timeout / 失敗** | 進入燒錄模式失敗 | 重新插拔 USB 線。在按下「開始燒錄」時，**按住板子上的 `BOOT` 按鈕**，直到畫面出現進度條再放開。 |
| **燒錄成功，但機器人沒反應** | 供電不足或未重新啟動 | 1. 按下板子上的 `EN` 或 `RST` 按鈕重新啟動。<br>2. 確保 USB 供電足夠驅動機器人馬達或喇叭。 |
---

## 機器人 Debug 指南

### 1. 開啟 Serial Monitor

如果 PowerShell 找不到 `pio` 指令，請直接使用 PlatformIO 的完整路徑：

```powershell
cd c:\GitRoot\CarrotStudio\chibi-moe\firmware
C:\Users\gueiw\.platformio\penv\Scripts\pio.exe device monitor -b 115200
```

如果有多個序列埠，先列出目前裝置：

```powershell
C:\Users\gueiw\.platformio\penv\Scripts\pio.exe device list
```

再指定正確的序列埠，例如：

```powershell
C:\Users\gueiw\.platformio\penv\Scripts\pio.exe device monitor -p COM4 -b 115200
```

Monitor 開啟後，按一下板子上的 `RESET` / `EN`，讓開機 log 重新印出來。

### 2. 正常連線時應看到的 log

只有看到類似以下內容，才代表機器人已經連上後端：

```text
WiFi Connected!
Camera initialized successfully!
Configuring DNS servers: 8.8.8.8, 1.1.1.1
Resolving WebSocket host chibi.carrot-atelier.online (attempt 1/5)...
WebSocket host resolved to: 141.147.162.214
Using WSS (SSL) for WebSocket connection.
[WSc] Connected to url: /
```

如果網站後端狀態顯示 `robot.connected = false`，請優先檢查 Serial Monitor。

### 3. DNS 解析失敗

如果看到以下錯誤，代表 ESP32 無法解析後端網域：

```text
hostByName(): DNS Failed for chibi.carrot-atelier.online
```

Firmware 會設定外部 DNS 作為 fallback：

```text
8.8.8.8
1.1.1.1
```

修改 firmware 程式後，必須重新燒錄 ESP32。推到 Git 不會自動更新實體板子。

### 4. Web Serial 開啟序列埠失敗

如果網頁燒錄出現：

```text
NetworkError: Failed to execute 'open' on 'SerialPort': Failed to open serial port.
```

通常代表 `COM4` 已經被其他程式佔用。

處理方式：

1. 在 PlatformIO Serial Monitor 視窗按 `Ctrl+C` 關閉 monitor。
2. 關閉 Arduino IDE Serial Monitor 或其他序列埠工具。
3. 拔掉 ESP32 USB，再重新插上。
4. 回到網頁重新燒錄，並選擇正確的 `COM` port。

### 5. 用 PlatformIO 重新燒錄

如果 Web Serial 燒錄失敗，建議改用 PlatformIO：

快速燒錄指令：

```powershell
cd c:\GitRoot\CarrotStudio\chibi-moe\firmware
C:\Users\gueiw\.platformio\penv\Scripts\pio.exe run -e esp32s3 -t upload --upload-port COM4
```

如果 upload 連不上，按住板子 `BOOT`，開始 upload，看到開始寫入後再放開 `BOOT`。

燒錄完成後，重新開啟 Serial Monitor：

```powershell
C:\Users\gueiw\.platformio\penv\Scripts\pio.exe device monitor -p COM4 -b 115200
```

### 6. 後端狀態檢查

打開：

```text
https://chibi.carrot-atelier.online/status
```

重點欄位：

```text
web.connected
robot.connected
robot.lastFrameAt
robot.frameCount
logs
```

如果 `web.connected = true` 但 `robot.connected = false`，代表網站已連上後端，但 ESP32 尚未連上。
