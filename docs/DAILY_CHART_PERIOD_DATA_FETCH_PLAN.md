# Dailyチャート表示期間変更時のデータ取得実装プラン

## 概要
dailyページのチャートで表示期間（固定期間：1週間、1か月、6か月、1年、またはズームによる任意の期間）を変更したときに、その期間に合わせてデータを取得し直すようにする。

## 現状の問題
- 現在は全てのデータを取得してからクライアント側でフィルタリングしている
- 表示期間を変更しても、データの再取得が行われない
- 長期間のデータを全て取得するため、パフォーマンスの問題がある可能性
- ズームなどで任意の期間を表示した場合でも、その期間のデータのみを取得する必要がある

## 実装プラン

### 1. バックエンドAPIの拡張

#### 1.1 各バイタル記録APIエンドポイントに日付範囲パラメータを追加

対象エンドポイント：
- `/api/v1/blood-pressure-records` (GET)
- `/api/v1/heart-rate-records` (GET)
- `/api/v1/temperature-records` (GET)
- `/api/v1/weight-records` (GET)
- `/api/v1/body-fat-records` (GET)
- `/api/v1/blood-glucose-records` (GET)
- `/api/v1/spo2-records` (GET)

追加するパラメータ：
- `start_date` (Optional[datetime]): 開始日時（ISO 8601形式）
- `end_date` (Optional[datetime]): 終了日時（ISO 8601形式）

#### 1.2 サービス層の拡張

各サービス（例：`BloodPressureRecordService`）の`get_user_records`メソッドに日付範囲フィルタを追加：

```python
@staticmethod
def get_user_records(
    db: Session,
    user_id: UUID,
    skip: int = 0,
    limit: int = 20,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
) -> List[BloodPressureRecord]:
    """Get blood pressure records for a specific user."""
    query = db.query(BloodPressureRecord).filter(
        BloodPressureRecord.user_id == user_id
    )
    
    # 日付範囲フィルタを追加
    if start_date:
        query = query.filter(BloodPressureRecord.recorded_at >= start_date)
    if end_date:
        query = query.filter(BloodPressureRecord.recorded_at <= end_date)
    
    return (
        query
        .order_by(desc(BloodPressureRecord.recorded_at))
        .offset(skip)
        .limit(limit)
        .all()
    )
```

#### 1.3 APIルーターの更新

各APIルーターで日付範囲パラメータを受け取り、サービスに渡す：

```python
@router.get("", ...)
async def get_my_blood_pressure_records(
    skip: int = Query(0, ge=0, ...),
    limit: int = Query(20, ge=1, le=100, ...),
    start_date: Optional[datetime] = Query(None, description="Start date (ISO 8601)"),
    end_date: Optional[datetime] = Query(None, description="End date (ISO 8601)"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Get blood pressure records for the current user."""
    user_id = get_user_id_from_token(db, current_user)
    records = BloodPressureRecordService.get_user_records(
        db, user_id, skip, limit, start_date, end_date
    )
    return records
```

### 2. フロントエンドAPI関数の拡張

各API関数（例：`getBloodPressureRecords`）に日付範囲パラメータを追加：

```typescript
export async function getBloodPressureRecords(
  skip: number = 0,
  limit: number = 20,
  accessToken: string,
  startDate?: Date,
  endDate?: Date
): Promise<BloodPressureRecord[]> {
  const queryParams = new URLSearchParams();
  queryParams.append('skip', skip.toString());
  queryParams.append('limit', limit.toString());
  
  // 日付範囲パラメータを追加
  if (startDate) {
    queryParams.append('start_date', startDate.toISOString());
  }
  if (endDate) {
    queryParams.append('end_date', endDate.toISOString());
  }
  
  const url = `${apiClient}/api/v1/blood-pressure-records?${queryParams.toString()}`;
  // ... 既存の実装
}
```

対象ファイル：
- `frontend/lib/api/bloodPressureRecords.ts`
- `frontend/lib/api/heartRateRecords.ts`
- `frontend/lib/api/temperatureRecords.ts`
- `frontend/lib/api/weightRecords.ts`
- `frontend/lib/api/bodyFatRecords.ts`
- `frontend/lib/api/bloodGlucoseRecords.ts`
- `frontend/lib/api/spo2Records.ts`

### 3. daily/page.tsxの更新

#### 3.1 チャートの実際の表示日付範囲の取得

`VitalCharts`コンポーネント内で計算される実際の表示日付範囲（`zoomedDateRange`が設定されている場合はそれ、そうでない場合は`dateRange`）を親コンポーネント（`daily/page.tsx`）に通知する必要がある。

**方法**: `VitalCharts`コンポーネントに`onDateRangeChange`コールバックを追加し、実際の表示日付範囲が変更されたときに親に通知する。

```typescript
// VitalCharts.tsx
interface VitalChartsProps {
  // ... 既存のprops
  onDateRangeChange?: (dateRange: { startDate: Date; endDate: Date }) => void;
}

export default function VitalCharts({
  // ... 既存のprops
  onDateRangeChange,
}: VitalChartsProps) {
  const [weekOffset, setWeekOffset] = useState(0);
  const dateRange = useChartDateRange(period, weekOffset);
  
  // 実際の表示日付範囲を決定（zoomedDateRangeが優先）
  const effectiveDateRange = useMemo(() => {
    return zoomedDateRange || dateRange;
  }, [zoomedDateRange, dateRange]);
  
  // 日付範囲が変更されたときに親に通知
  useEffect(() => {
    if (onDateRangeChange) {
      onDateRangeChange(effectiveDateRange);
    }
  }, [effectiveDateRange, onDateRangeChange]);
  
  // ... 既存の実装
}
```

#### 3.2 daily/page.tsxで日付範囲を受け取る

`daily/page.tsx`で`VitalCharts`から通知される日付範囲を状態として保持する：

```typescript
// daily/page.tsx
const [chartDateRange, setChartDateRange] = useState<{ startDate: Date; endDate: Date } | null>(null);

// VitalChartsコンポーネントにonDateRangeChangeを渡す
<VitalCharts
  // ... 既存のprops
  onDateRangeChange={(dateRange) => {
    console.log('[DailyPage] Chart date range changed:', {
      startDate: dateRange.startDate.toISOString(),
      endDate: dateRange.endDate.toISOString(),
    });
    setChartDateRange(dateRange);
  }}
/>
```

#### 3.3 useDataLoaderのloadFnを更新

各`useDataLoader`の`loadFn`を、`chartDateRange`を使用するように更新：

```typescript
// 実際に使用する日付範囲を決定
// chartDateRangeが設定されている場合はそれを使用、そうでない場合は初期値として現在の期間を計算
const effectiveDateRange = useMemo(() => {
  if (chartDateRange) {
    return chartDateRange;
  }
  // 初期値としてchartPeriodに基づく範囲を計算
  return useChartDateRange(chartPeriod, 0);
}, [chartDateRange, chartPeriod]);

const {
  items: bloodPressureRecords = [],
  isLoading: isLoadingBP,
  refresh: refreshBP,
} = useDataLoader<BloodPressureRecord>({
  loadFn: useCallback(
    async (skip, limit) => {
      if (!isAuthenticated || !user) {
        throw new Error('Authentication required');
      }
      const token = await getAccessTokenSilently();
      
      // effectiveDateRangeが設定されている場合のみ日付範囲でフィルタ
      const items = await getBloodPressureRecords(
        skip,
        limit,
        token,
        effectiveDateRange?.startDate,
        effectiveDateRange?.endDate
      );
      return { items };
    },
    [isAuthenticated, user, getAccessTokenSilently, effectiveDateRange]
  ),
  pageSize: 100,
  autoLoad: false,
});
```

#### 3.4 日付範囲変更時のデータ再取得

`chartDateRange`が変更されたときに、すべてのデータを再取得する：

```typescript
// chartDateRangeが変更されたときにデータを再取得
useEffect(() => {
  if (!isAuthenticated || authLoading || !chartDateRange) {
    return;
  }
  
  // すべてのデータを再取得
  const refreshAllData = async () => {
    console.log('[DailyPage] Refreshing data for date range:', {
      startDate: chartDateRange.startDate.toISOString(),
      endDate: chartDateRange.endDate.toISOString(),
    });
    
    if (refreshBPRef.current) await refreshBPRef.current();
    if (refreshHRRef.current) await refreshHRRef.current();
    if (refreshTempRef.current) await refreshTempRef.current();
    if (refreshWeightRef.current) await refreshWeightRef.current();
    if (refreshBodyFatRef.current) await refreshBodyFatRef.current();
    if (refreshBGRef.current) await refreshBGRef.current();
    if (refreshSpO2Ref.current) await refreshSpO2Ref.current();
  };
  
  refreshAllData();
}, [chartDateRange, isAuthenticated, authLoading]);
```

#### 3.5 初期表示時の日付範囲設定

チャートが初めて表示される際に、初期の日付範囲を設定する：

```typescript
// chartPeriodが変更されたときに、初期の日付範囲を計算
useEffect(() => {
  if (viewMode === 'chart') {
    const initialDateRange = useChartDateRange(chartPeriod, 0);
    setChartDateRange(initialDateRange);
  }
}, [chartPeriod, viewMode]);
```

**注意**: `useChartDateRange`はフックなので、`useEffect`内で直接使用できない。代わりに、`useMemo`で計算する：

```typescript
// 初期日付範囲を計算
const initialDateRange = useMemo(() => {
  return useChartDateRange(chartPeriod, 0);
}, [chartPeriod]);

// 初期表示時に日付範囲を設定
useEffect(() => {
  if (viewMode === 'chart' && !chartDateRange) {
    setChartDateRange(initialDateRange);
  }
}, [viewMode, chartDateRange, initialDateRange]);
```

### 4. 実装の順序

1. **バックエンドAPIの拡張**（優先度：高）
   - サービス層の更新
   - APIルーターの更新
   - テスト

2. **フロントエンドAPI関数の拡張**（優先度：高）
   - 各API関数に日付範囲パラメータを追加
   - テスト

3. **daily/page.tsxの更新**（優先度：高）
   - 日付範囲の計算ロジックを追加
   - useDataLoaderのloadFnを更新
   - chartPeriod変更時のデータ再取得を実装

### 5. 考慮事項

#### 5.1 パフォーマンス
- 日付範囲を指定することで、不要なデータの取得を避けられる
- データベースクエリの効率化が期待できる

#### 5.2 既存機能への影響
- `zoomedDateRange`機能は維持する
- `zoomedDateRange`が設定されている場合は、その範囲でデータを取得
- `zoomedDateRange`が`null`の場合は、`chartPeriod`と`weekOffset`に基づく範囲を使用
- ズームやパンによる任意の期間の表示にも対応
- チャートの矢印ボタンによる期間移動（`weekOffset`変更）にも対応

#### 5.3 エラーハンドリング
- 日付範囲が無効な場合のエラーハンドリング
- APIエラーの適切な処理

#### 5.4 テスト
- バックエンドAPIのテスト（日付範囲フィルタの動作確認）
- フロントエンドのテスト（期間変更時のデータ取得確認）

## 実装チェックリスト

### バックエンド
- [ ] `BloodPressureRecordService.get_user_records`に日付範囲パラメータを追加
- [ ] `HeartRateRecordService.get_user_records`に日付範囲パラメータを追加
- [ ] `TemperatureRecordService.get_user_records`に日付範囲パラメータを追加
- [ ] `WeightRecordService.get_user_records`に日付範囲パラメータを追加
- [ ] `BodyFatRecordService.get_user_records`に日付範囲パラメータを追加
- [ ] `BloodGlucoseRecordService.get_user_records`に日付範囲パラメータを追加
- [ ] `SpO2RecordService.get_user_records`に日付範囲パラメータを追加
- [ ] 各APIルーターに日付範囲パラメータを追加
- [ ] バックエンドのテスト

### フロントエンド
- [ ] `getBloodPressureRecords`に日付範囲パラメータを追加
- [ ] `getHeartRateRecords`に日付範囲パラメータを追加
- [ ] `getTemperatureRecords`に日付範囲パラメータを追加
- [ ] `getWeightRecords`に日付範囲パラメータを追加
- [ ] `getBodyFatRecords`に日付範囲パラメータを追加
- [ ] `getBloodGlucoseRecords`に日付範囲パラメータを追加
- [ ] `getSpO2Records`に日付範囲パラメータを追加
- [ ] `VitalCharts.tsx`に`onDateRangeChange`コールバックを追加
- [ ] `VitalCharts.tsx`で実際の表示日付範囲を計算し、親に通知
- [ ] `daily/page.tsx`で`chartDateRange`状態を追加
- [ ] `daily/page.tsx`で`VitalCharts`から日付範囲を受け取る
- [ ] `daily/page.tsx`で`useDataLoader`の`loadFn`を更新（日付範囲を使用）
- [ ] `daily/page.tsx`で`chartDateRange`変更時のデータ再取得を実装
- [ ] 初期表示時の日付範囲設定を実装
- [ ] フロントエンドのテスト
