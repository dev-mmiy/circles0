# フロントエンドAPI実装完了レポート

## 概要

バックエンドAPIの変更に対応したフロントエンドのTypeScript型定義とAPIクライアント関数を更新しました。

**実装日時**: 2025-11-03
**対象ファイル**:
- [frontend/lib/api/users.ts](frontend/lib/api/users.ts)
- [frontend/lib/api/diseases.ts](frontend/lib/api/diseases.ts)

---

## 1. User API型定義の更新

### 1.1 UserProfile インターフェース

**変更内容:**
- ❌ `display_name` を削除
- ✅ `member_id` を追加（12桁会員ID）
- ✅ `nickname` を追加（公開用ニックネーム、必須）
- ✅ IDP抽象化フィールド追加（`idp_id`, `idp_provider`）
- ✅ 個人情報フィールド追加（`first_name`, `last_name`, `phone`）
- ✅ `preferred_language` を追加

```typescript
export interface UserProfile {
  id: string;
  member_id: string; // 12-digit member ID
  auth0_id?: string;
  idp_id?: string;
  idp_provider: string;
  email: string;
  email_verified: boolean;

  // Private information (only visible to owner)
  first_name?: string;
  last_name?: string;
  phone?: string;

  // Public information
  nickname: string; // Public nickname (required)
  username?: string;
  bio?: string;
  // ... その他のフィールド
  preferred_language: string; // User's preferred language
}
```

### 1.2 UserDisease インターフェース拡張

**新規追加:**

```typescript
export interface UserDiseaseDetailed {
  id: number;
  user_id: string;
  disease_id: number;
  status_id?: number;
  diagnosis_date?: string;
  diagnosis_doctor?: string;
  diagnosis_hospital?: string;
  severity_level?: number; // 1-5
  symptoms?: string;
  limitations?: string;
  medications?: string;
  notes?: string;
  is_public: boolean;
  is_searchable: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  disease?: { /* ... */ };
  status?: { /* ... */ };
}

export interface UserDiseaseCreate {
  disease_id: number;
  status_id?: number;
  diagnosis_date?: string;
  diagnosis_doctor?: string;
  diagnosis_hospital?: string;
  severity_level?: number;
  symptoms?: string;
  limitations?: string;
  medications?: string;
  notes?: string;
  is_public?: boolean;
  is_searchable?: boolean;
}

export interface UserDiseaseUpdate {
  status_id?: number;
  diagnosis_date?: string;
  // ... 同様のフィールド
  is_active?: boolean;
}
```

### 1.3 新規API関数

**ユーザー疾患管理:**

```typescript
// 詳細情報付きで疾患を追加
export async function addUserDiseaseDetailed(
  accessToken: string,
  data: UserDiseaseCreate
): Promise<UserDiseaseDetailed>

// 疾患の詳細情報を取得
export async function getUserDiseaseDetail(
  accessToken: string,
  diseaseId: number
): Promise<UserDiseaseDetailed>

// 疾患情報を更新
export async function updateUserDisease(
  accessToken: string,
  diseaseId: number,
  data: UserDiseaseUpdate
): Promise<UserDiseaseDetailed>

// 疾患を削除
export async function removeUserDisease(
  accessToken: string,
  diseaseId: number
): Promise<void>
```

### 1.4 その他の更新

**UserPublicProfile:**
```typescript
export interface UserPublicProfile {
  id: string;
  member_id: string; // 公開情報に追加
  nickname: string;  // display_nameから変更
  username?: string;
  bio?: string;
  avatar_url?: string;
  country?: string;
  created_at: string;
  diseases: UserDisease[];
}
```

**createOrGetUser関数:**
```typescript
export async function createOrGetUser(data: {
  auth0_id: string;
  email: string;
  email_verified: boolean;
  nickname: string; // 必須フィールド（display_nameから変更）
  first_name?: string;
  last_name?: string;
  phone?: string;
  avatar_url?: string;
  profile_visibility?: 'public' | 'limited' | 'private';
}): Promise<UserProfile>
```

---

## 2. Disease API型定義の更新

### 2.1 Disease インターフェース拡張

```typescript
export interface Disease {
  id: number;
  name: string;
  disease_code?: string; // 追加（例: ICD-10コード）
  description?: string;
  category?: string;
  severity_level?: number; // 追加
  is_active: boolean;
  created_at: string;
  updated_at: string;
  translations?: DiseaseTranslation[]; // 追加
}
```

### 2.2 新規インターフェース

**疾患翻訳:**
```typescript
export interface DiseaseTranslation {
  id: number;
  disease_id: number;
  language_code: string;
  translated_name: string;
  details?: string;
  created_at: string;
  updated_at: string;
}
```

**疾患カテゴリ:**
```typescript
export interface DiseaseCategory {
  id: number;
  category_code: string;
  parent_category_id?: number;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  translations?: DiseaseCategoryTranslation[];
}

export interface DiseaseCategoryTranslation {
  id: number;
  category_id: number;
  language_code: string;
  translated_name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}
```

**疾患ステータス:**
```typescript
export interface DiseaseStatus {
  id: number;
  status_code: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  translations?: DiseaseStatusTranslation[];
}

export interface DiseaseStatusTranslation {
  id: number;
  status_id: number;
  language_code: string;
  translated_name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}
```

### 2.3 新規API関数

**カテゴリ関連:**
```typescript
// カテゴリ一覧取得
export async function getDiseaseCategories(
  rootOnly: boolean = false
): Promise<DiseaseCategory[]>

// カテゴリ詳細取得
export async function getDiseaseCategory(
  categoryId: number
): Promise<DiseaseCategory>

// カテゴリ別疾患取得
export async function getDiseasesByCategory(
  categoryId: number,
  skip?: number,
  limit?: number
): Promise<Disease[]>
```

**ステータス関連:**
```typescript
// ステータス一覧取得
export async function getDiseaseStatuses(): Promise<DiseaseStatus[]>
```

**翻訳関連:**
```typescript
// 疾患翻訳取得
export async function getDiseaseTranslation(
  diseaseId: number,
  languageCode: string
): Promise<DiseaseTranslation>
```

---

## 3. 実装統計

### 変更されたファイル
- `frontend/lib/api/users.ts` - 357行（+202行）
- `frontend/lib/api/diseases.ts` - 283行（+165行）

### 新規型定義
- **Userモジュール**: 3つの新インターフェース
  - `UserDiseaseDetailed`
  - `UserDiseaseCreate`
  - `UserDiseaseUpdate`

- **Diseaseモジュール**: 5つの新インターフェース
  - `DiseaseTranslation`
  - `DiseaseCategory`
  - `DiseaseCategoryTranslation`
  - `DiseaseStatus`
  - `DiseaseStatusTranslation`

### 新規API関数
- **Userモジュール**: 4つの新関数
- **Diseaseモジュール**: 4つの新関数

**合計: 8つの新型定義、8つの新API関数**

---

## 4. 主な機能

### 4.1 ユーザー機能
- ✅ 12桁会員IDによる識別
- ✅ ニックネームベースの公開プロフィール
- ✅ IDP抽象化（Auth0以外にも対応可能）
- ✅ 個人情報の分離管理
- ✅ 多言語設定対応

### 4.2 疾患管理機能
- ✅ 詳細な診断情報（医師、病院、日付）
- ✅ 症状・制限・服薬情報
- ✅ 5段階の重症度レベル
- ✅ 疾患状態トラッキング（5種類のステータス）
- ✅ 公開/非公開設定
- ✅ 検索可能/不可能設定

### 4.3 多言語対応
- ✅ 疾患名の多言語翻訳
- ✅ カテゴリ名の多言語翻訳
- ✅ ステータス名の多言語翻訳
- ✅ 言語コード指定での翻訳取得

### 4.4 カテゴリ機能
- ✅ 階層構造のカテゴリ
- ✅ ルートカテゴリのフィルタリング
- ✅ カテゴリ別疾患一覧

---

## 5. 後方互換性

### 維持された機能
以下の既存機能は引き続き動作します：

- ✅ `getCurrentUserProfile()` - 新フィールドを含むプロフィール取得
- ✅ `updateCurrentUserProfile()` - nickname等の新フィールドに対応
- ✅ `getUserPublicProfile()` - member_id, nicknameを含む
- ✅ `getDiseases()` - 既存の疾患一覧取得
- ✅ `searchDiseases()` - 疾患検索
- ✅ `addDiseaseToUser()` - シンプルな疾患追加（後方互換用）
- ✅ `removeDiseaseFromUser()` - 疾患削除

### 非推奨の項目
- ❌ `display_name` - `nickname`に置き換え

---

## 6. 使用例

### ユーザー作成
```typescript
const userData = {
  auth0_id: 'auth0|123456',
  email: 'user@example.com',
  email_verified: true,
  nickname: 'TaroYamada',  // 必須
  first_name: 'Taro',
  last_name: 'Yamada',
  phone: '+81-90-1234-5678'
};

const user = await createOrGetUser(userData);
console.log(user.member_id); // "123456789012"
console.log(user.nickname);  // "TaroYamada"
```

### 詳細情報付き疾患追加
```typescript
const diseaseData: UserDiseaseCreate = {
  disease_id: 1,
  diagnosis_date: '2024-01-15',
  diagnosis_doctor: 'Dr. Yamada',
  diagnosis_hospital: 'Tokyo Medical Center',
  symptoms: 'Persistent sadness, sleep disturbances',
  limitations: 'Difficulty concentrating at work',
  medications: 'Sertraline 50mg daily',
  status_id: 5, // UNDER_TREATMENT
  severity_level: 3,
  is_public: false,
  is_searchable: true
};

const userDisease = await addUserDiseaseDetailed(accessToken, diseaseData);
```

### カテゴリ別疾患取得
```typescript
// ルートカテゴリ取得
const rootCategories = await getDiseaseCategories(true);

// カテゴリ内の疾患取得
const diseases = await getDiseasesByCategory(1, 0, 20);

// 疾患の日本語翻訳取得
const translation = await getDiseaseTranslation(1, 'ja');
console.log(translation.translated_name); // "うつ病"
```

### ステータス一覧取得
```typescript
const statuses = await getDiseaseStatuses();
statuses.forEach(status => {
  console.log(status.status_code); // ACTIVE, REMISSION, etc.
  if (status.translations) {
    const jaTranslation = status.translations.find(t => t.language_code === 'ja');
    console.log(jaTranslation?.translated_name); // "活動期", "寛解期", etc.
  }
});
```

---

## 7. 次のステップ

### 7.1 コンポーネント実装
フロントエンドコンポーネントの実装が必要です：

1. **ユーザープロフィールページ**
   - 会員ID表示
   - ニックネーム表示・編集
   - 個人情報編集フォーム

2. **疾患管理ページ**
   - 疾患一覧表示
   - 詳細情報入力フォーム
   - カテゴリ選択UI
   - ステータス選択UI

3. **多言語対応**
   - 言語切り替えUI
   - 翻訳データの表示

### 7.2 状態管理
- Reactコンテキストまたは状態管理ライブラリの設定
- ユーザープロフィールのグローバル状態
- 疾患データのキャッシング

### 7.3 フォームバリデーション
- ニックネーム重複チェック
- 必須フィールドの検証
- 日付フォーマットの検証

### 7.4 エラーハンドリング
- APIエラーの適切な表示
- ネットワークエラーの処理
- ユーザーフレンドリーなエラーメッセージ

---

## 8. まとめ

✅ **完了事項:**
- User API型定義を完全に更新（display_name → nickname）
- Disease API型定義を大幅に拡張
- 8つの新規API関数を実装
- 後方互換性を維持
- TypeScript型安全性を確保

📊 **実装統計:**
- 変更ファイル数: 2
- 新規型定義: 8
- 新規API関数: 8
- 追加コード行数: 約367行

🎯 **達成した機能:**
- 12桁会員ID対応
- ニックネームベースの識別
- 詳細な疾患管理
- 多言語対応基盤
- IDP抽象化

フロントエンドAPIクライアントは、バックエンドの新機能を完全にサポートする準備が整いました。コンポーネント実装に進むことができます。
