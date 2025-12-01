# 投稿の編集・削除機能の改善提案

## 現在の実装状況

### 実装済み機能
- ✅ 投稿カードに編集・削除ボタン（投稿者のみ表示）
- ✅ 編集モーダル（EditPostModal）
- ✅ 削除確認モーダル（インライン実装）
- ✅ ソフトデリート（is_active = false）

### 現在の問題点

1. **UI/UXの問題**
   - 編集・削除ボタンが小さく、見つけにくい
   - 削除確認モーダルがシンプルすぎる
   - 削除後のフィードバックが不十分（alertのみ）
   - 編集・削除ボタンが常に表示されている（ホバー時のみ表示の方が良い）

2. **機能的な問題**
   - 削除された投稿の表示が不十分（完全に非表示になる）
   - 編集履歴が残らない
   - 削除の取り消し機能がない
   - エラーハンドリングが不十分（alertのみ）

3. **アクセシビリティの問題**
   - ボタンのaria-labelが不十分
   - キーボード操作のサポートが限定的

## 改善提案

### 1. UI/UXの改善 ⭐⭐⭐

#### 1.1 編集・削除ボタンの改善
**現状**: 常に表示されている小さなアイコンボタン

**改善案**:
- **ドロップダウンメニューに変更**
  - 3点リーダー（⋯）アイコンをクリックでメニューを表示
  - メニュー内に「編集」「削除」を配置
  - より直感的で、誤操作を防げる

- **ホバー時のみ表示**
  - 投稿カードにホバーした時のみ編集・削除ボタンを表示
  - よりクリーンなUI

**実装例**:
```tsx
{/* 3点リーダーメニュー */}
{isAuthor && isAuthenticated && (
  <div className="relative">
    <button
      onClick={() => setIsMenuOpen(!isMenuOpen)}
      className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
      aria-label={t('post.menu')}
    >
      <svg>...</svg>
    </button>
    {isMenuOpen && (
      <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg">
        <button onClick={() => setIsEditModalOpen(true)}>
          {t('post.edit')}
        </button>
        <button onClick={() => setIsDeleteConfirmOpen(true)} className="text-red-600">
          {t('post.delete')}
        </button>
      </div>
    )}
  </div>
)}
```

#### 1.2 削除確認モーダルの改善
**現状**: シンプルな確認ダイアログ

**改善案**:
- **より詳細な確認メッセージ**
  - 投稿の一部をプレビュー表示
  - 削除の影響を説明（コメントも削除される等）
  - 警告アイコンを追加

- **2段階確認**
  - 最初の確認: 「削除しますか？」
  - 2回目の確認: 「本当に削除しますか？この操作は取り消せません」

**実装例**:
```tsx
<div className="p-6">
  <div className="flex items-center mb-4">
    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4">
      <svg className="w-6 h-6 text-red-600">警告アイコン</svg>
    </div>
    <div>
      <h3 className="text-lg font-semibold">{t('post.deleteConfirm')}</h3>
      <p className="text-sm text-gray-600">{t('post.deleteWarning')}</p>
    </div>
  </div>
  
  {/* 投稿プレビュー */}
  <div className="bg-gray-50 rounded-lg p-4 mb-4">
    <p className="text-sm text-gray-600 line-clamp-3">{post.content}</p>
  </div>
  
  <p className="text-sm text-gray-600 mb-6">
    {t('post.deleteImpact')}
  </p>
  
  {/* 確認入力 */}
  <div className="mb-4">
    <label className="block text-sm font-medium mb-2">
      {t('post.typeConfirm', { word: 'DELETE' })}
    </label>
    <input
      type="text"
      value={confirmText}
      onChange={(e) => setConfirmText(e.target.value)}
      placeholder="DELETE"
      className="w-full px-3 py-2 border rounded-lg"
    />
  </div>
  
  {/* ボタン */}
  <div className="flex justify-end gap-3">
    <button onClick={() => setIsDeleteConfirmOpen(false)}>
      {t('post.cancel')}
    </button>
    <button
      onClick={handleDelete}
      disabled={confirmText !== 'DELETE' || isDeleting}
      className="bg-red-600 text-white"
    >
      {isDeleting ? t('post.deleting') : t('post.delete')}
    </button>
  </div>
</div>
```

#### 1.3 削除後のフィードバック改善
**現状**: alertのみ

**改善案**:
- **トースト通知の追加**
  - 削除成功時にトースト通知を表示
  - 「投稿を削除しました」メッセージ
  - 一定時間後に自動で消える

- **アニメーション**
  - 削除時にフェードアウトアニメーション
  - よりスムーズなUX

**実装例**:
```tsx
// トースト通知コンポーネントを使用
import { toast } from 'react-hot-toast';

const handleDelete = async () => {
  // ... 削除処理
  toast.success(t('post.deleteSuccess'));
  // フェードアウトアニメーション
  // リストから削除
};
```

### 2. 削除された投稿の表示改善 ⭐⭐

#### 2.1 削除された投稿の表示
**現状**: 完全に非表示になる

**改善案**:
- **「この投稿は削除されました」メッセージを表示**
  - 投稿カードは残すが、内容を非表示
  - 「この投稿は削除されました」メッセージを表示
  - コメントは残す（オプション）

**実装例**:
```tsx
{!post.is_active ? (
  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 text-center">
    <p className="text-gray-500 dark:text-gray-400">
      {t('post.deleted')}
    </p>
    <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
      {t('post.deletedByAuthor')}
    </p>
  </div>
) : (
  // 通常の投稿表示
)}
```

### 3. 編集履歴の表示（オプション） ⭐

#### 3.1 編集履歴の追加
**現状**: 編集履歴が残らない

**改善案**:
- **編集済みバッジの表示**
  - 編集された投稿に「編集済み」バッジを表示
  - 編集日時を表示（オプション）

**実装例**:
```tsx
{post.updated_at !== post.created_at && (
  <span className="text-xs text-gray-500">
    {t('post.edited')} {formatDate(post.updated_at)}
  </span>
)}
```

### 4. エラーハンドリングの改善 ⭐⭐

#### 4.1 エラーメッセージの改善
**現状**: alertのみ

**改善案**:
- **トースト通知でのエラー表示**
  - エラー時にトースト通知を表示
  - より詳細なエラーメッセージ
  - 再試行ボタンの提供

**実装例**:
```tsx
try {
  await deletePost(post.id, accessToken);
  toast.success(t('post.deleteSuccess'));
} catch (error) {
  toast.error(t('post.deleteFailed'));
  // エラーログを記録
}
```

### 5. アクセシビリティの改善 ⭐

#### 5.1 キーボード操作のサポート
**改善案**:
- **キーボードショートカット**
  - `Escape`キーでモーダルを閉じる
  - `Enter`キーで確認（削除確認モーダル）

- **フォーカス管理**
  - モーダルを開いた時にフォーカスを適切に移動
  - モーダルを閉じた時に元の位置にフォーカスを戻す

#### 5.2 ARIA属性の追加
**改善案**:
- **aria-labelの追加**
  - すべてのボタンに適切なaria-labelを追加
  - スクリーンリーダー対応

## 実装優先順位

### Phase 1: 必須改善（1-2日）
1. ✅ **削除確認モーダルの改善**
   - より詳細な確認メッセージ
   - 投稿プレビューの表示
   - 警告アイコンの追加

2. ✅ **削除後のフィードバック改善**
   - トースト通知の追加
   - フェードアウトアニメーション

3. ✅ **エラーハンドリングの改善**
   - トースト通知でのエラー表示

### Phase 2: UI改善（2-3日）
4. ✅ **編集・削除ボタンの改善**
   - ドロップダウンメニューに変更
   - ホバー時のみ表示（オプション）

5. ✅ **削除された投稿の表示**
   - 「この投稿は削除されました」メッセージ

### Phase 3: 追加機能（オプション）
6. ⏳ **編集履歴の表示**
   - 編集済みバッジ
   - 編集日時の表示

7. ⏳ **アクセシビリティの改善**
   - キーボード操作のサポート
   - ARIA属性の追加

## 実装に必要な変更

### フロントエンド
1. **PostCard.tsx**
   - ドロップダウンメニューの追加
   - 削除確認モーダルの改善
   - トースト通知の統合

2. **翻訳キーの追加**
   - `post.menu` - メニュー
   - `post.deleteWarning` - 削除警告
   - `post.deleteImpact` - 削除の影響
   - `post.typeConfirm` - 確認入力
   - `post.deleted` - 削除済み
   - `post.deletedByAuthor` - 投稿者によって削除されました
   - `post.edited` - 編集済み

3. **トースト通知ライブラリ**
   - `react-hot-toast`の導入（推奨）
   - または既存の通知システムを活用

### バックエンド（変更不要）
- 現在のAPIで対応可能
- 削除された投稿の表示はフロントエンドで制御

## 期待される効果

1. **UX向上**
   - より直感的な操作
   - 誤操作の防止
   - 明確なフィードバック

2. **安全性向上**
   - 2段階確認による誤削除の防止
   - 確認入力による安全性の向上

3. **アクセシビリティ向上**
   - キーボード操作のサポート
   - スクリーンリーダー対応

## 参考実装

- Twitter/Xの投稿削除UI
- Facebookの投稿削除UI
- Redditの投稿削除UI

