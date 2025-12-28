# SSE接続エラー分析

## 🔍 エラーの種類と原因

### 1. `ERR_NETWORK_IO_SUSPENDED 200 (OK)`

**エラー内容**:
```
GET https://api.lifry.com/api/v1/notifications/stream?token=...
net::ERR_NETWORK_IO_SUSPENDED 200 (OK)
```

**原因**:
- ブラウザがページをバックグラウンドにした時
- モバイルデバイスで画面がロックされた時
- ネットワーク接続が一時的に中断された時
- ブラウザの省電力モードが有効な時

**特徴**:
- HTTPステータス200が返っている（サーバー側は正常）
- ブラウザが接続を中断している
- SSEストリーム接続でよく発生する

**対処**:
- これは正常な動作なので、エラーとして扱わない
- ページがフォアグラウンドに戻った時に自動的に再接続される
- エラーログを抑制する

---

### 2. `ERR_NAME_NOT_RESOLVED`

**エラー内容**:
```
GET https://api.lifry.com/api/v1/messages/conversations?skip=0&limit=20
net::ERR_NAME_NOT_RESOLVED
```

**原因**:
- DNS解決が失敗している
- 一時的なDNS問題
- ブラウザのDNSキャッシュの問題
- ネットワーク設定の問題

**確認結果**:
- `nslookup api.lifry.com` では解決できている
- `ghs.googlehosted.com` に正しくマッピングされている
- これは一時的な問題の可能性が高い

**対処**:
- DNS解決エラー時のリトライロジックを改善
- エラーハンドリングを追加
- ユーザーに分かりやすいエラーメッセージを表示

---

## 🛠️ 改善提案

### 1. SSE接続のエラーハンドリング改善

`ERR_NETWORK_IO_SUSPENDED`は正常な動作なので、エラーとして扱わないようにする。

### 2. DNS解決エラーのリトライ

`ERR_NAME_NOT_RESOLVED`が発生した場合、自動的にリトライする。

### 3. ページの可視性APIの活用

ページがバックグラウンドにある時はSSE接続を一時停止し、フォアグラウンドに戻った時に再接続する。

