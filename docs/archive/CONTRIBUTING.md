# Contributing to Disease Community Platform

このプロジェクトへの貢献に興味を持っていただき、ありがとうございます！

## 📋 目次

- [行動規範](#行動規範)
- [開発環境のセットアップ](#開発環境のセットアップ)
- [開発ワークフロー](#開発ワークフロー)
- [コーディング規約](#コーディング規約)
- [テスト](#テスト)
- [プルリクエストのプロセス](#プルリクエストのプロセス)

---

## 🤝 行動規範

### 基本原則

- 敬意を持って接する
- 建設的なフィードバックを提供する
- オープンで協力的な姿勢を保つ
- 多様性を尊重する

---

## 🛠️ 開発環境のセットアップ

詳細は [GETTING_STARTED.md](./GETTING_STARTED.md) を参照してください。

### クイックセットアップ

```bash
# リポジトリのクローン
git clone https://github.com/dev-mmiy/circles0.git
cd circles0

# 環境変数の設定
cp backend/.env.example backend/.env

# Docker Composeで起動
docker-compose up -d

# 動作確認
curl http://localhost:8000/health
open http://localhost:3000
```

---

## 🔄 開発ワークフロー

### 1. Issueの作成または選択

- 新機能やバグ修正の前に、Issueを作成または既存のIssueを確認
- Issueには明確なタイトルと説明を記載
- 可能であれば、再現手順やスクリーンショットを添付

### 2. ブランチの作成

```bash
# develop ブランチから新しいブランチを作成
git checkout develop
git pull origin develop
git checkout -b <type>/<issue-number>-<short-description>
```

**ブランチ命名規則:**
- `feature/123-add-user-profile` - 新機能
- `fix/456-cors-error` - バグ修正
- `docs/789-update-readme` - ドキュメント
- `refactor/101-clean-api-code` - リファクタリング

### 3. 開発

```bash
# コードを変更
# ホットリロードが有効なので、変更は自動的に反映されます

# 定期的にコミット
git add .
git commit -m "feat: add user profile page"

# 開発中も定期的にdevelopブランチの変更を取り込む
git checkout develop
git pull origin develop
git checkout <your-branch>
git merge develop
```

### 4. テスト

```bash
# ローカルでテストを実行
./scripts/local-test-full.sh

# または個別にテスト
docker-compose exec backend pytest
docker-compose exec frontend npm test
```

### 5. リンティング＆フォーマット

```bash
# 自動フォーマット
make format

# または個別に
docker-compose exec backend black .
docker-compose exec backend isort .
docker-compose exec frontend npm run format
```

### 6. プルリクエストの作成

```bash
# リモートにプッシュ
git push origin <your-branch>

# GitHubでプルリクエストを作成
# Base: develop ← Compare: <your-branch>
```

---

## 📝 コーディング規約

### Python (Backend)

#### スタイルガイド

- **PEP 8** に準拠
- **Black** でフォーマット（行長: 88文字）
- **isort** でインポートをソート
- **flake8** でリンティング

```bash
# フォーマット
black .
isort .

# チェック
flake8 . --max-line-length=88 --extend-ignore=E203,W503
```

#### ベストプラクティス

```python
# ✅ Good
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse


router = APIRouter()


@router.post("/users/", response_model=UserResponse)
def create_user(
    user: UserCreate,
    db: Session = Depends(get_db)
) -> UserResponse:
    """Create a new user."""
    # Implementation
    pass
```

```python
# ❌ Bad
from app.database import get_db
from fastapi import APIRouter,Depends
from app.models.user import User

router = APIRouter()
@router.post("/users/")
def create_user(user:UserCreate,db:Session=Depends(get_db)):
    # No type hints, no docstring, bad formatting
    pass
```

### TypeScript/JavaScript (Frontend)

#### スタイルガイド

- **ESLint** でリンティング
- **Prettier** でフォーマット
- **2スペース** インデント
- **セミコロン** 使用

```bash
# フォーマット
npm run format

# チェック
npm run lint
```

#### ベストプラクティス

```typescript
// ✅ Good
'use client';

import { useState, useEffect } from 'react';
import { useApiService } from '@/contexts/ApiContext';

interface UserData {
  firstName: string;
  lastName: string;
}

export default function UserProfile() {
  const [user, setUser] = useState<UserData | null>(null);
  const apiService = useApiService();

  useEffect(() => {
    async function fetchUser() {
      try {
        const data = await apiService.getUser('123');
        setUser(data);
      } catch (error) {
        console.error('Failed to fetch user:', error);
      }
    }
    fetchUser();
  }, []);

  return (
    <div className="container mx-auto p-4">
      {user && (
        <h1 className="text-2xl font-bold">
          {user.firstName} {user.lastName}
        </h1>
      )}
    </div>
  );
}
```

```typescript
// ❌ Bad
import {useState} from 'react'

export default function UserProfile(){
    const [user,setUser]=useState(null)
    // No types, bad formatting, no error handling
    return <div>{user?.firstName}</div>
}
```

### コミットメッセージ

**Conventional Commits** フォーマットを使用：

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: 新機能
- `fix`: バグ修正
- `docs`: ドキュメント
- `style`: コードスタイル（フォーマット等）
- `refactor`: リファクタリング
- `perf`: パフォーマンス改善
- `test`: テスト追加・修正
- `build`: ビルドシステム
- `ci`: CI設定
- `chore`: その他の変更

**例:**

```bash
# 良い例
git commit -m "feat(auth): add JWT authentication"
git commit -m "fix(api): resolve CORS issue for production frontend"
git commit -m "docs(readme): update installation instructions"
git commit -m "refactor(user): simplify user creation logic"

# 詳細な説明を含む
git commit -m "feat(user): add user profile page

- Add new profile page component
- Implement API service integration
- Add responsive design
- Add unit tests

Closes #123"
```

---

## 🧪 テスト

### テストの作成

すべての新機能とバグ修正にはテストを追加してください。

#### Backend (Pytest)

```python
# backend/tests/test_user_api.py
import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_create_user():
    """Test user creation API."""
    response = client.post(
        "/api/v1/users/",
        json={
            "email": "test@example.com",
            "first_name": "Test",
            "last_name": "User",
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "test@example.com"


def test_get_user():
    """Test user retrieval API."""
    response = client.get("/api/v1/users/1")
    assert response.status_code == 200
```

#### Frontend (Jest)

```typescript
// frontend/__tests__/user-profile.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import UserProfile from '@/app/profile/[id]/page';

describe('UserProfile', () => {
  it('renders user name', async () => {
    render(<UserProfile params={{ id: '1' }} />);
    
    await waitFor(() => {
      expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
    });
  });
});
```

### テストの実行

```bash
# すべてのテスト
./scripts/local-test-full.sh

# バックエンドのみ
docker-compose exec backend pytest

# 特定のテストファイル
docker-compose exec backend pytest tests/test_user_api.py

# カバレッジ
docker-compose exec backend pytest --cov=app

# フロントエンド
docker-compose exec frontend npm test

# ウォッチモード
docker-compose exec frontend npm test -- --watch
```

---

## 🔍 プルリクエストのプロセス

### PRを作成する前に

- [ ] ローカルでテストが通ることを確認
- [ ] リンティング・フォーマットが適用されていることを確認
- [ ] コミットメッセージが規約に従っていることを確認
- [ ] `develop` ブランチの最新の変更をマージ済み
- [ ] 不要なファイル（ログ、一時ファイル等）が含まれていないことを確認

### PRテンプレート

```markdown
## 変更内容

<!-- 何を変更したか簡潔に説明 -->

## 変更理由

<!-- なぜこの変更が必要か説明 -->

## 影響範囲

<!-- どの部分に影響があるか -->
- [ ] Backend
- [ ] Frontend
- [ ] Database
- [ ] Infrastructure

## テスト

<!-- どのようにテストしたか -->
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## スクリーンショット（該当する場合）

<!-- UI変更の場合、スクリーンショットを添付 -->

## 関連Issue

<!-- 関連するIssue番号 -->
Closes #123

## チェックリスト

- [ ] コードレビュー準備完了
- [ ] ドキュメント更新済み
- [ ] テスト追加済み
- [ ] CI/CDパイプラインが通過
```

### レビュープロセス

1. **自己レビュー**: PRを作成したら、自分で一度確認
2. **CI/CDチェック**: GitHub Actionsが自動的に実行
3. **コードレビュー**: 最低1名のレビュアーによる承認が必要
4. **修正対応**: レビューコメントに対応
5. **マージ**: 承認後、`develop` ブランチにマージ

### レビュー基準

レビュアーは以下を確認します：

- コードの品質と可読性
- テストの適切性
- セキュリティ上の問題
- パフォーマンスへの影響
- ドキュメントの更新
- コーディング規約の遵守

---

## 🐛 バグ報告

### バグレポートに含めるべき情報

```markdown
## バグの説明

<!-- バグの明確で簡潔な説明 -->

## 再現手順

1. '...'に移動
2. '...'をクリック
3. '...'までスクロール
4. エラーを確認

## 期待される動作

<!-- 何が起こるべきか -->

## 実際の動作

<!-- 実際に何が起こったか -->

## スクリーンショット

<!-- 可能であれば、スクリーンショットを添付 -->

## 環境

- OS: [e.g. macOS 13.0]
- Browser: [e.g. Chrome 120]
- Version: [e.g. 1.0.0]

## 追加情報

<!-- その他関連する情報 -->
```

---

## 💡 機能リクエスト

### 機能リクエストに含めるべき情報

```markdown
## 機能の説明

<!-- 提案する機能の明確で簡潔な説明 -->

## 問題・ニーズ

<!-- どのような問題を解決するか、なぜ必要か -->

## 提案する解決策

<!-- どのように実装すべきか -->

## 代替案

<!-- 検討した他の解決策 -->

## 追加情報

<!-- その他関連する情報、スクリーンショット等 -->
```

---

## 📚 リソース

- [Getting Started Guide](./GETTING_STARTED.md)
- [Project README](./README.md)
- [Deployment Guide](./DEPLOYMENT_STATUS.md)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Conventional Commits](https://www.conventionalcommits.org/)

---

## ❓ 質問がある場合

- GitHub Issuesで質問を投稿
- ドキュメントを確認
- チームに連絡

---

**貢献してくださり、ありがとうございます！** 🙏

