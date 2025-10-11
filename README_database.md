# 疾患コミュニティサイト データベーススキーマ

## 概要
疾患を持つユーザー同士のコミュニティサイト用のPostgreSQLデータベーススキーマです。

## テーブル構成

### 1. ユーザー関連
- **users**: ユーザー基本情報
- **user_diseases**: ユーザーと疾患の関連

### 2. 疾患関連
- **diseases**: 疾患マスターデータ
- **disease_translations**: 疾患名の多言語翻訳
- **disease_categories**: 疾患カテゴリマスター
- **disease_category_translations**: カテゴリ名の多言語翻訳
- **disease_category_mappings**: 疾患とカテゴリの関連（多対多）
- **disease_statuses**: 疾患状態マスター
- **disease_status_translations**: 状態名の多言語翻訳

## 主要な設計思想

### 1. ユーザー識別
- **内部ID**: UUID（システム内部用）
- **会員ID**: 12桁数字（ユーザー表示用）
- **IDP ID**: 認証プロバイダー連携用（将来の切り替え対応）

### 2. 多言語対応
- 疾患名、カテゴリ名、状態名を別テーブルで翻訳管理
- 言語コード: 'ja', 'en', 'ko', 'zh' など
- 将来の言語追加に対応

### 3. プライバシー配慮
- ユーザーの本名は非公開
- ニックネームでコミュニティ参加
- 疾患情報の公開設定可能

### 4. データ整合性
- 外部キー制約による整合性保証
- ユニーク制約による重複防止
- トリガーによる自動更新

## セットアップ手順

### 1. データベース作成
```sql
CREATE DATABASE disease_community;
```

### 2. スキーマ実行
```bash
psql -d disease_community -f database_schema.sql
```

### 3. 接続確認
```sql
\dt  -- テーブル一覧表示
```

## 主要クエリ例

### ユーザーの疾患情報取得（多言語対応）
```sql
SELECT 
    ud.id,
    d.name as disease_name_en,
    dt.translated_name as disease_name_local,
    ds.status_code,
    dst.translated_name as status_name_local,
    ud.diagnosis_date,
    ud.severity_level
FROM user_diseases ud
JOIN diseases d ON ud.disease_id = d.id
JOIN disease_translations dt ON d.id = dt.disease_id AND dt.language_code = 'ja'
LEFT JOIN disease_statuses ds ON ud.status_id = ds.id
LEFT JOIN disease_status_translations dst ON ds.id = dst.status_id AND dst.language_code = 'ja'
WHERE ud.user_id = ? AND ud.is_public = true;
```

### 疾患別ユーザー検索
```sql
SELECT 
    u.nickname,
    u.bio,
    dt.translated_name as disease_name,
    ud.diagnosis_date,
    ud.severity_level
FROM users u
JOIN user_diseases ud ON u.id = ud.user_id
JOIN diseases d ON ud.disease_id = d.id
JOIN disease_translations dt ON d.id = dt.disease_id AND dt.language_code = 'ja'
WHERE ud.disease_id = ? AND ud.is_searchable = true;
```

## 今後の拡張予定

### 1. コミュニティ機能
- **topics**: 話題テーブル
- **replies**: 返信テーブル
- **reactions**: リアクションテーブル
- **favorites**: お気に入りテーブル

### 2. 通知機能
- **notifications**: 通知テーブル
- **notification_preferences**: 通知設定テーブル

### 3. 管理機能
- **admin_users**: 管理者テーブル
- **audit_logs**: 監査ログテーブル

## 注意事項

1. **会員ID生成**: 12桁の会員IDは重複チェックが必要
2. **言語設定**: ユーザーの言語設定に基づいて翻訳データを取得
3. **プライバシー**: 疾患情報の公開設定を適切に管理
4. **パフォーマンス**: 多言語クエリの最適化が必要

## バックアップ・復元

### バックアップ
```bash
pg_dump disease_community > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 復元
```bash
psql -d disease_community < backup_20241201_120000.sql
```
