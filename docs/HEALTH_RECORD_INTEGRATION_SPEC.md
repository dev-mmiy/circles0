# 健康記録機能と投稿の統合設計仕様

**作成日**: 2025-12-29  
**機能名**: Health Record Integration with Posts  
**優先度**: 高

---

## 📋 概要

健康記録機能を既存の投稿システムと統合し、ユーザーが健康記録を自分専用として保存するか、コミュニティとシェアするかを選択できるようにします。

---

## 🎯 設計方針

### 基本コンセプト
- **投稿と健康記録の統合**: 健康記録も投稿の一種として扱う
- **柔軟な公開設定**: 既存の`visibility`（public, followers_only, private）を活用
- **段階的実装**: MVP版から開始し、段階的に機能を拡張

### ユーザー体験の流れ
1. ユーザーが投稿作成時に「健康記録」モードを選択
2. 健康記録の種類を選択（日記、症状、バイタル、食事など）
3. 記録内容を入力
4. **公開設定を選択**: 「自分専用（private）」または「シェアする（public/followers_only）」
5. 投稿として保存（シェアする場合）または個人記録として保存（自分専用の場合）

---

## 🗄️ データベース設計

### 1. Postモデルの拡張

既存の`Post`モデルに以下のフィールドを追加：

```python
# backend/app/models/post.py

class Post(Base):
    # ... 既存のフィールド ...
    
    # 新規追加フィールド
    post_type = Column(
        String(20),
        nullable=False,
        default="regular",
        comment="post type: 'regular' for regular posts, 'health_record' for health records"
    )
    
    health_record_type = Column(
        String(50),
        nullable=True,
        comment="health record type: 'diary', 'symptom', 'vital', 'meal', 'medication', 'exercise', etc."
    )
    
    health_record_data = Column(
        JSON,
        nullable=True,
        comment="structured health record data (JSON format)"
    )
```

### 2. 健康記録データの構造（JSON形式）

#### 2.1 日記（diary）
```json
{
  "type": "diary",
  "mood": "good" | "bad" | "neutral",
  "notes": "今日は体調が良かった",
  "tags": ["体調良好", "外出"]
}
```

#### 2.2 症状（symptom）
```json
{
  "type": "symptom",
  "symptoms": [
    {
      "name": "頭痛",
      "severity": 1-10,
      "duration": "2時間",
      "location": "前頭部"
    }
  ],
  "triggers": ["ストレス", "天候"],
  "notes": "メモ"
}
```

#### 2.3 バイタル（vital）
```json
{
  "type": "vital",
  "recorded_at": "2025-12-29T10:00:00Z",
  "measurements": {
    "blood_pressure": {
      "systolic": 120,
      "diastolic": 80,
      "unit": "mmHg"
    },
    "temperature": {
      "value": 36.5,
      "unit": "celsius"
    },
    "weight": {
      "value": 65.0,
      "unit": "kg"
    },
    "heart_rate": {
      "value": 72,
      "unit": "bpm"
    }
  },
  "notes": "メモ"
}
```

#### 2.4 食事（meal）
```json
{
  "type": "meal",
  "meal_type": "breakfast" | "lunch" | "dinner" | "snack",
  "recorded_at": "2025-12-29T08:00:00Z",
  "foods": [
    {
      "name": "ご飯",
      "amount": 150,
      "unit": "g"
    },
    {
      "name": "味噌汁",
      "amount": 200,
      "unit": "ml"
    }
  ],
  "nutrition": {
    "calories": 500,
    "protein": 20,
    "carbs": 60,
    "fat": 15
  },
  "notes": "メモ"
}
```

#### 2.5 服薬（medication）
```json
{
  "type": "medication",
  "recorded_at": "2025-12-29T09:00:00Z",
  "medications": [
    {
      "name": "アスピリン",
      "dosage": 100,
      "unit": "mg",
      "taken": true
    }
  ],
  "notes": "メモ"
}
```

#### 2.6 運動（exercise）
```json
{
  "type": "exercise",
  "recorded_at": "2025-12-29T15:00:00Z",
  "exercise_type": "walking",
  "duration": 30,
  "unit": "minutes",
  "intensity": "moderate",
  "notes": "散歩"
}
```

---

## 🎨 UI/UX設計

### 1. 投稿フォームの拡張

#### 1.1 投稿タイプの選択
```
┌─────────────────────────────────────┐
│ 投稿を作成                            │
├─────────────────────────────────────┤
│ ○ 通常の投稿                          │
│ ● 健康記録                            │
└─────────────────────────────────────┘
```

#### 1.2 健康記録タイプの選択（健康記録モード時）
```
┌─────────────────────────────────────┐
│ 健康記録の種類を選択                  │
├─────────────────────────────────────┤
│ [日記] [症状] [バイタル] [食事]       │
│ [服薬] [運動] [その他]                │
└─────────────────────────────────────┘
```

#### 1.3 公開設定の明確化
```
┌─────────────────────────────────────┐
│ 公開設定                             │
├─────────────────────────────────────┤
│ ○ シェアする（コミュニティに公開）    │
│   └─ 公開範囲: [公開] [フォロワーのみ]│
│ ● 自分専用（個人記録として保存）      │
│   └─ 他のユーザーには表示されません   │
└─────────────────────────────────────┘
```

### 2. 健康記録入力フォーム

#### 2.1 日記フォーム
```
┌─────────────────────────────────────┐
│ 日記を記録                            │
├─────────────────────────────────────┤
│ 気分: [😊 良い] [😐 普通] [😢 悪い]   │
│                                      │
│ メモ:                                │
│ [テキストエリア]                      │
│                                      │
│ タグ: #体調良好 #外出                │
└─────────────────────────────────────┘
```

#### 2.2 症状フォーム
```
┌─────────────────────────────────────┐
│ 症状を記録                            │
├─────────────────────────────────────┤
│ 症状名: [頭痛]                        │
│ 強度: [5] / 10                       │
│ 持続時間: [2時間]                     │
│ 部位: [前頭部]                        │
│                                      │
│ きっかけ:                            │
│ [ストレス] [天候] [食事]              │
│                                      │
│ メモ:                                │
│ [テキストエリア]                      │
└─────────────────────────────────────┘
```

#### 2.3 バイタルフォーム
```
┌─────────────────────────────────────┐
│ バイタルを記録                        │
├─────────────────────────────────────┤
│ 記録日時: [2025-12-29 10:00]        │
│                                      │
│ 血圧: [120] / [80] mmHg             │
│ 体温: [36.5] °C                      │
│ 体重: [65.0] kg                      │
│ 心拍数: [72] bpm                     │
│                                      │
│ メモ:                                │
│ [テキストエリア]                      │
└─────────────────────────────────────┘
```

### 3. 投稿カードでの表示

#### 3.1 健康記録の表示
```
┌─────────────────────────────────────┐
│ [健康記録アイコン] 日記               │
│ @ユーザー名 ・ 2時間前                │
├─────────────────────────────────────┤
│ 😊 気分: 良い                         │
│                                      │
│ 今日は体調が良かった。                │
│                                      │
│ #体調良好 #外出                       │
└─────────────────────────────────────┘
```

#### 3.2 自分専用記録の表示（プロフィールページなど）
```
┌─────────────────────────────────────┐
│ [🔒 自分専用] 日記                    │
│ 2025-12-29 10:00                     │
├─────────────────────────────────────┤
│ 😊 気分: 良い                         │
│                                      │
│ 今日は体調が良かった。                │
│                                      │
│ #体調良好 #外出                       │
└─────────────────────────────────────┘
```

---

## 🔧 実装詳細

### Phase 1: MVP版（基本機能）

#### バックエンド実装

1. **データベースマイグレーション**
   - `post_type`カラムの追加
   - `health_record_type`カラムの追加
   - `health_record_data`カラムの追加（JSON型）
   - インデックスの追加（`post_type`, `health_record_type`）

2. **スキーマの拡張**
   ```python
   # backend/app/schemas/post.py
   
   class PostCreate(PostBase):
       # ... 既存フィールド ...
       
       post_type: Optional[str] = Field(
           default="regular",
           pattern="^(regular|health_record)$"
       )
       
       health_record_type: Optional[str] = Field(
           default=None,
           pattern="^(diary|symptom|vital|meal|medication|exercise)$"
       )
       
       health_record_data: Optional[dict] = Field(
           default=None,
           description="Structured health record data"
       )
   ```

3. **APIエンドポイントの拡張**
   - `POST /api/v1/posts` - 既存エンドポイントを拡張（健康記録も作成可能）
   - `GET /api/v1/posts` - フィルタリングオプション追加（`post_type`, `health_record_type`）
   - `GET /api/v1/posts/health-records` - 健康記録専用エンドポイント（オプション）

4. **サービス層の拡張**
   ```python
   # backend/app/services/post_service.py
   
   class PostService:
       @staticmethod
       def create_post(
           db: Session,
           user_id: UUID,
           post_data: PostCreate,
       ) -> Post:
           # 健康記録のバリデーション
           if post_data.post_type == "health_record":
               PostService._validate_health_record(post_data)
           
           # 既存の投稿作成ロジック
           # ...
   ```

#### フロントエンド実装

1. **PostFormコンポーネントの拡張**
   - 投稿タイプ選択UI（通常の投稿 / 健康記録）
   - 健康記録タイプ選択UI
   - 健康記録入力フォーム（条件付きレンダリング）
   - 公開設定の明確化（シェアする / 自分専用）

2. **健康記録入力コンポーネント**
   - `HealthRecordDiaryForm.tsx` - 日記フォーム
   - `HealthRecordSymptomForm.tsx` - 症状フォーム
   - `HealthRecordVitalForm.tsx` - バイタルフォーム
   - `HealthRecordMealForm.tsx` - 食事フォーム
   - `HealthRecordMedicationForm.tsx` - 服薬フォーム
   - `HealthRecordExerciseForm.tsx` - 運動フォーム

3. **PostCardコンポーネントの拡張**
   - 健康記録の表示ロジック
   - 健康記録タイプに応じたアイコン表示
   - 自分専用記録の表示（🔒アイコン）

4. **翻訳ファイルの追加**
   ```json
   {
     "postForm": {
       "postType": {
         "title": "投稿タイプ",
         "regular": "通常の投稿",
         "healthRecord": "健康記録"
       },
       "healthRecord": {
         "title": "健康記録の種類",
         "diary": "日記",
         "symptom": "症状",
         "vital": "バイタル",
         "meal": "食事",
         "medication": "服薬",
         "exercise": "運動"
       },
       "visibility": {
         "share": "シェアする",
         "private": "自分専用",
         "shareDescription": "コミュニティに公開します",
         "privateDescription": "個人記録として保存します（他のユーザーには表示されません）"
       }
     }
   }
   ```

### Phase 2: 拡張機能（将来実装）

1. **健康記録のカレンダー表示**
   - 個人の健康記録をカレンダー形式で表示
   - 日別の記録一覧

2. **健康記録のグラフ表示**
   - バイタルの推移グラフ
   - 症状の頻度グラフ
   - 食事の栄養バランスグラフ

3. **健康記録の検索・フィルタリング**
   - 日付範囲での検索
   - 健康記録タイプでのフィルタリング
   - タグでの検索

4. **健康記録のエクスポート**
   - PDF形式でのエクスポート
   - CSV形式でのエクスポート

---

## 🔐 プライバシーとセキュリティ

### プライバシー保護
- **自分専用記録**: `visibility="private"`の投稿は、作成者のみが閲覧可能
- **シェア記録**: `visibility="public"`または`visibility="followers_only"`の投稿は、設定に応じて公開

### データ保護
- 健康記録データは暗号化して保存（オプション）
- 個人情報の自動マスキング（将来実装）

---

## 📊 実装優先順位

### Phase 1: MVP版（2-3週間）
1. ✅ データベースマイグレーション
2. ✅ バックエンドスキーマ・API拡張
3. ✅ 投稿タイプ選択UI
4. ✅ 日記フォームの実装
5. ✅ 症状フォームの実装
6. ✅ 公開設定の明確化
7. ✅ PostCardでの健康記録表示

### Phase 2: 拡張機能（1-2ヶ月）
1. バイタルフォームの実装
2. 食事フォームの実装
3. 服薬フォームの実装
4. 運動フォームの実装
5. 健康記録のカレンダー表示
6. 健康記録のグラフ表示

---

## 🧪 テスト計画

### ユニットテスト
- 健康記録データのバリデーション
- 投稿タイプの判定ロジック
- 公開設定の適用ロジック

### 統合テスト
- 健康記録の作成フロー
- 自分専用記録の表示制御
- シェア記録の表示制御

### E2Eテスト
- 健康記録の作成から表示までのフロー
- 公開設定の切り替え

---

## 📝 関連ファイル

### バックエンド
- `backend/app/models/post.py` - Postモデルの拡張
- `backend/app/schemas/post.py` - PostCreate/PostUpdateスキーマの拡張
- `backend/app/api/posts.py` - APIエンドポイントの拡張
- `backend/app/services/post_service.py` - サービス層の拡張
- `backend/alembic/versions/xxx_add_health_record_fields.py` - マイグレーション

### フロントエンド
- `frontend/components/PostForm.tsx` - 投稿フォームの拡張
- `frontend/components/HealthRecordDiaryForm.tsx` - 日記フォーム（新規）
- `frontend/components/HealthRecordSymptomForm.tsx` - 症状フォーム（新規）
- `frontend/components/PostCard.tsx` - 投稿カードの拡張
- `frontend/lib/api/posts.ts` - APIクライアントの拡張
- `frontend/messages/ja.json` - 日本語翻訳の追加
- `frontend/messages/en.json` - 英語翻訳の追加

---

## 🎯 成功指標

1. **ユーザーエンゲージメント**
   - 健康記録の作成数
   - シェアされた健康記録の数
   - 自分専用記録の数

2. **ユーザー満足度**
   - 健康記録機能の使用率
   - ユーザーフィードバック

3. **パフォーマンス**
   - 健康記録の作成時間
   - 健康記録の表示時間

---

## 🔄 将来の拡張

1. **AI機能**
   - 症状の自動分析
   - 健康状態の予測
   - パーソナライズされたアドバイス

2. **医療連携**
   - 医療機関へのデータ共有（ユーザー同意の下）
   - 医師との連携機能

3. **コミュニティ機能**
   - 同じ症状を持つユーザーとのマッチング
   - 健康記録の匿名化シェア

---

**最終更新日**: 2025-12-29  
**作成者**: Claude Code

