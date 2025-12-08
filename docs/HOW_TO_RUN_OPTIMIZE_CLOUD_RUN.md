# Cloud Run最適化スクリプトの実行方法

## 📍 実行場所

`scripts/optimize-cloud-run.sh` は以下のいずれかの場所で実行できます：

### 1. **Google Cloud Shell（推奨）** ⭐

最も簡単で確実な方法です。

#### 手順：

1. **Google Cloud Consoleにアクセス**
   - https://console.cloud.google.com/ にアクセス
   - プロジェクト `circles-202510` を選択

2. **Cloud Shellを開く**
   - 右上の「Cloud Shell」アイコンをクリック
   - または、`Ctrl+Shift+` (Windows/Linux) / `Cmd+Shift+` (Mac)

3. **リポジトリをクローン（まだの場合）**
   ```bash
   git clone https://github.com/dev-mmiy/circles0.git
   cd circles0
   ```

4. **スクリプトを実行**
   ```bash
   chmod +x scripts/optimize-cloud-run.sh
   ./scripts/optimize-cloud-run.sh
   ```

**メリット**:
- ✅ gcloud CLIが既にインストール済み
- ✅ 認証が自動的に設定されている
- ✅ ブラウザから直接アクセス可能
- ✅ 追加のインストール不要

---

### 2. **ローカルマシン**

ローカルマシンで実行する場合、以下の前提条件が必要です。

#### 前提条件：

1. **gcloud CLIのインストール**
   ```bash
   # macOS
   brew install google-cloud-sdk
   
   # Linux (Debian/Ubuntu)
   curl https://sdk.cloud.google.com | bash
   exec -l $SHELL
   
   # Windows
   # https://cloud.google.com/sdk/docs/install からインストーラーをダウンロード
   ```

2. **認証の設定**
   ```bash
   gcloud auth login
   gcloud config set project circles-202510
   ```

3. **実行**
   ```bash
   cd /path/to/circles0
   chmod +x scripts/optimize-cloud-run.sh
   ./scripts/optimize-cloud-run.sh
   ```

---

### 3. **GitHub Actions（CI/CDパイプライン）**

自動化したい場合は、GitHub Actionsワークフローに追加できます。

#### 実装例：

`.github/workflows/optimize-cloud-run.yml` を作成：

```yaml
name: Optimize Cloud Run

on:
  workflow_dispatch:  # 手動実行
  schedule:
    - cron: '0 0 * * 0'  # 毎週日曜日の深夜0時（オプション）

jobs:
  optimize:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Authenticate to Google Cloud
      uses: google-github-actions/auth@v2
      with:
        credentials_json: ${{ secrets.GCP_SA_KEY }}

    - name: Set up Google Cloud CLI
      uses: google-github-actions/setup-gcloud@v2
      with:
        project_id: circles-202510

    - name: Run optimization script
      run: |
        chmod +x scripts/optimize-cloud-run.sh
        ./scripts/optimize-cloud-run.sh
```

---

## 🔍 実行前の確認

スクリプトを実行する前に、以下を確認してください：

### 1. gcloud CLIの確認
```bash
gcloud --version
# 出力例: Google Cloud SDK 450.0.0
```

### 2. 認証状態の確認
```bash
gcloud auth list
# アクティブなアカウントが表示されることを確認
```

### 3. プロジェクトの確認
```bash
gcloud config get-value project
# 出力: circles-202510
```

### 4. 権限の確認
以下の権限が必要です：
- `run.services.update` (Cloud Run Admin)
- `run.services.get` (Cloud Run Viewer)

権限がない場合は、プロジェクトオーナーまたは管理者に依頼してください。

---

## ⚠️ 注意事項

### コストへの影響

このスクリプトを実行すると、**最小インスタンス数が1に設定**されます。

**コスト見積もり**:
- Backend (2 CPU, 2Gi RAM): 約 $15-20/月
- Frontend (1 CPU, 1Gi RAM): 約 $10-15/月
- **合計**: 約 $25-35/月

**コストを削減したい場合**:
- 最小インスタンス数を0に戻す（コールドスタートが発生する可能性あり）
- CPU/メモリを削減（パフォーマンスに影響する可能性あり）

### 実行時間

スクリプトの実行には約1-2分かかります。各サービスの更新が順次実行されます。

---

## 📋 実行後の確認

スクリプト実行後、以下を確認してください：

### 1. サービス設定の確認
```bash
# Backend設定を確認
gcloud run services describe disease-community-api \
  --region=asia-northeast1 \
  --format="table(spec.template.spec.containers[0].resources.limits,spec.template.spec.containerConcurrency,spec.template.spec.timeoutSeconds)"

# Frontend設定を確認
gcloud run services describe disease-community-frontend \
  --region=asia-northeast1 \
  --format="table(spec.template.spec.containers[0].resources.limits,spec.template.spec.timeoutSeconds)"
```

### 2. パフォーマンスの監視

- Cloud Consoleの「Cloud Run」→「メトリクス」で確認
- レスポンス時間の改善を確認
- タイムアウトエラーの減少を確認

---

## 🔄 設定を元に戻す場合

最小インスタンス数を0に戻す場合：

```bash
# Backend
gcloud run services update disease-community-api \
  --region=asia-northeast1 \
  --min-instances=0

# Frontend
gcloud run services update disease-community-frontend \
  --region=asia-northeast1 \
  --min-instances=0
```

---

## 📞 トラブルシューティング

### エラー: "Permission denied"
→ 権限が不足しています。プロジェクトオーナーに依頼してください。

### エラー: "Service not found"
→ サービス名が正しいか確認してください。プロジェクトIDも確認してください。

### エラー: "gcloud: command not found"
→ gcloud CLIがインストールされていません。上記のインストール手順を参照してください。

---

## 🎯 推奨実行タイミング

- ✅ **デプロイ後**: 新しいコードをデプロイした後
- ✅ **パフォーマンス問題発生時**: タイムアウトエラーが頻発する場合
- ✅ **トラフィック増加時**: アクセス数が増加する前に
- ✅ **定期的な最適化**: 月1回程度の見直し

---

## 📚 関連ドキュメント

- [Cloud Run パフォーマンス最適化ガイド](docs/PERFORMANCE_IMPROVEMENT_PROPOSALS.md)
- [Cloud Run ドキュメント](https://cloud.google.com/run/docs/tips/performance)

