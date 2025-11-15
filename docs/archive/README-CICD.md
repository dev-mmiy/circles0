# CI/CD Pipeline Documentation

## 🚀 デプロイメントフロー

このプロジェクトでは、安全で段階的なデプロイメントフローを実装しています。

### 📋 デプロイメント環境

1. **Development (Dev)** - `develop`ブランチ
   - URL: https://disease-community-frontend-dev-508246122017.asia-northeast1.run.app
   - 自動デプロイ: developブランチへのプッシュ時
   - 承認: 不要

2. **Staging** - `main`ブランチ
   - URL: https://disease-community-frontend-staging-508246122017.asia-northeast1.run.app
   - 自動デプロイ: mainブランチへのプッシュ時
   - 承認: 1名のレビューが必要

3. **Production** - `main`ブランチ（手動承認）
   - URL: https://disease-community-frontend-508246122017.asia-northeast1.run.app
   - デプロイ: 手動承認が必要
   - 承認: 2名のレビューが必要

### 🔄 CI/CDパイプライン

#### Stage 1: コード品質チェック
- バックエンド: flake8, black, isort
- フロントエンド: ESLint, Prettier, TypeScript
- 全ブランチで実行

#### Stage 2: バックエンドテスト
- ユニットテスト
- カバレッジレポート
- データベーステスト

#### Stage 3: フロントエンドテスト
- ユニットテスト
- ビルドテスト
- TypeScript型チェック

#### Stage 4: 統合テスト
- エンドツーエンドテスト
- API統合テスト
- データベース統合テスト

#### Stage 5: セキュリティスキャン
- Python: safety, bandit
- Node.js: npm audit
- 依存関係の脆弱性チェック

#### Stage 6: ビルド・プッシュ
- Dockerイメージのビルド
- Google Container Registryへのプッシュ
- キャッシュの最適化

#### Stage 7-9: デプロイメント
- Dev環境: 自動デプロイ
- Staging環境: 自動デプロイ（承認必要）
- Production環境: 手動承認デプロイ

### 🛠️ ローカルテスト

#### 包括的なローカルテスト
```bash
# 全テストを実行
make test-local

# または直接スクリプトを実行
./scripts/local-test.sh
```

#### 個別テスト
```bash
# バックエンドテスト
make test-backend

# フロントエンドテスト
make test-frontend

# 統合テスト
make test-integration

# セキュリティスキャン
make security-scan
```

### 🚀 デプロイメント手順

#### 1. ローカルテスト
```bash
# 包括的なローカルテストを実行
make test-local
```

#### 2. デプロイメント前チェック
```bash
# デプロイメント前のチェックを実行
make pre-deploy
```

#### 3. デプロイメントフロー
```bash
# 完全なデプロイメントフローを実行
make deploy-flow
```

#### 4. 手動デプロイメント
```bash
# 開発環境
make deploy-dev

# 本番環境
make deploy-prod
```

### 📊 監視とヘルスチェック

#### ヘルスチェックエンドポイント
- Backend: `/health`
- Frontend: `/` (200レスポンス)

#### 監視項目
- レスポンス時間
- エラー率
- リソース使用量
- データベース接続

### 🔒 セキュリティ

#### 環境保護
- **Dev**: 承認不要
- **Staging**: 1名の承認が必要
- **Production**: 2名の承認が必要

#### セキュリティスキャン
- 依存関係の脆弱性チェック
- コード品質チェック
- セキュリティベストプラクティスの適用

### 📝 プルリクエスト

#### テンプレート
- 変更内容の説明
- テスト結果
- セキュリティチェック
- デプロイメント準備状況

#### 必須チェックリスト
- [ ] ローカルテスト通過
- [ ] コード品質チェック通過
- [ ] セキュリティスキャン通過
- [ ] ドキュメント更新
- [ ] 破壊的変更の文書化

### 🚨 トラブルシューティング

#### よくある問題
1. **ビルド失敗**: 依存関係の確認
2. **テスト失敗**: ローカル環境の確認
3. **デプロイ失敗**: 環境変数の確認
4. **ヘルスチェック失敗**: サービス起動の確認

#### ログ確認
```bash
# アプリケーションログ
make logs

# バックエンドログ
make logs-backend

# フロントエンドログ
make logs-frontend

# データベースログ
make logs-db
```

### 📚 参考資料

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Google Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Docker Documentation](https://docs.docker.com/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Next.js Documentation](https://nextjs.org/docs)
