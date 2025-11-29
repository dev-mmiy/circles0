# GitHub Actions CI/CD Pipelines

このディレクトリには、整理されたCI/CDパイプラインが含まれています。

## パイプライン構成

### 1. `ci.yml` - メインCI/CDパイプライン（デプロイ用）
**対象**: `main`, `develop`ブランチへのpush、手動実行（workflow_dispatch）

**実行内容**:
1. **Code Quality Checks** - コード品質チェック（isort, flake8, ESLint, Prettier）
2. **Backend Tests** - バックエンドテスト（Docker Compose使用）
3. **Frontend Tests** - フロントエンドテスト（Docker Compose使用）
4. **Build Docker Images** - Dockerイメージビルド（GCRにプッシュ）
5. **Deploy to Cloud Run** - Cloud Runデプロイ（main/developブランチのみ）
6. **Health Check** - デプロイ後のヘルスチェック

**注意**: PRでは実行されません。PRチェックは`pr-check.yml`を使用します。

### 2. `pr-check.yml` - プルリクエストチェック
**対象**: `main`, `develop`ブランチへのプルリクエスト

**実行内容**:
1. **Backend Linting** - バックエンドリント（flake8, isort）
2. **Backend Tests** - バックエンドテスト（PostgreSQLサービス使用）
3. **Frontend Linting** - フロントエンドリント（ESLint, Prettier）
4. **TypeScript Type Check** - TypeScript型チェック
5. **Frontend Tests** - フロントエンドテスト
6. **Frontend Build** - フロントエンドビルド

**特徴**: 軽量で高速なチェック。デプロイは行いません。

### 3. `ci-light.yml` - 軽量CI/CDパイプライン（featureブランチ用）
**対象**: `feature/*`ブランチへのpush

**実行内容**:
1. **Code Quality Checks** - コード品質チェック
2. **Backend Tests** - バックエンドテスト（PostgreSQLサービス使用）
3. **Frontend Tests** - フロントエンドテスト
4. **Frontend Build** - フロントエンドビルド

**特徴**: featureブランチでの開発中の軽量チェック。デプロイは行いません。

### 4. デバッグ・テスト用ワークフロー
- `test-minimal.yml` - 最小限のCloud Runデプロイテスト（手動実行）
- `debug-cloud-run.yml` - Cloud Runサービスのデバッグ（手動実行）
- `check-cloud-run-logs.yml` - Cloud Runログの確認（手動実行）
- `debug-deployment.yml` - デプロイメントのデバッグ（手動実行）
- `test-cloud-run.yml` - Cloud Runテスト（手動実行）
- `debug-gcp-auth.yml` - GCP認証のデバッグ（手動実行）

## ワークフローの実行タイミング

### 自動実行
- **`ci.yml`**: `main`/`develop`ブランチへのpush時
- **`pr-check.yml`**: `main`/`develop`へのPR作成・更新時
- **`ci-light.yml`**: `feature/*`ブランチへのpush時

### 手動実行
- すべてのワークフローは`workflow_dispatch`で手動実行可能
- デバッグ用ワークフローは手動実行のみ

## テストスクリプト

### バックエンドテスト
```bash
# Docker Composeを使用（ci.ymlで使用）
chmod +x scripts/local-test-backend.sh
./scripts/local-test-backend.sh
```

### フロントエンドテスト
```bash
# Docker Composeを使用（ci.ymlで使用）
chmod +x scripts/local-test.sh
./scripts/local-test.sh
```

## 改善点

1. **重複の解消**
   - `ci.yml`から`pull_request`トリガーを削除（実際には使われていなかった）
   - `ci-light.yml`から`pull_request`トリガーを削除（`pr-check.yml`と重複していた）

2. **役割の明確化**
   - `ci.yml`: デプロイ用（main/developブランチのみ）
   - `pr-check.yml`: PRチェック専用
   - `ci-light.yml`: featureブランチ用の軽量チェック

3. **パフォーマンスの向上**
   - 軽量パイプラインの活用
   - キャッシュの活用
   - 不要なワークフローの実行を防止

## 使用方法

### メインパイプラインの実行（デプロイ）
```bash
# mainブランチにプッシュ（自動デプロイ）
git push origin main

# developブランチにプッシュ（自動デプロイ）
git push origin develop

# 手動実行（GitHub Actions UIから）
```

### プルリクエストチェック
```bash
# PRを作成すると自動的にpr-check.ymlが実行される
gh pr create --base main --head feature/new-feature
```

### 軽量パイプラインの実行（featureブランチ）
```bash
# featureブランチにプッシュ（自動チェック）
git push origin feature/new-feature
```

## トラブルシューティング

### テスト失敗時
1. ログを確認
2. ローカルでテストを実行
3. 必要に応じてスクリプトを修正

### デプロイメント失敗時
1. Cloud Runのログを確認
2. 環境変数を確認
3. 必要に応じてシークレットを更新

## ファイル構成

```
.github/workflows/
├── ci.yml              # メインCI/CDパイプライン
├── ci-light.yml        # 軽量CI/CDパイプライン
├── ci-original.yml     # 元のパイプライン（バックアップ）
├── pr-check.yml        # プルリクエストチェック
└── README.md           # このファイル
```
