# [locale]ディレクトリ構造について

## 概要

`frontend/app/[locale]/` というディレクトリ構造は、**Next.js App Router**と**next-intl**を使用した国際化（i18n）の実装に必要な仕様です。

## なぜ `[locale]` が必要か

### 1. Next.js App Routerの動的ルートセグメント

`[locale]` は Next.js App Router の**動的ルートセグメント**（Dynamic Route Segment）です。

- `[locale]` は URL パラメータとして扱われます
- 例: `/ja/feed` → `locale = "ja"`, `/en/feed` → `locale = "en"`

### 2. next-intlの推奨構造

`next-intl` は、Next.js 14 App Router で国際化を実装するためのライブラリです。

**推奨されるディレクトリ構造:**
```
app/
  [locale]/
    layout.tsx      # ロケール固有のレイアウト
    page.tsx        # ホームページ
    feed/
      page.tsx      # /ja/feed または /en/feed
    messages/
      page.tsx      # /ja/messages または /en/messages
```

### 3. 実装の詳細

#### 設定ファイル

**`frontend/i18n/routing.ts`**
```typescript
export const routing = defineRouting({
  locales: ['ja', 'en'],  // サポートする言語
  defaultLocale: 'ja'      // デフォルト言語
});
```

**`frontend/middleware.ts`**
```typescript
export default createMiddleware({
  ...routing,
  localePrefix: 'always',  // 常にロケールプレフィックスを使用
  localeDetection: false   // 自動検出を無効化
});
```

#### レイアウトファイル

**`frontend/app/[locale]/layout.tsx`**
```typescript
export default async function LocaleLayout({
  children,
  params: { locale }  // [locale] から取得されるパラメータ
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  // ロケールの検証
  if (!routing.locales.includes(locale as any)) notFound();
  
  // メッセージの取得とNextIntlClientProviderでラップ
  const messages = await getMessages();
  return (
    <NextIntlClientProvider messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
```

## メリット

1. **URLベースの言語切り替え**: `/ja/feed` と `/en/feed` で異なる言語を表示
2. **SEO対応**: 各言語で異なるURLを持つため、検索エンジンに最適化
3. **型安全性**: TypeScriptでロケールパラメータの型チェックが可能
4. **サーバーサイドレンダリング**: ロケールに応じたコンテンツをサーバー側で生成可能

## 代替案との比較

### ❌ クエリパラメータ方式 (`/feed?lang=ja`)
- URLが長くなる
- SEOに不利
- ブックマークしにくい

### ❌ サブドメイン方式 (`ja.example.com`)
- DNS設定が必要
- 複雑なインフラ構成が必要

### ✅ パスプレフィックス方式 (`/ja/feed`) ← 現在の実装
- URLが明確
- SEOに有利
- 実装が簡単
- next-intlの推奨方式

## 参考資料

- [next-intl公式ドキュメント](https://next-intl-docs.vercel.app/docs/routing)
- [Next.js App Router - Dynamic Routes](https://nextjs.org/docs/app/building-your-application/routing/dynamic-routes)

