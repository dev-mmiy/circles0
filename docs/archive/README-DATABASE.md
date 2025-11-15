# データベース管理ガイド

## 📋 概要

Disease Community Platformのデータベース管理について説明します。

## 🗄️ データベース構成

### 環境別データベース
- **開発環境**: `circles_db_dev`
- **本番環境**: `circles_db_prod`
- **テスト環境**: `circles_db_test`

### テーブル構成
- **users**: ユーザー情報
- **diseases**: 疾患情報
- **user_diseases**: ユーザーと疾患の関連
- **posts**: コミュニティ投稿

## 🚀 セットアップ

### 1. データベース作成

```bash
# 全環境のデータベースを作成
make db-create

# 特定の環境のみ作成
make db-create-dev    # 開発環境
make db-create-prod   # 本番環境
make db-create-test   # テスト環境
```

### 2. マイグレーション実行

```bash
# 開発環境のマイグレーション
make db-migrate

# 本番環境のマイグレーション
make db-migrate-prod

# テスト環境のマイグレーション
make db-migrate-test
```

## 🔄 マイグレーション管理

### 新しいマイグレーション作成

```bash
# 対話的にマイグレーションを作成
make db-revision

# 直接スクリプトを実行
./scripts/migrate.sh dev revision "Add user profile table"
```

### マイグレーション履歴確認

```bash
# 履歴表示
make db-history

# 現在の状態確認
make db-current
```

### マイグレーション実行

```bash
# 最新まで適用
./scripts/migrate.sh dev upgrade

# 1つ前のバージョンに戻す
./scripts/migrate.sh dev downgrade
```

## 🛠️ 手動操作

### データベース作成スクリプト

```bash
# 使用方法
./scripts/create_databases.sh [dev|prod|test|all]

# 例
./scripts/create_databases.sh dev     # 開発環境のみ
./scripts/create_databases.sh all     # 全環境
```

### マイグレーションスクリプト

```bash
# 使用方法
./scripts/migrate.sh <environment> <action> [message]

# 例
./scripts/migrate.sh dev upgrade
./scripts/migrate.sh prod revision "Add new feature"
./scripts/migrate.sh test history
```

## 🔧 環境変数

### データベース接続設定

```bash
# 開発環境
export DATABASE_URL="postgresql://circles_dev:circles_dev_password@localhost:5432/circles_db_dev"

# 本番環境
export DATABASE_URL="postgresql://circles_prod:circles_prod_password@localhost:5432/circles_db_prod"

# テスト環境
export DATABASE_URL="postgresql://circles_test:circles_test_password@localhost:5432/circles_db_test"
```

### その他の設定

```bash
export ENVIRONMENT="development"  # development, production, test
export DEBUG="true"              # true, false
export LOG_LEVEL="INFO"          # DEBUG, INFO, WARNING, ERROR
```

## 📊 データベース設計

### ユーザーテーブル (users)
- `id`: 主キー
- `username`: ユーザー名（ユニーク）
- `email`: メールアドレス（ユニーク）
- `full_name`: フルネーム
- `is_active`: アクティブフラグ
- `created_at`: 作成日時
- `updated_at`: 更新日時

### 疾患テーブル (diseases)
- `id`: 主キー
- `name`: 疾患名（ユニーク）
- `description`: 説明
- `category`: カテゴリ
- `is_active`: アクティブフラグ
- `created_at`: 作成日時
- `updated_at`: 更新日時

### ユーザー疾患関連テーブル (user_diseases)
- `id`: 主キー
- `user_id`: ユーザーID（外部キー）
- `disease_id`: 疾患ID（外部キー）
- `diagnosis_date`: 診断日
- `severity`: 重症度
- `notes`: メモ
- `created_at`: 作成日時
- `updated_at`: 更新日時

### 投稿テーブル (posts)
- `id`: 主キー
- `title`: タイトル
- `content`: 内容
- `author_id`: 作成者ID（外部キー）
- `disease_id`: 疾患ID（外部キー、オプション）
- `is_published`: 公開フラグ
- `created_at`: 作成日時
- `updated_at`: 更新日時

## 🔍 トラブルシューティング

### よくある問題

1. **データベース接続エラー**
   ```bash
   # データベースが起動しているか確認
   docker compose ps
   
   # データベースを再起動
   docker compose restart postgres
   ```

2. **マイグレーションエラー**
   ```bash
   # 現在の状態を確認
   make db-current
   
   # 履歴を確認
   make db-history
   ```

3. **権限エラー**
   ```bash
   # ファイル権限を確認
   ls -la scripts/
   
   # 実行権限を付与
   chmod +x scripts/*.sh
   ```

## 📚 参考資料

- [Alembic Documentation](https://alembic.sqlalchemy.org/)
- [SQLAlchemy Documentation](https://docs.sqlalchemy.org/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)


