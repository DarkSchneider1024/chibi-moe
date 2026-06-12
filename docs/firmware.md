# 機器人韌體燒錄指南 (Firmware Flashing Guide)

本指南說明如何將編譯好的韌體燒錄至 `chibi-moe` 機器人硬體（假設使用 ESP32 或相容微控制器）。

## 1. 燒錄環境準備

韌體的開發與編譯推薦使用以下工具：
- **PlatformIO**: 整合於 VSCode 中，適合 C++ 專案管理與依賴安裝。
- **Arduino IDE**: 適合新手快速測試與燒錄。
- **ESP-IDF**: 如果需要高度客製化或使用 FreeRTOS 進階功能。

## 2. 燒錄方式 (Flashing Methods)

我們提供兩種燒錄方式：Web Serial 燒錄（對使用者最友善）與 CLI 命令列燒錄（適合開發者）。

### 方法一：Web Serial 燒錄 (推薦一般使用者)

未來在 Web 介面中將提供「一鍵燒錄」功能。使用者不需安裝任何開發環境，只需：
1. 使用 USB 傳輸線將機器人與電腦連接。
2. 使用支援 Web Serial API 的瀏覽器（如 Google Chrome 或 Microsoft Edge）開啟 `chibi-moe` 網站。
3. 進入「設定 -> 韌體更新」頁面。
4. 點擊「連接設備」，在彈出的視窗中選擇對應的 COM Port / 序列埠。
5. 點擊「開始燒錄」，系統會自動將伺服器上的 `.bin` 檔案寫入設備。

> *技術細節：前端會使用 [esptool-js](https://github.com/espressif/esptool-js) 函式庫來實作 Web Serial 燒錄。*

### 方法二：CLI 命令列燒錄 (適合開發者)

如果您有編譯好的 `.bin` 檔案（例如 `firmware.bin`, `bootloader.bin`, `partitions.bin`），您可以使用 Python 的 `esptool.py` 工具進行燒錄。

**1. 安裝 esptool**
```bash
pip install esptool
```

**2. 尋找序列埠**
- **Windows**: 開啟裝置管理員，尋找「連接埠 (COM 和 LPT)」底下的設備（例如 `COM3`）。
- **Mac/Linux**: 執行 `ls /dev/tty.*` 或 `ls /dev/ttyUSB*` 尋找設備名稱（例如 `/dev/ttyUSB0`）。

**3. 執行燒錄指令**
請替換 `<PORT>` 為您的序列埠名稱：
```bash
esptool.py --port <PORT> --baud 460800 write_flash -z 0x10000 firmware.bin
```

## 3. 常見問題 (FAQ)

- **Q: 電腦抓不到 USB 序列埠？**
  - A: 請確認您使用的是「傳輸線」而非僅支援充電的線。另外，某些開發板需要安裝 CP210x 或 CH340 的驅動程式。
- **Q: 燒錄時出現 `Failed to connect to ESP32: Timed out waiting for packet header` 錯誤？**
  - A: 某些 ESP32 板子在燒錄時需要手動按住板子上的 `BOOT` 按鈕，直到畫面出現 `Connecting...` 再放開。
