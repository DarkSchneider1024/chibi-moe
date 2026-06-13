# WiFi 與 WebSocket 設定

## 建議的可攜式設定

如果要帶著 Chibi-Moe 到不同地點展示或移動使用，建議讓機器人連手機熱點。

1. 開啟手機熱點。
2. 固定熱點的 SSID 與密碼，不要每次變更。
3. 開啟機器人電源。
4. 如果機器人進入 `Chibi-Moe-Setup` 設定熱點，請連上它，並在設定頁選擇手機熱點。
5. 後端網址設定為 `wss://chibi.carrot-atelier.online`。

這樣機器人會跟著手機熱點移動，而後端仍固定使用公開雲端入口。

## 家用或實驗室設定

如果機器人固定在家中、辦公室或實驗室使用，可以直接綁定固定 WiFi。這種方式在 SSID 長期存在時很方便。

但如果要外出展示或旅行，固定 WiFi 不在附近時，機器人會需要重新進入 WiFiManager 設定流程。

## 後端網址規則

Firmware 可以接受主機名稱加 port，也可以接受完整 WebSocket URL。

可用範例：

- `chibi.carrot-atelier.online`，port 使用 `443`
- `wss://chibi.carrot-atelier.online`
- `ws://192.168.1.10:3001`，僅供本機測試

正式環境請使用 `wss://`。只有在可信任的本機網路測試時，才使用 `ws://`。
