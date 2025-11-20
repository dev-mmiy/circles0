# Web Push通知の設定ガイド

このドキュメントでは、Web Push APIを使用したブラウザ通知機能の設定方法を説明します。

## 概要

Web Push APIを使用することで、ユーザーがブラウザを閉じていても、サーバーからプッシュ通知を送信できます。この機能は以下のコンポーネントで構成されています：

1. **Service Worker** (`frontend/public/sw.js`) - ブラウザ側で通知を受信・表示
2. **Push Subscription API** (`backend/app/api/push_subscriptions.py`) - サブスクリプション管理
3. **Push Service** (`backend/app/services/push_service.py`) - プッシュ通知送信
4. **Notification Service統合** - 通知作成時に自動的にプッシュ通知を送信

## 前提条件

- Python 3.11以上
- Node.js 18以上
- HTTPS環境（本番環境）またはlocalhost（開発環境）

## セットアップ手順

### 1. VAPIDキーの生成

VAPID（Voluntary Application Server Identification）キーは、プッシュ通知を送信するために必要な認証情報です。

```bash
# バックエンドディレクトリに移動
cd backend

# VAPIDキー生成スクリプトを実行
python scripts/generate_vapid_keys.py
```

出力例：
```
VAPID_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
...
-----END PRIVATE KEY-----"
VAPID_PUBLIC_KEY="BK..."
VAPID_EMAIL="mailto:admin@yourdomain.com"
```

### 2. 環境変数の設定

生成されたVAPIDキーを環境変数に設定します。

**開発環境** (`backend/.env`):
```env
VAPID_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
...
-----END PRIVATE KEY-----"
VAPID_PUBLIC_KEY="BK..."
VAPID_EMAIL="mailto:admin@yourdomain.com"
```

**本番環境** (Cloud Run環境変数):
- Google Cloud Consoleで環境変数を設定
- または、`gcloud run services update`コマンドで設定

### 3. 依存関係のインストール

バックエンドの依存関係をインストールします：

```bash
cd backend
pip install -r requirements.txt
```

必要なパッケージ：
- `pywebpush==1.14.0` - Web Push通知送信
- `py-vapid==1.9.0` - VAPIDキー管理
- `cryptography` - 暗号化処理（既にインストール済み）

### 4. データベースマイグレーション

プッシュサブスクリプション用のテーブルを作成します：

```bash
cd backend
alembic upgrade head
```

### 5. フロントエンドの設定

Service Workerは自動的に登録されます。通知アイコンとバッジ画像を追加してください：

- `/public/icon-192x192.png` - 通知アイコン（192x192px）
- `/public/icon-96x96.png` - 通知バッジ（96x96px）

## 使用方法

### ユーザー側

1. **通知許可のリクエスト**
   - ユーザーがログインすると、自動的に通知許可がリクエストされます
   - ユーザーが許可すると、プッシュサブスクリプションが自動的に登録されます

2. **通知の受信**
   - 新しい通知が作成されると、ブラウザにプッシュ通知が表示されます
   - 通知をクリックすると、関連するページに遷移します

### 開発者側

#### プッシュ通知の送信

通知サービスが自動的にプッシュ通知を送信します。手動で送信する場合：

```python
from app.services.push_service import PushService
from app.database import SessionLocal

db = SessionLocal()
push_service = PushService(
    vapid_private_key=os.getenv("VAPID_PRIVATE_KEY"),
    vapid_public_key=os.getenv("VAPID_PUBLIC_KEY"),
    vapid_email=os.getenv("VAPID_EMAIL"),
)

# ユーザーに通知を送信
push_service.send_notification_to_user(
    db=db,
    user_id=user_id,
    title="通知タイトル",
    body="通知本文",
    url="/notifications",  # クリック時の遷移先
    tag="notification-tag",  # 通知のタグ（同じタグの通知は置き換えられる）
)
```

## APIエンドポイント

### GET `/api/v1/push-subscriptions/public-key`
VAPID公開キーを取得します（認証不要）

**レスポンス:**
```json
{
  "publicKey": "BK..."
}
```

### POST `/api/v1/push-subscriptions/register`
プッシュサブスクリプションを登録します（認証必要）

**リクエスト:**
```json
{
  "endpoint": "https://fcm.googleapis.com/...",
  "p256dh": "base64-encoded-public-key",
  "auth": "base64-encoded-auth-secret",
  "user_agent": "Mozilla/5.0...",
  "device_info": {
    "platform": "Win32",
    "language": "ja"
  }
}
```

### DELETE `/api/v1/push-subscriptions/unregister?endpoint=...`
プッシュサブスクリプションを削除します（認証必要）

## トラブルシューティング

### 通知が表示されない

1. **ブラウザの通知許可を確認**
   - ブラウザの設定で通知が許可されているか確認
   - `chrome://settings/content/notifications` (Chrome)

2. **Service Workerの登録を確認**
   - ブラウザの開発者ツール > Application > Service Workers で確認
   - Service Workerが登録されているか、エラーがないか確認

3. **VAPIDキーの確認**
   - 環境変数が正しく設定されているか確認
   - 公開キーと秘密キーが正しく生成されているか確認

4. **HTTPSの確認**
   - 本番環境ではHTTPSが必要です
   - 開発環境ではlocalhostのみサポート

### 通知が重複する

- Service WorkerとNotificationContextの両方で通知を表示している可能性があります
- Service Workerの通知を優先し、NotificationContextの通知表示は無効化してください

### サブスクリプションの登録に失敗する

1. **認証トークンの確認**
   - ユーザーがログインしているか確認
   - トークンが有効か確認

2. **APIエンドポイントの確認**
   - `NEXT_PUBLIC_API_URL`が正しく設定されているか確認
   - CORS設定が正しいか確認

## セキュリティ考慮事項

1. **VAPID秘密キーの保護**
   - 秘密キーは絶対に公開しないでください
   - 環境変数やシークレット管理サービスで管理してください

2. **HTTPSの使用**
   - 本番環境では必ずHTTPSを使用してください
   - Service WorkerはHTTPS環境でのみ動作します（localhostを除く）

3. **通知のスパム防止**
   - 通知サービスで既に24時間ウィンドウの重複防止が実装されています
   - 必要に応じて、追加のレート制限を実装してください

## 参考資料

- [Web Push API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [VAPID Protocol](https://tools.ietf.org/html/rfc8292)
- [pywebpush Documentation](https://github.com/web-push-libs/pywebpush)



