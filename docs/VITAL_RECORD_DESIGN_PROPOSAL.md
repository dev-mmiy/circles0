# バイタル記録のテーブル設計提案

## 要件
1. 投稿、日々の記録、食べ物記録は別の実装にする
2. どれもタイムラインで見えるようにする
3. それぞれのバイタル計測ごとに別のフォーマットをサポート
4. 将来チャートなどをサポートすることを考慮
5. それぞれのバイタルごとに記録をできるようにテーブルを分けることも検討

## 設計オプション

### オプション1: バイタルごとにテーブルを分ける（推奨・修正版）

**構造:**
```
blood_pressure_records (血圧)
├── id
├── user_id (FK to users)
├── recorded_at (計測日時)
├── systolic (収縮期血圧)
├── diastolic (拡張期血圧)
├── visibility (public/followers_only/private)
├── notes (メモ)
└── created_at, updated_at

heart_rate_records (心拍数)
├── id
├── user_id (FK to users)
├── recorded_at (計測日時)
├── bpm (心拍数)
├── visibility (public/followers_only/private)
├── notes (メモ)
└── created_at, updated_at

temperature_records (体温)
├── id
├── user_id (FK to users)
├── recorded_at (計測日時)
├── value (体温値)
├── unit (celsius/fahrenheit)
├── visibility (public/followers_only/private)
├── notes (メモ)
└── created_at, updated_at

weight_records (体重)
├── id
├── user_id (FK to users)
├── recorded_at (計測日時)
├── value (体重値)
├── unit (kg/lb)
├── visibility (public/followers_only/private)
├── notes (メモ)
└── created_at, updated_at

body_fat_records (体脂肪率)
├── id
├── user_id (FK to users)
├── recorded_at (計測日時)
├── percentage (体脂肪率)
├── visibility (public/followers_only/private)
├── notes (メモ)
└── created_at, updated_at

blood_glucose_records (血糖値)
├── id
├── user_id (FK to users)
├── recorded_at (計測日時)
├── value (血糖値)
├── timing (fasting/postprandial)
├── visibility (public/followers_only/private)
├── notes (メモ)
└── created_at, updated_at

spo2_records (SpO2)
├── id
├── user_id (FK to users)
├── recorded_at (計測日時)
├── percentage (SpO2値)
├── visibility (public/followers_only/private)
├── notes (メモ)
└── created_at, updated_at
```

**メリット:**
- ✅ 各バイタルに特化したスキーマ（型安全性、バリデーション）
- ✅ クエリが簡単（特定のバイタルだけ取得）
- ✅ チャート化しやすい（時系列データが明確）
- ✅ 将来の拡張が容易（新しいバイタル追加が簡単）
- ✅ インデックス最適化が容易
- ✅ **各バイタルを独立して記録可能（ユーザーが好きなタイミングで記録できる）**
- ✅ **セッション概念が不要（シンプルな設計）**

**デメリット:**
- ❌ テーブル数が増える（管理が複雑になる可能性）
- ❌ タイムライン統合時に複数テーブルから取得が必要

**実装例:**
```python
# 血圧を記録
bp_record = BloodPressureRecord(
    user_id=user_id,
    recorded_at=now,
    systolic=120,
    diastolic=80,
    visibility='public',
    notes='朝の測定'
)
db.add(bp_record)
db.commit()

# 別のタイミングで心拍数を記録
hr_record = HeartRateRecord(
    user_id=user_id,
    recorded_at=later,
    bpm=72,
    visibility='public',
    notes='運動後'
)
db.add(hr_record)
db.commit()
```

---

### オプション2: 統合テーブル + JSONB

**構造:**
```
vital_records
├── id
├── user_id
├── recorded_at
├── vital_type (blood_pressure, heart_rate, temperature, etc.)
├── measurement_data (JSONB) - 各タイプごとのデータ
├── visibility
├── notes
└── created_at, updated_at
```

**メリット:**
- ✅ テーブル数が少ない
- ✅ 複数バイタルを同時に記録しやすい（配列で保存）

**デメリット:**
- ❌ JSONBのクエリが複雑
- ❌ 型安全性が低い
- ❌ チャート化が難しい（JSONBの集計）
- ❌ インデックス最適化が困難

---

### オプション3: ハイブリッド（基本テーブル + 詳細テーブル）

**構造:**
```
vital_records (基本情報)
├── id
├── user_id
├── recorded_at
├── visibility
├── notes
└── created_at, updated_at

vital_measurements (測定値)
├── id
├── vital_record_id (FK)
├── measurement_type (blood_pressure, heart_rate, etc.)
├── value_json (JSONB) - タイプごとのデータ
└── created_at
```

**メリット:**
- ✅ 基本情報と測定値を分離
- ✅ 複数バイタルを1セッションで記録可能

**デメリット:**
- ❌ JSONBの問題（オプション2と同様）
- ❌ 型安全性が低い

---

## 推奨: オプション1（バイタルごとにテーブルを分ける）

### 理由
1. **型安全性**: 各バイタルに特化したスキーマで、バリデーションが容易
2. **パフォーマンス**: 特定のバイタルだけ取得する場合、JOIN不要
3. **チャート化**: 時系列データが明確で、集計クエリが簡単
4. **拡張性**: 新しいバイタルを追加する際、既存テーブルに影響しない
5. **インデックス最適化**: 各テーブルに最適なインデックスを設定可能

### 実装方針

1. **各バイタル専用テーブル（独立）**
   - 血圧、心拍数、体温、体重、体脂肪率、血糖値、SpO2
   - 各テーブルは独立しており、`user_id`と`recorded_at`で管理
   - 各テーブルに`visibility`フィールドを持ち、タイムライン表示に対応

2. **タイムライン統合**
   - 各バイタルテーブルから`visibility`が`public`または`followers_only`の記録を取得
   - `recorded_at`でソートして統合タイムラインを構築
   - UNION ALLまたは個別クエリで取得後、フロントエンドで統合

---

## タイムライン統合設計

### 統合ビュー/API

**オプションA: 統合エンドポイント**
```
GET /api/v1/timeline
- posts (投稿)
- blood_pressure_records (血圧記録)
- heart_rate_records (心拍数記録)
- temperature_records (体温記録)
- weight_records (体重記録)
- body_fat_records (体脂肪率記録)
- blood_glucose_records (血糖値記録)
- spo2_records (SpO2記録)
- meal_records (食事記録)
```

各バイタル記録は独立したエンティティとして返される。

**オプションB: 個別エンドポイント + フロントエンドで統合**
```
GET /api/v1/posts
GET /api/v1/vital-records
GET /api/v1/meal-records
```

**推奨: オプションA（統合エンドポイント）**
- タイムライン表示が1リクエストで完了
- ソートが統一される（created_at順）
- パフォーマンスが良い

---

## マイグレーション戦略

1. 既存の`vital_records`テーブルからデータを移行
2. 新しいテーブル構造を作成
3. データ移行スクリプトを実行
4. 旧テーブルを削除（または非推奨として残す）

---

## 次のステップ

1. ✅ 設計案の承認
2. マイグレーションファイルの作成
3. モデルとスキーマの実装
4. APIエンドポイントの実装
5. フロントエンドの更新

