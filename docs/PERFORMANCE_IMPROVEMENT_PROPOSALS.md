# パフォーマンス改善提案

## 📊 現状分析

### 完了した改善
- ✅ フロントエンドのタイムアウトを20秒→30秒に延長
- ✅ 自動リトライ機能の実装（最大2回、指数バックオフ）
- ✅ バックエンドのN+1問題の最適化
- ✅ データベースインデックスの追加

### 残っている課題
- ⚠️ タイムアウトエラーが「たまに」発生
- ⚠️ Cloud Runのコールドスタートによる遅延
- ⚠️ パフォーマンスモニタリングの不足

---

## 🎯 優先度別改善提案

### 🔴 優先度: 高（即座に実施推奨）

#### 1. Cloud Runの設定最適化

**問題**: コールドスタート時にタイムアウトが発生しやすい

**対策**:
```bash
# 最小インスタンス数を1に設定（コールドスタートを回避）
gcloud run services update disease-community-api \
  --region=asia-northeast1 \
  --min-instances=1 \
  --cpu=2 \
  --memory=2Gi \
  --timeout=300 \
  --concurrency=80

# フロントエンドも同様に設定
gcloud run services update disease-community-frontend \
  --region=asia-northeast1 \
  --min-instances=1 \
  --cpu=1 \
  --memory=1Gi \
  --timeout=300
```

**効果**:
- コールドスタートの発生を大幅に削減
- レスポンス時間の安定化
- タイムアウトエラーの減少

**コスト影響**: 最小インスタンス1台分のコストが発生（約$10-20/月）

---

#### 2. パフォーマンスモニタリングの実装

**目的**: タイムアウトの原因を特定し、ボトルネックを可視化

**実装内容**:

1. **Cloud Monitoring ダッシュボードの作成**
   - レスポンス時間の監視
   - エラー率の追跡
   - リクエスト数の監視

2. **カスタムメトリクスの追加**
   ```python
   # backend/app/main.py に追加
   from google.cloud import monitoring_v3
   
   def log_slow_request(path: str, elapsed: float):
       """Slow requestをメトリクスとして記録"""
       if elapsed > 5.0:  # 5秒以上かかったリクエスト
           # Cloud Monitoringに記録
           pass
   ```

3. **アラートの設定**
   - レスポンス時間が10秒を超える場合
   - エラー率が5%を超える場合
   - タイムアウトエラーが発生した場合

**効果**:
- 問題の早期発見
- パフォーマンスボトルネックの特定
- データに基づいた最適化

---

#### 3. データベース接続プールの最適化

**現状**: 
- `pool_size=5`
- `max_overflow=10`
- `pool_timeout=30`

**提案**:
```python
# backend/app/database.py
engine = create_engine(
    DATABASE_URL,
    pool_size=10,  # 5 → 10に増加
    max_overflow=20,  # 10 → 20に増加
    pool_timeout=30,
    pool_recycle=1800,  # 3600 → 1800（30分）に短縮
    pool_pre_ping=True,
    connect_args={
        "connect_timeout": 10,
        "keepalives": 1,  # TCP keepaliveを有効化
        "keepalives_idle": 30,
        "keepalives_interval": 10,
        "keepalives_count": 5,
    },
)
```

**効果**:
- 接続待ち時間の短縮
- タイムアウトエラーの減少
- より多くの同時リクエストに対応

---

### 🟡 優先度: 中（1-2週間以内に実施推奨）

#### 4. レスポンスキャッシングの実装

**対象エンドポイント**:
- `/api/v1/posts` (フィード)
- `/api/v1/notifications/unread-count`
- `/api/v1/messages/conversations`

**実装方法**:
```python
# backend/app/api/posts.py
from functools import lru_cache
from datetime import datetime, timedelta

@lru_cache(maxsize=100)
def get_cached_feed(user_id: str, skip: int, limit: int, filter_type: str):
    """フィードをキャッシュ（30秒間）"""
    # 実装
    pass
```

**または Redis を使用**:
```python
# Redis キャッシュの実装
import redis
redis_client = redis.Redis(host='redis-host', port=6379)

def get_cached_feed(key: str, ttl: int = 30):
    cached = redis_client.get(key)
    if cached:
        return json.loads(cached)
    # データベースから取得してキャッシュ
    data = fetch_from_db()
    redis_client.setex(key, ttl, json.dumps(data))
    return data
```

**効果**:
- レスポンス時間の大幅短縮（50-90%削減）
- データベース負荷の軽減
- タイムアウトエラーの減少

---

#### 5. クエリ最適化の見直し

**確認すべきクエリ**:
1. `/api/v1/messages/conversations` - 複雑なJOINとウィンドウ関数
2. `/api/v1/posts` - 複数のフィルタとソート
3. `/api/v1/notifications/unread-count` - 集計クエリ

**対策**:
- EXPLAIN ANALYZEでクエリプランを確認
- 必要なインデックスの追加
- クエリの書き直し（不要なJOINの削除など）

**実装**:
```sql
-- パフォーマンステスト用のクエリ分析
EXPLAIN ANALYZE
SELECT * FROM conversations 
WHERE user1_id = 'xxx' OR user2_id = 'xxx'
ORDER BY updated_at DESC
LIMIT 20;
```

---

#### 6. フロントエンドの最適化

**実装内容**:

1. **リクエストのデバウンス/スロットリング**
   ```typescript
   // 同じエンドポイントへの連続リクエストを制限
   const debouncedFetch = debounce(fetchData, 500);
   ```

2. **楽観的UI更新**
   ```typescript
   // リクエスト送信後、即座にUIを更新
   // エラー時のみロールバック
   ```

3. **ページネーションの改善**
   - 無限スクロールの実装
   - 仮想スクロールの導入

**効果**:
- 不要なリクエストの削減
- ユーザー体験の向上
- サーバー負荷の軽減

---

### 🟢 優先度: 低（長期的な改善）

#### 7. CDNの導入

**対象**:
- 静的アセット（画像、CSS、JS）
- APIレスポンスのキャッシュ（可能な場合）

**効果**:
- グローバルなレスポンス時間の改善
- サーバー負荷の軽減

---

#### 8. データベース読み取りレプリカの導入

**対象**:
- 読み取り専用クエリ（フィード、検索など）

**効果**:
- メインデータベースの負荷分散
- 読み取りパフォーマンスの向上

**コスト**: 追加のCloud SQLインスタンスが必要

---

#### 9. マイクロサービス化の検討

**対象**:
- メッセージングサービス
- 通知サービス
- 投稿サービス

**効果**:
- スケーラビリティの向上
- 障害の分離
- 独立したデプロイ

**注意**: 複雑性が増加するため、十分な検討が必要

---

## 📈 実装ロードマップ

### Week 1: 即座の改善
- [ ] Cloud Runの設定最適化（最小インスタンス数）
- [ ] データベース接続プールの最適化
- [ ] 基本的なモニタリングの設定

### Week 2-3: 中期的な改善
- [ ] レスポンスキャッシングの実装
- [ ] クエリ最適化の見直し
- [ ] フロントエンドの最適化

### Month 2+: 長期的な改善
- [ ] CDNの導入検討
- [ ] データベース読み取りレプリカの検討
- [ ] アーキテクチャの見直し

---

## 🔍 モニタリング指標

### 追跡すべきメトリクス

1. **レスポンス時間**
   - P50（中央値）
   - P95（95パーセンタイル）
   - P99（99パーセンタイル）
   - 目標: P95 < 2秒、P99 < 5秒

2. **エラー率**
   - タイムアウトエラー率
   - 5xxエラー率
   - 目標: < 1%

3. **スループット**
   - リクエスト/秒
   - 同時接続数

4. **データベースメトリクス**
   - クエリ実行時間
   - 接続プール使用率
   - スロークエリ（> 1秒）

---

## 🛠️ 実装スクリプト

### Cloud Run設定更新スクリプト
```bash
#!/bin/bash
# scripts/optimize-cloud-run.sh

PROJECT_ID="circles-202510"
REGION="asia-northeast1"

echo "Optimizing Cloud Run services..."

# Backend optimization
gcloud run services update disease-community-api \
  --region=$REGION \
  --project=$PROJECT_ID \
  --min-instances=1 \
  --cpu=2 \
  --memory=2Gi \
  --timeout=300 \
  --concurrency=80

# Frontend optimization
gcloud run services update disease-community-frontend \
  --region=$REGION \
  --project=$PROJECT_ID \
  --min-instances=1 \
  --cpu=1 \
  --memory=1Gi \
  --timeout=300

echo "✅ Cloud Run optimization complete!"
```

---

## 📝 次のアクション

1. **即座に実施**: Cloud Runの最小インスタンス設定
2. **今週中**: モニタリングダッシュボードの作成
3. **来週**: データベース接続プールの最適化
4. **2週間後**: キャッシングの実装検討

---

## 📚 参考資料

- [Cloud Run パフォーマンス最適化](https://cloud.google.com/run/docs/tips/performance)
- [SQLAlchemy 接続プール設定](https://docs.sqlalchemy.org/en/20/core/pooling.html)
- [FastAPI パフォーマンス最適化](https://fastapi.tiangolo.com/advanced/performance/)

