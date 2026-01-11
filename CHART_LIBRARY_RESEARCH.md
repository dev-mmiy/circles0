# チャートライブラリのX軸ドラッグ移動機能に関する調査結果

## 調査日
2024年（現在）

## 現在使用中のライブラリ
- **Recharts v2.13.0** (React向けチャートライブラリ)

## 1. RechartsでのX軸ドラッグ移動機能の可否

### 調査結果
**Rechartsは標準でX軸のドラッグ移動（パン）機能をサポートしていません。**

- Rechartsは主に静的または基本的なインタラクション（ツールチップ、凡例クリックなど）に焦点を当てたライブラリです
- 公式ドキュメントには、パンやドラッグによるX軸スクロール機能の記載は見当たりません
- GitHubのissueでも、パン/ズーム機能の要望は多数ありますが、公式の実装はされていません

### 代替手段（Rechartsを使用し続ける場合）
1. **カスタム実装**: マウスイベントを手動で処理し、データ範囲を動的に変更する方法
   - 実装が複雑
   - パフォーマンスの問題が発生する可能性
   - メンテナンスコストが高い

2. **外部ライブラリとの組み合わせ**: react-draggableなどのドラッグライブラリと組み合わせる
   - チャート全体の再実装が必要
   - スムーズな動作が保証されない

## 2. X軸ドラッグ移動をサポートする代替チャートライブラリ

### A. Chart.js + chartjs-plugin-zoom
**推奨度: ⭐⭐⭐⭐⭐**

- **ライブラリ**: `react-chartjs-2` + `chartjs-plugin-zoom`
- **特徴**:
  - パン（ドラッグ移動）とズーム機能を標準サポート
  - 軽量でパフォーマンスが良い
  - 豊富なドキュメントとコミュニティサポート
  - Reactとの統合が容易
- **実装例**:
  ```javascript
  import { Chart } from 'chart.js';
  import zoomPlugin from 'chartjs-plugin-zoom';
  
  Chart.register(zoomPlugin);
  
  // オプション設定
  options: {
    plugins: {
      zoom: {
        pan: {
          enabled: true,
          mode: 'x'
        },
        zoom: {
          wheel: {
            enabled: true,
          },
          pinch: {
            enabled: true
          },
          mode: 'x'
        }
      }
    }
  }
  ```
- **メリット**:
  - 実装が比較的簡単
  - スムーズなドラッグ操作
  - モバイル対応（ピンチズーム）
- **デメリット**:
  - Rechartsからの移行が必要
  - 既存のチャートコンポーネントの書き換えが必要

### B. TradingView Lightweight Charts
**推奨度: ⭐⭐⭐⭐**

- **ライブラリ**: `lightweight-charts`
- **特徴**:
  - 金融チャートに特化した高性能ライブラリ
  - パンとズームを標準サポート
  - 非常に軽量で高速
  - 時系列データに最適化
- **実装例**:
  ```javascript
  import { createChart } from 'lightweight-charts';
  
  const chart = createChart(containerRef.current, {
    width: 800,
    height: 400,
    timeScale: {
      timeVisible: true,
      secondsVisible: false,
    },
  });
  
  // パンとズームはデフォルトで有効
  ```
- **メリット**:
  - 時系列データに最適
  - 非常に高速
  - パン/ズームが標準機能
- **デメリット**:
  - Reactラッパーが公式に提供されていない（コミュニティ製あり）
  - 金融チャート向けのUI（カスタマイズが必要な場合あり）

### C. Plotly.js
**推奨度: ⭐⭐⭐**

- **ライブラリ**: `react-plotly.js`
- **特徴**:
  - 非常に高機能なインタラクティブチャート
  - パン、ズーム、選択など豊富な機能
  - 3Dチャートもサポート
- **実装例**:
  ```javascript
  <Plot
    data={data}
    layout={{
      xaxis: {
        rangeslider: {},
        type: 'date'
      },
      dragmode: 'pan' // パンモード
    }}
  />
  ```
- **メリット**:
  - 非常に高機能
  - 豊富なインタラクション
- **デメリット**:
  - バンドルサイズが大きい
  - 学習曲線がやや高い

### D. Victory.js
**推奨度: ⭐⭐**

- **ライブラリ**: `victory`
- **特徴**:
  - React向けのチャートライブラリ
  - アニメーション機能が豊富
- **調査結果**:
  - パン機能は標準ではサポートされていない
  - カスタム実装が必要

### E. Nivo
**推奨度: ⭐⭐**

- **ライブラリ**: `@nivo/core`, `@nivo/line`
- **特徴**:
  - React向けのチャートライブラリ
  - 美しいデザイン
- **調査結果**:
  - パン機能は標準ではサポートされていない
  - カスタム実装が必要

### F. Visx (旧 vx)
**推奨度: ⭐⭐⭐**

- **ライブラリ**: `@visx/visx`
- **特徴**:
  - D3.jsベースのReact向けチャートライブラリ
  - 低レベルAPIで柔軟性が高い
- **調査結果**:
  - パン機能は標準ではサポートされていない
  - カスタム実装が必要（ただし柔軟性が高いため実装可能）

## 3. 推奨事項

### 最優先候補: Chart.js + chartjs-plugin-zoom
1. **理由**:
   - X軸のパン機能が標準でサポートされている
   - Reactとの統合が容易（react-chartjs-2）
   - 軽量でパフォーマンスが良い
   - 豊富なドキュメントとコミュニティサポート
   - 既存のRechartsのコードとの類似性が高い（移行が比較的容易）

2. **移行の考慮事項**:
   - 既存のVitalChartsコンポーネントの書き換えが必要
   - データ構造の調整が必要な場合がある
   - スタイリングの調整が必要

### 次点候補: TradingView Lightweight Charts
1. **理由**:
   - 時系列データに最適化されている
   - パン/ズームが標準機能
   - 非常に高速
   - ただし、Reactラッパーが公式ではない

2. **移行の考慮事項**:
   - Reactラッパーの使用またはカスタムラッパーの作成が必要
   - UIのカスタマイズが必要な場合がある

## 4. 実装の複雑度比較

| ライブラリ | パン機能 | 実装の容易さ | 移行コスト | パフォーマンス |
|-----------|---------|------------|-----------|--------------|
| Recharts | ❌ なし | - | - | ⭐⭐⭐ |
| Chart.js + zoom | ✅ あり | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| TradingView | ✅ あり | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| Plotly.js | ✅ あり | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ |
| Victory.js | ❌ なし | - | - | ⭐⭐⭐ |
| Nivo | ❌ なし | - | - | ⭐⭐⭐ |
| Visx | ❌ なし | - | - | ⭐⭐⭐⭐ |

## 5. 次のステップ（実装時）

1. **Chart.js + chartjs-plugin-zoomの検証**
   - サンプル実装を作成
   - 既存のデータ構造との互換性確認
   - パフォーマンステスト

2. **段階的な移行計画**
   - 1つのチャートタイプ（例：体重チャート）で試行
   - 問題がなければ他のチャートタイプにも展開

3. **ユーザビリティテスト**
   - ドラッグ操作のスムーズさ
   - モバイルデバイスでの動作確認

## 6. 参考リンク

- [Chart.js Zoom Plugin Documentation](https://www.chartjs.org/chartjs-plugin-zoom/latest/)
- [TradingView Lightweight Charts](https://www.tradingview.com/lightweight-charts/)
- [Plotly.js Documentation](https://plotly.com/javascript/)
- [Recharts GitHub Issues - Pan/Zoom Feature Requests](https://github.com/recharts/recharts/issues?q=pan+zoom)
