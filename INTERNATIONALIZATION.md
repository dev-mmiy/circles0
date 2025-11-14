# 国際化 (i18n) 実装ガイド

## 概要

このプロジェクトは `next-intl` を使用して、日本語 (ja) と英語 (en) の2言語に対応しています。

## アーキテクチャ

### 使用技術
- **next-intl v3.x**: Next.js 14 App Router 対応の国際化ライブラリ
- **ロケール**: `ja` (日本語 - デフォルト), `en` (英語)
- **ルーティング**: `/[locale]/*` パターン

### ディレクトリ構造

```
frontend/
├── i18n/
│   ├── routing.ts          # ルーティング設定とナビゲーション関数
│   └── request.ts          # サーバーサイド設定とメッセージロード
├── messages/
│   ├── ja.json             # 日本語翻訳
│   └── en.json             # 英語翻訳
├── middleware.ts           # ロケール検出とルーティングミドルウェア
└── app/
    └── [locale]/           # ロケール別ページ
        ├── layout.tsx      # NextIntlClientProvider設定
        ├── page.tsx        # ホームページ
        ├── feed/
        │   └── page.tsx    # フィードページ
        └── ...
```

## 設定ファイル

### 1. `i18n/routing.ts`
ロケール設定とナビゲーション関数を定義:

```typescript
import {createNavigation} from 'next-intl/navigation';
import {defineRouting} from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['ja', 'en'],
  defaultLocale: 'ja'
});

export const {Link, redirect, usePathname, useRouter} =
  createNavigation(routing);
```

### 2. `i18n/request.ts`
サーバーサイドでのメッセージロード:

```typescript
import {getRequestConfig} from 'next-intl/server';
import {routing} from './routing';

export default getRequestConfig(async ({requestLocale}) => {
  let locale = await requestLocale;

  if (!locale || !routing.locales.includes(locale as any)) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default
  };
});
```

### 3. `middleware.ts`
エッジでのロケールルーティング:

```typescript
import createMiddleware from 'next-intl/middleware';
import {routing} from './i18n/routing';

export default createMiddleware({
  ...routing,
  localePrefix: 'always',
  localeDetection: false  // ブラウザ言語検出を無効化
});

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};
```

### 4. `next.config.js`
next-intlプラグイン統合:

```javascript
const createNextIntlPlugin = require('next-intl/plugin');
const withNextIntl = createNextIntlPlugin();

module.exports = withNextIntl(nextConfig);
```

## 翻訳済みコンポーネント

### 1. Header コンポーネント
**ファイル**: `frontend/components/Header.tsx`
**名前空間**: `navigation`

翻訳キー:
- `home` - ホームリンク
- `feed` - フィードリンク
- `userSearch` - ユーザー検索リンク
- `myPage` - マイページリンク

使用例:
```tsx
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';

const t = useTranslations('navigation');
<Link href="/">{t('home')}</Link>
```

### 2. AuthButton コンポーネント
**ファイル**: `frontend/components/AuthButton.tsx`
**名前空間**: `auth`

翻訳キー:
- `login` - ログインボタン
- `logout` - ログアウトボタン
- `loggingOut` - ログアウト中メッセージ
- `loading` - 読み込み中メッセージ
- `notInitialized` - Auth0未初期化エラー
- `retry` - 再試行ボタン
- `loginError` - ログインエラータイトル
- `authError` - 認証エラーラベル
- `unknownError` - 不明なエラーメッセージ
- `unknown` - 不明ラベル
- `errorType` - エラータイプラベル
- `timestamp` - タイムスタンプラベル
- `autoClearingCache` - キャッシュクリア中メッセージ
- `clearCacheRetry` - キャッシュクリア&再試行ボタン

### 3. NotificationDropdown コンポーネント
**ファイル**: `frontend/components/notifications/NotificationDropdown.tsx`
**名前空間**: `notifications`

翻訳キー:
- `title` - 通知タイトル
- `markAllAsRead` - 全て既読ボタン
- `noNotifications` - 通知なしメッセージ
- `viewAll` - 全て表示リンク
- `types.follow` - フォロー通知テキスト
- `types.comment` - コメント通知テキスト
- `types.reply` - 返信通知テキスト
- `types.like` - いいね通知テキスト
- `types.comment_like` - コメントいいね通知テキスト
- `types.default` - デフォルト通知テキスト
- `actions.markAsRead` - 既読ボタン
- `actions.delete` - 削除ボタン

### 4. Feed ページ
**ファイル**: `frontend/app/[locale]/feed/page.tsx`
**名前空間**: `feed`

翻訳キー:
- `title` - ページタイトル
- `subtitle` - ページサブタイトル
- `loginPrompt` - ログインプロンプト
- `errorLoadingPosts` - 投稿読み込みエラー
- `retry` - 再試行ボタン
- `noPosts` - 投稿なしタイトル
- `noPostsMessage` - 投稿なしメッセージ
- `loading` - 読み込み中
- `loadMore` - さらに読み込むボタン
- `allPostsShown` - 全投稿表示済みメッセージ

## コンポーネントで翻訳を使用する方法

### クライアントコンポーネント

```tsx
'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';

export default function MyComponent() {
  const t = useTranslations('namespace');

  return (
    <div>
      <h1>{t('title')}</h1>
      <Link href="/path">{t('linkText')}</Link>
    </div>
  );
}
```

### サーバーコンポーネント

```tsx
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';

export default function MyServerComponent() {
  const t = useTranslations('namespace');

  return (
    <div>
      <h1>{t('title')}</h1>
      <Link href="/path">{t('linkText')}</Link>
    </div>
  );
}
```

### パラメータ付き翻訳

messages/ja.json:
```json
{
  "notifications": {
    "types": {
      "follow": "{actorName}があなたをフォローしました"
    }
  }
}
```

使用:
```tsx
const t = useTranslations('notifications');
const message = t('types.follow', { actorName: 'ユーザー名' });
// 結果: "ユーザー名があなたをフォローしました"
```

## ナビゲーション

### Link コンポーネント
通常の `next/link` の代わりに `@/i18n/routing` から `Link` をインポート:

```tsx
import { Link } from '@/i18n/routing';

<Link href="/feed">フィード</Link>
// /ja/feed または /en/feed に自動的にルーティング
```

### プログラムによるナビゲーション

```tsx
import { useRouter } from '@/i18n/routing';

const router = useRouter();
router.push('/feed');  // 現在のロケールを維持
```

### リダイレクト

```tsx
import { redirect } from '@/i18n/routing';

redirect('/feed');  // 現在のロケールでリダイレクト
```

## 翻訳ファイルの構造

### messages/ja.json と messages/en.json

```json
{
  "app": {
    "name": "アプリ名",
    "description": "説明"
  },
  "navigation": {
    "home": "ホーム",
    "feed": "フィード"
  },
  "auth": {
    "login": "ログイン",
    "logout": "ログアウト"
  },
  "notifications": {
    "title": "通知",
    "types": {
      "follow": "{actorName}があなたをフォローしました"
    }
  },
  "feed": {
    "title": "コミュニティフィード",
    "subtitle": "説明文"
  }
}
```

## URL構造

- `/` → `/ja` にリダイレクト (デフォルトロケール)
- `/ja` → 日本語ホームページ
- `/en` → 英語ホームページ
- `/ja/feed` → 日本語フィードページ
- `/en/feed` → 英語フィードページ

## 新しいコンポーネントに翻訳を追加する手順

1. **useTranslations フックをインポート**
   ```tsx
   import { useTranslations } from 'next-intl';
   ```

2. **Link コンポーネントを置き換え**
   ```tsx
   // 変更前
   import Link from 'next/link';

   // 変更後
   import { Link } from '@/i18n/routing';
   ```

3. **コンポーネント内でフックを使用**
   ```tsx
   const t = useTranslations('your-namespace');
   ```

4. **ハードコードされた文字列を置き換え**
   ```tsx
   // 変更前
   <h1>タイトル</h1>

   // 変更後
   <h1>{t('title')}</h1>
   ```

5. **翻訳ファイルにキーを追加**

   messages/ja.json:
   ```json
   {
     "your-namespace": {
       "title": "タイトル"
     }
   }
   ```

   messages/en.json:
   ```json
   {
     "your-namespace": {
       "title": "Title"
     }
   }
   ```

## ベストプラクティス

1. **名前空間の使用**: 関連する翻訳を論理的なグループにまとめる
   - `auth` - 認証関連
   - `navigation` - ナビゲーション
   - `notifications` - 通知
   - `feed` - フィード
   - ページ固有の名前空間

2. **一貫性のあるキー命名**:
   - キャメルケースを使用: `loginError`, `markAllAsRead`
   - ネストを活用: `types.follow`, `actions.delete`

3. **パラメータ化**: 動的コンテンツには変数を使用
   ```json
   {
     "greeting": "こんにちは、{name}さん"
   }
   ```

4. **すべてのロケールを更新**: 新しいキーを追加する際は、すべての翻訳ファイル (ja.json, en.json) を更新

5. **TypeScript型安全性**: next-intlは自動的に型チェックを提供

## トラブルシューティング

### 問題: 翻訳が表示されない
- 翻訳ファイルにキーが存在することを確認
- 名前空間が正しいことを確認
- ブラウザのコンソールでエラーを確認

### 問題: リンクがロケールなしで生成される
- `next/link` ではなく `@/i18n/routing` から `Link` をインポートしていることを確認

### 問題: ミドルウェアエラー
- `middleware.ts` が正しく設定されていることを確認
- `matcher` パターンが正しいことを確認

## 今後の拡張

さらなる多言語対応を追加する場合:

1. **新しいロケールの追加**:
   - `i18n/routing.ts` の `locales` 配列に追加
   - `messages/` に新しい翻訳ファイルを作成 (例: `fr.json`)

2. **追加のコンポーネント翻訳**:
   - PostCard コンポーネント
   - PostForm コンポーネント
   - UserProfileEditForm コンポーネント
   - DiseaseSearch, DiseaseForm コンポーネント
   - FollowButton コンポーネント
   - その他のページとモーダル

3. **動的コンテンツ**:
   - 日付のフォーマット
   - 数値のフォーマット
   - 通貨表示

## リソース

- [next-intl 公式ドキュメント](https://next-intl-docs.vercel.app/)
- [Next.js 国際化](https://nextjs.org/docs/app/building-your-application/routing/internationalization)
