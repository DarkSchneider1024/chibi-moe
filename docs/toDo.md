# Chibi-Moe 待辦事項 (To-Do)

## 今晚要完成的 DNS 與雲端連線設定

目前後端已經透過 GitHub Actions 與 ArgoCD 成功部署到 OKE (Oracle Kubernetes Engine) 叢集上，剩下最後的網域對接設定：

### 1. 設定 DNS (Namecheap)
因為目前網域 `carrot-atelier.online` 託管在 Namecheap 上，請登入 Namecheap 進行設定：
- **登入網址**：[https://www.namecheap.com/](https://www.namecheap.com/)
- 前往 **Domain List** -> 找到 `carrot-atelier.online` -> 點擊 **Manage**
- 切換到 **Advanced DNS** 頁籤
- 點擊 **Add New Record**：
  - **Type**: 選擇 `CNAME Record`（或者如果您知道 Ingress 的實體 IP，可以直接選 `A Record` 並填入 IP）
  - **Host**: 填入 `chibi`
  - **Value**: 填入指向您 OKE 叢集 Nginx Ingress 的目標位址 (與 `wafer-bi` 專案使用的 IP/CNAME 相同)
- 點擊打勾儲存，等待幾分鐘讓 DNS 生效。

### 2. 更新 Vercel 網頁設定
DNS 生效後，您的手機與機器人就可以透過雲端連線到 Node.js 伺服器了：
- 打開已經部署好的網頁：[https://chibi-moe.vercel.app/](https://chibi-moe.vercel.app/)
- 點開下方的**設定 (齒輪圖示)**。
- 找到 **Backend WebSocket URL** 欄位。
- 將原本的 `ws://localhost:3001` 改成：
  - 填入: `wss://chibi.carrot-atelier.online`
  *(注意：因為上了雲端有自動化的 Let's Encrypt SSL 憑證，所以請務必使用 `wss://` 代表加密連線)*
- 點擊儲存，網頁就會自動嘗試連線到您的雲端大腦。

### 3. ESP32 機器人韌體修改 (未來計畫)
當硬體準備好時：
- 將機器人程式內的 WebSocket 連線位址也改為 `wss://chibi.carrot-atelier.online`。
- 開啟電源，讓它跟網頁一起連上您的無敵 OCI 大腦，開始互動！
