# GitHub Actions CI/CD Pipelines

このディレクトリには、リファクタリングされたCI/CDパイプラインが含まれています。

## パイプライン構成

### 1. `ci.yml` - メインCI/CDパイプライン
**対象ブランチ**: `main`, `develop`, `feature/*`

**ステージ**:
1. **Code Quality Checks** - コード品質チェック
2. **Backend Tests** - バックエンドテスト（新しいスクリプト使用）
3. **Frontend Tests** - フロントエンドテスト
4. **Integration Tests** - 統合テスト
5. **Full Tests** - フルテスト（新しいスクリプト使用）
6. **Build Docker Images** - Dockerイメージビルド
7. **Deploy to Cloud Run** - Cloud Runデプロイ
8. **Post-Deployment Tests** - デプロイ後テスト
9. **Notify** - 通知

### 2. `ci-light.yml` - 軽量CI/CDパイプライン
**対象ブランチ**: `feature/*`, `pull_request`

**ステージ**:
1. **Code Quality Checks** - コード品質チェック
2. **Backend Tests** - バックエンドテスト
3. **Frontend Tests** - フロントエンドテスト
4. **Integration Tests** - 統合テスト
5. **Notify** - 通知

### 3. `pr-check.yml` - プルリクエストチェック
**対象**: プルリクエスト

軽量なチェックを実行します。

## 新しいテストスクリプトの使用

### バックエンドテスト
```bash
# 新しいスクリプトを使用
chmod +x scripts/local-test-backend.sh
./scripts/local-test-backend.sh
```

### フルテスト
```bash
# 新しいスクリプトを使用
chmod +x scripts/local-test-full.sh
./scripts/local-test-full.sh
```

## 改善点

1. **新しいテストスクリプトの統合**
   - `scripts/local-test-backend.sh`
   - `scripts/local-test-full.sh`

2. **エラーハンドリングの改善**
   - テスト失敗時も継続実行
   - 適切な警告メッセージ

3. **パフォーマンスの向上**
   - 軽量パイプラインの追加
   - キャッシュの活用

4. **デプロイメントの改善**
   - デプロイ後テストの追加
   - 通知機能の強化

## 使用方法

### メインパイプラインの実行
```bash
# mainブランチにプッシュ
git push origin main

# developブランチにプッシュ
git push origin develop
```

### 軽量パイプラインの実行
```bash
# featureブランチにプッシュ
git push origin feature/new-feature

# プルリクエスト作成
gh pr create
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
