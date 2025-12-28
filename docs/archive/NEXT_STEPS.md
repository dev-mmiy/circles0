# 次のステップ - データモデル実装後

**日付**: 2025-11-03
**現在の状態**: データモデルとスキーマの実装完了

## ✅ 完了した作業

1. **データモデル実装** ([DATA_MODEL_IMPLEMENTATION.md](DATA_MODEL_IMPLEMENTATION.md) 参照)
   - Userモデル拡張（会員ID、本名、ニックネーム、IDP抽象化）
   - 6つの新しいDiseaseモデル実装
   - UserDiseaseモデル拡張
   - マイグレーションファイル作成

2. **Pydanticスキーマ更新**
   - [backend/app/schemas/user.py](backend/app/schemas/user.py) - nickname対応、member_id追加
   - [backend/app/schemas/disease.py](backend/app/schemas/disease.py) - 完全書き換え（9つの新スキーマ追加）
   - [backend/app/schemas/__init__.py](backend/app/schemas/__init__.py) - すべての新スキーマをエクスポート

## 📋 次にやること

### 1. マイグレーション実行（優先度：最高）

**目的**: データベースに新しいテーブルとフィールドを追加

**手順**:

```bash
# Docker環境を起動
docker compose up -d postgres

# バックエンドコンテナでマイグレーション実行
docker compose run --rm backend alembic upgrade head

# または、ローカルで実行
cd backend
source ../.venv/bin/activate  # 仮想環境がある場合
alembic upgrade head
```

**確認項目**:
- [ ] マイグレーションが成功
- [ ] 新しいテーブルが作成されたか確認
- [ ] 既存データが保持されているか確認

### 2. 既存APIの更新（優先度：高）

#### 2.1 User API更新

**ファイル**: [backend/app/api/users.py](backend/app/api/users.py)

**必要な変更**:

```python
# display_name → nickname に変更
# 例：
response = UserResponse(
    ...
    nickname=user.nickname,  # display_name から変更
    member_id=user.member_id,  # 追加
    ...
)
```

**影響を受けるエンドポイント**:
- `POST /api/v1/users/` - ユーザー作成
- `GET /api/v1/users/me` - 現在のユーザー情報取得
- `PUT /api/v1/users/me` - ユーザー情報更新
- `GET /api/v1/users/{user_id}` - ユーザー情報取得

**チェックリスト**:
- [ ] UserCreate スキーマで nickname を必須に
- [ ] ユーザー作成時に nickname の重複チェック
- [ ] ユーザー作成時に member_id を自動生成（モデルのデフォルトで対応済み）
- [ ] レスポンスに member_id を含める
- [ ] display_name への参照をすべて nickname に変更

#### 2.2 UserService更新

**ファイル**: [backend/app/services/user_service.py](backend/app/services/user_service.py)

**必要な変更**:
- display_name → nickname
- ニックネーム重複チェック関数追加
- 会員IDによるユーザー検索関数追加

### 3. マスターデータ投入（優先度：高）

**目的**: 疾患、カテゴリ、状態の初期データを投入

**スクリプト作成**: `backend/scripts/seed_master_data.py`

```python
# 必要なデータ：
# 1. Disease Statuses (ACTIVE, REMISSION, CURED, CHRONIC, UNDER_TREATMENT)
# 2. Disease Status Translations (ja, en)
# 3. Disease Categories (MENTAL_HEALTH, NEUROLOGICAL, etc.)
# 4. Disease Category Translations (ja, en)
# 5. Sample Diseases (うつ病, 不安障害, てんかん, etc.)
# 6. Disease Translations (ja, en)
# 7. Disease Category Mappings
```

**参考**: [database_schema.sql](database_schema.sql) の行322-396にサンプルデータあり

**チェックリスト**:
- [ ] スクリプト作成
- [ ] 開発環境でデータ投入テスト
- [ ] マスターデータの確認

### 4. 新しいAPIエンドポイント実装（優先度：中）

#### 4.1 疾患翻訳API

**エンドポイント**:
- `GET /api/v1/diseases/{disease_id}/translations` - 疾患の翻訳一覧
- `GET /api/v1/diseases/{disease_id}/translations/{language_code}` - 特定言語の翻訳

#### 4.2 疾患カテゴリAPI

**エンドポイント**:
- `GET /api/v1/disease-categories` - カテゴリ一覧（階層構造）
- `GET /api/v1/disease-categories/{category_id}` - カテゴリ詳細
- `GET /api/v1/disease-categories/{category_id}/diseases` - カテゴリ内の疾患一覧

#### 4.3 疾患状態API

**エンドポイント**:
- `GET /api/v1/disease-statuses` - 状態一覧
- `GET /api/v1/disease-statuses/{status_id}` - 状態詳細

#### 4.4 ユーザー疾患API拡張

**エンドポイント**:
- `POST /api/v1/users/me/diseases` - 疾患追加（詳細情報対応）
- `PUT /api/v1/users/me/diseases/{disease_id}` - 疾患情報更新
- `DELETE /api/v1/users/me/diseases/{disease_id}` - 疾患削除

**新しいフィールド対応**:
- diagnosis_doctor, diagnosis_hospital
- symptoms, limitations, medications
- is_public, is_searchable
- status_id

### 5. サービスレイヤー実装（優先度：中）

**新規ファイル**:
- `backend/app/services/disease_service.py`
- `backend/app/services/disease_category_service.py`
- `backend/app/services/disease_status_service.py`

**機能**:
- 言語に応じた翻訳データの取得
- カテゴリの階層構造の取得
- 疾患検索（カテゴリ、状態でフィルタリング）

### 6. フロントエンド更新（優先度：中）

**影響を受けるコンポーネント**:
- ユーザー登録フォーム（nickname入力追加）
- ユーザープロフィール表示（nickname表示、member_id表示）
- 疾患管理画面（詳細フィールド追加）

**新規画面**:
- 疾患カテゴリブラウザ
- 疾患検索（翻訳対応）

### 7. テスト実装（優先度：中）

#### 7.1 ユニットテスト

**新規ファイル**:
- `backend/tests/test_disease_models.py` - Diseaseモデルのテスト
- `backend/tests/test_user_model_extended.py` - User拡張フィールドのテスト

#### 7.2 統合テスト

**シナリオ**:
1. ユーザー作成（nickname、member_id確認）
2. 疾患追加（詳細情報含む）
3. 翻訳データ取得
4. カテゴリ階層構造の取得

### 8. ドキュメント更新（優先度：低）

**更新が必要なファイル**:
- API ドキュメント（Swagger/OpenAPI）
- README.md - 新機能の説明
- GETTING_STARTED.md - セットアップ手順の更新

## 🚨 重要な注意事項

### マイグレーション実行時

1. **バックアップ取得**
   ```bash
   # 本番環境では必ずバックアップを取得
   pg_dump -h <host> -U <user> <database> > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **段階的な実行**
   - 開発環境で十分にテスト
   - ステージング環境で確認
   - 本番環境へ適用

3. **ロールバック準備**
   - downgrade() 関数の動作確認
   - ロールバック手順の確認

### 既存データの互換性

1. **Userテーブル**
   - `nickname` は新規フィールドで NULL 可
   - 既存ユーザーには別途 nickname を設定する必要あり
   - マイグレーション後のデータ移行スクリプトが必要かも

2. **UserDiseaseテーブル**
   - 新フィールドはすべて NULL 可またはデフォルト値あり
   - 既存データはそのまま動作

### API変更の影響

1. **Breaking Changes**
   - UserCreate で nickname が必須に
   - UserResponse の構造変更（display_name → nickname）
   - フロントエンドの同時更新が必要

2. **後方互換性**
   - display_name フィールドは一時的に保持（将来削除予定）
   - 段階的な移行が可能

## 📊 推定作業時間

| タスク | 優先度 | 推定時間 |
|--------|--------|----------|
| マイグレーション実行・テスト | 最高 | 2-3時間 |
| 既存API更新 | 高 | 4-6時間 |
| マスターデータ投入 | 高 | 2-3時間 |
| 新APIエンドポイント実装 | 中 | 8-12時間 |
| サービスレイヤー実装 | 中 | 4-6時間 |
| フロントエンド更新 | 中 | 8-12時間 |
| テスト実装 | 中 | 4-6時間 |
| ドキュメント更新 | 低 | 2-3時間 |

**合計**: 34-51時間（約1-2週間）

## 🎯 マイルストーン

### Phase 1: データベース移行（Week 1）
- [ ] マイグレーション実行
- [ ] マスターデータ投入
- [ ] 既存API更新
- [ ] 基本動作確認

### Phase 2: 新機能実装（Week 2-3）
- [ ] 新APIエンドポイント実装
- [ ] サービスレイヤー実装
- [ ] テスト実装

### Phase 3: フロントエンド統合（Week 3-4）
- [ ] フロントエンド更新
- [ ] 統合テスト
- [ ] ドキュメント更新

## 📞 サポート

質問や問題がある場合：
- データモデル実装の詳細: [DATA_MODEL_IMPLEMENTATION.md](DATA_MODEL_IMPLEMENTATION.md)
- 元の設計仕様: [database_schema.sql](database_schema.sql)
- プロジェクト要件: [prompt.txt](prompt.txt)

---

**作成日**: 2025-11-03
**最終更新**: 2025-11-03
**ステータス**: マイグレーション実行待ち
