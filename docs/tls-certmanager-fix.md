# chibi-moe TLS / WebSocket 修復紀錄

> **最後更新**：2026-06-13  
> **問題描述**：`wss://chibi.carrot-atelier.online/` 連線失敗，TLS 憑證無法簽發。

---

## 根因分析

| 層級 | 問題 | 原因 |
|------|------|------|
| **OCI IP 配額** | Node `10.0.10.154` 所有 IP 耗盡 | ollama、wafer-bi 等多個 Deployment 佔用過多 Pod IP |
| **cert-manager** | 3 個 Pod 全部卡在 `ContainerCreating` | CNI 報 `unable to allocate IP address` |
| **ClusterIssuer** | `letsencrypt-prod` 不存在 | 未建立或被清除，導致 Certificate 無法找到簽發者 |
| **Certificate** | `chibi-moe-tls` Ready=False | 上游 ClusterIssuer 缺失，ACME order 無法發起 |
| **Ingress** | webhook validate 失敗 | `ingress-nginx-controller` 同樣因 IP 不足卡在 ContainerCreating |
| **HTTP-01 solver Ingress class 缺失** | solver Ingress CLASS=`<none>` | ClusterIssuer 使用舊版 `class: nginx` 而非新版 `ingressClassName: nginx`，導致 nginx controller 看不到 solver Ingress，返回 503 |
| **ssl-redirect 攔截 ACME challenge** | Let's Encrypt 收到 308 redirect | `ssl-redirect: true` 讓 HTTP port 80 所有請求被重導向 HTTPS，需加入 `acme.cert-manager.io/http01-edit-in-place: "true"` 與 `configuration-snippet` |
| **acme solver pod IP 不足** | solver pod `ContainerCreating` | postgres 佔用剩餘 IP，暫時縮到 0 釋放 IP |

---

## 修復步驟

### 1. 釋放 OCI IP

暫時縮小非關鍵服務（Argo CD 的 auto-sync 已事先暫停）：

```bash
# 暫停 wafer-bi ArgoCD 自動同步（避免被拉回）
$app = kubectl get application wafer-bi-platform -n argocd -o json | ConvertFrom-Json
$app.spec.PSObject.Properties.Remove('syncPolicy')
$app | ConvertTo-Json -Depth 100 | kubectl apply -f -

# 縮小 wafer-bi 服務（各 0 個副本）
kubectl scale deployment wafer-backend wafer-frontend api-gateway -n k8sdemo --replicas=0

# 縮小其他非必要服務
kubectl scale deployment ollama ai-mcp-service jaeger otel-collector -n k8sdemo --replicas=0
```

### 2. 重啟 cert-manager

```bash
# 刪除卡住的 pod，讓 ReplicaSet 重新建立
kubectl delete pod -n cert-manager --all

# 確認 3 個 pod 均為 Running
kubectl get pods -n cert-manager
```

### 3. 建立 ClusterIssuer

```bash
kubectl apply -f k8s/base/cluster-issuer.yaml
```

`k8s/base/cluster-issuer.yaml` 內容：

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@carrot-atelier.online
    privateKeySecretRef:
      name: letsencrypt-prod-account-key
    solvers:
      - http01:
          ingress:
            ingressClassName: nginx   # ⚠️ 必須用 ingressClassName，不能用舊版 class
```

> **[!IMPORTANT]** `class: nginx`（舊版）與 `ingressClassName: nginx`（新版）差異：
> - `class: nginx` 使用的是 `kubernetes.io/ingress.class` annotation（舊版，已棄用）
> - `ingressClassName: nginx` 設定的是 `spec.ingressClassName` 欄位（新版）
> - cert-manager 建立的 HTTP-01 solver Ingress 必須有正確的 `ingressClassName` 才能被 nginx-ingress-controller 接管

> **注意**：`privateKeySecretRef.name` 使用既有的 `letsencrypt-prod-account-key` Secret（位於 `cert-manager` namespace），避免重新向 ACME 伺服器註冊。

### 4. 套用 Certificate

```bash
kubectl apply -f k8s/base/certificate.yaml
```

`k8s/base/certificate.yaml` 內容：

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: chibi-moe-tls
  namespace: k8sdemo
spec:
  secretName: chibi-moe-tls
  duration: 2160h    # 90 天
  renewBefore: 360h  # 到期前 15 天自動更新
  dnsNames:
    - chibi.carrot-atelier.online
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
```

### 5. 重啟 ingress-nginx

```bash
# 確認 ingress-nginx controller pod 有足夠 IP
kubectl delete pod -n ingress-nginx --all

# 確認 Running 後再套用 Ingress
kubectl get pods -n ingress-nginx
kubectl apply -f k8s/base/ingress.yaml
```

### 5.5 釋放 acme solver pod IP（若卡在 ContainerCreating）

```bash
# 暫時縮小 postgres（若 node IP 耗盡）
kubectl scale deployment postgres -n k8sdemo --replicas=0

# 刪除卡住的 solver pod，讓它重新排程
kubectl delete pod -l acme.cert-manager.io/http-domain -n k8sdemo

# 確認 solver pod Running
kubectl get pods -n k8sdemo | Select-String "acme"

# 等憑證簽完後恢復
kubectl scale deployment postgres -n k8sdemo --replicas=1
```

### 6. 等待 Certificate 簽發

```bash
# 監控 Certificate 狀態（正常約 1–3 分鐘）
kubectl get certificate chibi-moe-tls -n k8sdemo -w

# 查看詳細 ACME Challenge 狀態
kubectl get challenges -n k8sdemo
kubectl describe certificate chibi-moe-tls -n k8sdemo
```

### 7. 恢復 Wafer-BI 自動同步

```bash
$patch = @{
  spec = @{
    syncPolicy = @{
      automated = @{
        prune = $true
        selfHeal = $true
      }
    }
  }
} | ConvertTo-Json -Compress -Depth 5

kubectl patch application wafer-bi-platform -n argocd --type merge -p $patch
```

---

## 驗證

```bash
# 確認憑證正常
kubectl get certificate chibi-moe-tls -n k8sdemo
# 期待：READY=True

# 外部測試 HTTPS
curl -I https://chibi.carrot-atelier.online/healthz
# 期待：HTTP/2 200

# WebSocket 握手測試
wscat -c wss://chibi.carrot-atelier.online/
# 期待：連線成功，無 TLS 錯誤
```

---

## Ingress 設定（`k8s/base/ingress.yaml`）

```yaml
annotations:
  cert-manager.io/cluster-issuer: "letsencrypt-prod"    # 指定簽發者
  nginx.ingress.kubernetes.io/ssl-redirect: "true"       # 強制 HTTPS
  nginx.ingress.kubernetes.io/enable-websocket: "true"   # 啟用 WebSocket
  nginx.ingress.kubernetes.io/proxy-http-version: "1.1"  # WebSocket 需要 HTTP/1.1
  nginx.ingress.kubernetes.io/proxy-read-timeout: "600"  # 長連線 timeout
  nginx.ingress.kubernetes.io/proxy-send-timeout: "600"
  nginx.ingress.kubernetes.io/proxy-connect-timeout: "600"
spec:
  tls:
    - hosts:
        - chibi.carrot-atelier.online
      secretName: chibi-moe-tls   # cert-manager 自動管理此 Secret
```

---

## OCI IP 資源管理注意事項

> **[!WARNING]**  
> OCI 的 OKE 節點有 IP 配額限制（VCN 子網路內的 Pod IP 數量有限）。  
> 若遇到 `unable to allocate IP address` 錯誤，需暫時縮減非必要服務的副本數。

### 高 IP 消耗服務（應優先縮小）

| 服務 | 特性 | 建議副本數 |
|------|------|------------|
| `ollama` | 2 個容器（2/2），消耗 2 個 IP | 非必要時縮到 0 |
| `jaeger` | 監控工具，非業務關鍵 | 非必要時縮到 0 |
| `otel-collector` | 監控工具，非業務關鍵 | 非必要時縮到 0 |
| `ai-mcp-service` | 實驗性服務 | 非必要時縮到 0 |

### 永遠保持 Running 的關鍵服務

| 服務 | 原因 |
|------|------|
| `ingress-nginx-controller` | 所有 HTTP/HTTPS/WebSocket 流量入口 |
| `cert-manager` (3 pods) | TLS 憑證簽發與續期 |
| `chibi-moe-server` | chibi-moe 主服務 |

---

*文件由 Antigravity 於 2026-06-13 自動生成並記錄*
