# 🤖 Chibi-Moe 機器人韌體燒錄標準作業程序 (SOP)

這份 SOP 將指導您如何一步一步將編譯好的韌體（Firmware）燒錄到您的 Chibi-Moe 機器人硬體（以 ESP32 晶片為例）。

---

## 🛠️ 第一階段：事前準備

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

## 🚀 第二階段：開始燒錄 (請選擇一種最適合您的方法)

### 方法 A：使用網頁一鍵燒錄 (Web Serial) - 🌟 最推薦新手！

這是最簡單的方法，不需要安裝任何驅動或軟體。

1. **開啟瀏覽器**：請務必使用最新版的 **Google Chrome** 或 **Microsoft Edge**。
2. **連接硬體**：將機器人插上 USB 線，另一頭接上電腦。
3. **開啟網頁**：進入 Chibi-Moe 的 Web 系統首頁。
4. **進入燒錄介面**：點擊網頁選單中的「**設定**」->「**韌體更新 (Firmware Update)**」。
5. **連線設備**：
   - 點擊「**連接設備 (Connect)**」按鈕。
   - 瀏覽器會跳出一個小視窗，請選擇對應的序列埠（在 Windows 上通常叫 `COM3` 或 `COM4`，在 Mac 上通常叫 `/dev/tty.usbmodem...` 或 `cu.usbserial...`）。
   - 選擇後點擊「連線」。
6. **執行燒錄**：
   - 點擊「**開始燒錄 (Start Flashing)**」。
   - 請耐心等待網頁上的進度條跑到 100%（約需 30~60 秒）。
   - 燒錄期間**絕對不可以拔除 USB 線**。
7. **完成**：顯示「燒錄成功」後，機器人會自動重啟。

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

## 💡 第三階段：常見問題排除 (Troubleshooting)

| 遇到的狀況 | 可能的原因 | 解決方案 |
| :--- | :--- | :--- |
| **找不到 COM Port** | 線材問題或缺少驅動程式 | 1. 換一條確定有資料傳輸功能的 USB 線。<br>2. 安裝 CH340 或 CP2102 的 USB-to-Serial 驅動程式。 |
| **燒錄到一半出現 Timeout / 失敗** | 進入燒錄模式失敗 | 重新插拔 USB 線。在按下「開始燒錄」時，**按住板子上的 `BOOT` 按鈕**，直到畫面出現進度條再放開。 |
| **燒錄成功，但機器人沒反應** | 供電不足或未重新啟動 | 1. 按下板子上的 `EN` 或 `RST` 按鈕重新啟動。<br>2. 確保 USB 供電足夠驅動機器人馬達或喇叭。 |
