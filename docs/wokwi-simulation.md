# Wokwi 模擬指南（免焊接測試整套架構）

在焊接完成前，可用 Wokwi 模擬 ESP32-S3 韌體，驗證「網頁 ⇄ 本機後端 ⇄ 機器人」的完整鏈路，
包含搖桿控制與 AI 語音指令觸發馬達（以 LED 顯示）。

## 架構

```
Web (Vercel/本機) ⇄ 本機 Docker 後端 (localhost:3001) ⇄ Wokwi 模擬的 ESP32-S3
                                                        └─ G19/G20/G21/G47 → 4 顆 LED（代表左右輪正反轉）
```

- 韌體使用 `wokwi` 編譯目標（`platformio.ini` 的 `[env:wokwi]`，定義 `WOKWI_SIM`）：
  - 跳過 WiFiManager，自動連 Wokwi 虛擬熱點 `Wokwi-GUEST`
  - WebSocket 預設直連 `host.wokwi.internal:3001`（= 執行模擬的這台電腦）
  - 相機不模擬（`initCamera()` 直接略過）；不使用 PSRAM

## 使用步驟（VS Code 擴充版，建議）

1. **後端先跑起來**：`docker compose up -d`（連 `http://localhost:3001/healthz` 回 `{"ok":true}` 即可）。
2. **編譯模擬韌體**：
   ```
   pio run -d firmware -e wokwi
   ```
   （或 PlatformIO 側欄選 `wokwi` 環境按 Build）
3. **啟動模擬**：VS Code 按 `F1` → `Wokwi: Start Simulator`，選擇 `firmware/wokwi.toml`。
   （若找不到，改用「檔案 → 開啟資料夾」直接開 `firmware/` 再執行）
4. 模擬器的序列埠視窗應依序出現：
   ```
   WOKWI build: joining Wokwi-GUEST virtual WiFi...
   WiFi Connected!
   [WSc] Connected to url: /
   ```
5. 打開網頁（chibi-moe.vercel.app 選「本機後端」），狀態列顯示 **機器人 已連線**。

## 可以測什麼

| 測試 | 操作 | 預期結果 |
|---|---|---|
| 搖桿控制 | 機器人操控台推搖桿 | 對應 LED 亮 0.5 秒（綠=前進、紅=後退，左右輪各一組） |
| AI 指令 | 網頁對 AI 說/打「往前走」「轉圈圈」 | Gemini 呼叫 robot_move → LED 亮、網頁對話顯示回覆 |
| 狀態回報 | 模擬啟動時 | 後端 log 出現 `[Robot] Status received: idle` |
| 設定下發 | 網頁「同步設定至機器人」 | 序列埠印出 update_config 並重啟 |

## 模擬限制

- **相機**：Wokwi 沒有相機模擬，網頁開鏡頭不會有畫面（韌體會略過）。
- **麥克風/喇叭**：INMP441 與 MAX98357A 無對應元件；點模擬器上的 BOOT 鍵可觸發錄音流程，但錄到的是空白音訊。
- 語音 AI 的完整測試請走**網頁端麥克風**（跟後端的 AI 鏈路相同，只是輸入端不同）。

## wokwi.com 線上版（備用）

線上版要連你本機的後端需另外跑 [Private IoT Gateway](https://docs.wokwi.com/guides/esp32-wifi#the-private-iot-gateway)，
且需手動上傳 `diagram.json` 與 `firmware.bin`。既然 VS Code 擴充已可用，建議直接用擴充版。
