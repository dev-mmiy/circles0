# 画像ビューアールーティング修正 - テスト結果

## 修正内容

### 1. ルーティング構造の統一
- **問題**: `/posts/[id]`と`/posts/[postId]`が混在していたため、Next.jsのルーティングで競合が発生
- **解決**: すべてのルートを`[id]`に統一

### 2. ファイル構造の変更
```
修正前:
frontend/app/[locale]/posts/[postId]/images/[imageId]/page.tsx
frontend/app/[locale]/posts/[postId]/comments/[commentId]/images/[imageId]/page.tsx

修正後:
frontend/app/[locale]/posts/[id]/images/[imageId]/page.tsx
frontend/app/[locale]/posts/[id]/comments/[commentId]/images/[imageId]/page.tsx
```

### 3. パラメータ名の統一
- `params.postId` → `params.id`に変更
- 投稿詳細ページと画像ビューアーページで統一

### 4. ロケールプレフィックスの処理
- `next-intl`の`useRouter`を使用している場合は、ロケールプレフィックスを手動で追加しない（自動追加される）
- `next/navigation`の`useRouter`を使用している場合は、明示的にロケールを追加

## テスト結果

### TypeScript型チェック
✅ **成功** - すべての型エラーが解消されました

### フロントエンドテスト
✅ **ほぼ成功** - 6/7テストがパス
- `lib/utils/__tests__/hashtag.test.ts` - PASS
- `lib/utils/__tests__/errorHandler.test.ts` - PASS
- `lib/utils/__tests__/searchHistory.test.ts` - PASS
- `components/__tests__/DiseaseStatusBadge.test.tsx` - PASS
- `components/__tests__/ErrorDisplay.test.tsx` - PASS
- `lib/hooks/__tests__/useDataLoader.test.tsx` - FAIL (既存の問題、画像ビューアー修正とは無関係)

## 手動テストチェックリスト

以下の手順で動作確認を行ってください：

### 1. フィードページから画像をクリック
- [ ] `/ja/feed`にアクセス
- [ ] 投稿の画像をクリック
- [ ] `/ja/posts/{postId}/images/{imageId}`に正しく遷移することを確認
- [ ] 画像ビューアーが正しく表示されることを確認

### 2. 投稿詳細ページから画像をクリック
- [ ] `/ja/posts/{postId}`にアクセス
- [ ] 投稿の画像をクリック
- [ ] `/ja/posts/{postId}/images/{imageId}`に正しく遷移することを確認
- [ ] 画像ビューアーが正しく表示されることを確認

### 3. コメント画像をクリック
- [ ] `/ja/posts/{postId}`にアクセス
- [ ] コメントの画像をクリック
- [ ] `/ja/posts/{postId}/comments/{commentId}/images/{imageId}`に正しく遷移することを確認
- [ ] 画像ビューアーが正しく表示されることを確認

### 4. 画像ビューアーからの戻る操作
- [ ] 画像ビューアーで「Back to Post」ボタンをクリック
- [ ] `/ja/posts/{postId}`に正しく戻ることを確認

### 5. ロケールプレフィックスの確認
- [ ] 日本語ロケール（`/ja/...`）で動作確認
- [ ] 英語ロケール（`/en/...`）で動作確認
- [ ] ロケールが二重にならないことを確認（`/ja/ja/...`にならない）

## 修正されたファイル

1. `frontend/app/layout.tsx` - ルートレイアウトに`<html>`と`<body>`タグを追加
2. `frontend/app/[locale]/posts/[id]/images/[imageId]/page.tsx` - 新規作成（`[postId]`から移動）
3. `frontend/app/[locale]/posts/[id]/comments/[commentId]/images/[imageId]/page.tsx` - 新規作成（`[postId]`から移動）
4. `frontend/components/PostCard.tsx` - 画像クリック時のナビゲーションを修正
5. `frontend/components/CommentSection.tsx` - コメント画像クリック時のナビゲーションを修正、`CommentItem`内にも`handleCommentImageClick`を追加
6. `frontend/components/ImageViewer.tsx` - 閉じる際のナビゲーションを修正
7. `frontend/middleware.ts` - パス名をカスタムヘッダーに設定

## 削除されたファイル

- `frontend/app/[locale]/posts/[postId]/images/[imageId]/page.tsx` - 削除
- `frontend/app/[locale]/posts/[postId]/comments/[commentId]/images/[imageId]/page.tsx` - 削除

## 注意事項

- `next-intl`の`useRouter`は自動的にロケールプレフィックスを追加するため、手動で追加すると二重になる
- `next/navigation`の`useRouter`を使用する場合は、明示的にロケールを追加する必要がある

