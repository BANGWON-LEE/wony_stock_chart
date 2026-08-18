# 캔들 차트 패널 구현 기록 v0

## 범위

- 메인 파일: `frontend/apps/web/src/components/main/sections/MarketChartSection/CandlestickChartPanel.tsx`
- 공통 차트 렌더러 관련 파일:
  - `frontend/apps/web/src/feat/chart/components/ChartRenderer.tsx`
  - `frontend/apps/web/src/feat/chart/components/CandlestickChart.tsx`
  - `frontend/apps/web/src/feat/chart/options/chartOptions.ts`
  - `frontend/apps/web/src/feat/chart/types/chart.types.ts`

이 문서는 시장 캔들 차트를 만들면서 어떤 실수를 했고, 어떤 구조로 해결했는지 기록하기 위한 문서다.

## 처음 실수한 부분

처음에는 wheel 이벤트에서 찍히는 값에 집중했다.

```ts
deltaX: event.deltaX
deltaY: event.deltaY
```

이 접근이 잘못됐던 이유는 `deltaX`, `deltaY`는 사용자가 휠이나 트랙패드를 얼마나 움직였는지만 알려주는 입력값이기 때문이다. 이 값 자체는 차트가 현재 어떤 데이터 범위를 보고 있는지와 직접적인 관계가 없다.

그래서 wheel 이벤트 로그는 정상적으로 찍혔지만, 실제 차트의 데이터 범위는 의도한 대로 바뀌지 않았다. 문제의 핵심은 wheel 좌표가 아니라 `전체 캔들 데이터 중 몇 번째부터 몇 번째까지 보여줄 것인가`였다.

또 다른 실수는 `visibleChartData`를 직접 state나 ref로 관리하려고 한 점이다. 이 방식은 다음 문제를 만들었다.

- 초기값이 없어서 `undefined`가 나옴
- native wheel 이벤트 핸들러 안에서 오래된 React state 값을 보는 stale closure 문제가 생김
- 실제 기준 상태가 `visibleChartData`인지 `visibleRanges`인지 흐려짐

결론적으로 `visibleChartData`를 직접 관리하는 것보다, 현재 범위만 상태로 들고 있고 렌더링 시점에 데이터를 계산하는 구조가 더 단순했다.

## 현재 구조

현재 차트는 세 가지를 분리해서 관리한다.

```ts
const [candlesByCode, setCandlesByCode] = useState<ChartDataCache>({})
const [visibleRanges, setVisibleRanges] = useState<VisibleRange>({
  start: 0,
  end: 0,
})
```

`candlesByCode`는 원본 캔들 데이터 캐시다.

`visibleRanges`는 현재 화면에 보여줄 인덱스 범위다.

```ts
type VisibleRange = {
  start: number
  end: number
}
```

실제 차트에 넘기는 데이터는 `useMemo`로 계산한다.

```ts
const visibleChartData = useMemo(() => {
  if (!selectedStockCode) return []

  const currentCandles =
    candlesByCode[selectedStockCode]?.[chartCacheKey] ?? []

  return sliceCandlesByVisibleRange(currentCandles, visibleRanges)
}, [candlesByCode, chartCacheKey, selectedStockCode, visibleRanges])
```

데이터 흐름은 다음과 같다.

1. API에서 캔들 데이터를 받아 `candlesByCode`에 저장한다.
2. 현재 화면 범위는 `visibleRanges.start`, `visibleRanges.end`로 저장한다.
3. `visibleChartData`는 `candlesByCode`와 `visibleRanges`를 기준으로 계산한다.
4. 계산된 `visibleChartData`를 `Chart` 컴포넌트에 넘긴다.

## Wheel Pan 처리

wheel 이벤트가 발생하면 차트 데이터를 직접 바꾸지 않는다. 대신 현재 보여줄 범위만 바꾼다.

```ts
const nextVisibleRange = moveVisibleRange(
  currentVisibleRange,
  indexDelta,
  currentCandles.length,
)

setVisibleRanges(nextVisibleRange)
visibleRangesRef.current = nextVisibleRange
```

`visibleRangesRef`를 같이 쓰는 이유는 native `wheel` 이벤트 핸들러가 React state의 최신 값을 항상 바로 보장하지 않기 때문이다. ref에는 최신 range를 직접 넣어두고, wheel 핸들러는 그 값을 기준으로 계산한다.

pan 이동량은 이 상수로 조절한다.

```ts
const PAN_SLICE_STEP = 1
```

wheel 입력을 어느 정도 모았다가 이동할지는 wheel effect 안의 threshold가 결정한다.

```ts
const horizontalWheelThreshold = 18
```

`PAN_SLICE_STEP`이 작을수록 한 번에 이동하는 캔들 수가 줄어든다. 지금은 `1`이라 한 번에 한 캔들씩 이동한다.

다만 현재 방식은 캔버스를 픽셀 단위로 부드럽게 밀어내는 방식이 아니라, `start/end` 범위를 바꿔서 slice된 데이터를 다시 그리는 방식이다. 그래서 토스 차트처럼 완전히 부드러운 pan과는 구조적으로 차이가 있다.

## 초기 Slice 개수

기본 초기 표시 개수는 200개다.

```ts
const INITIAL_VISIBLE_CANDLE_COUNT = 200
```

1분봉은 더 좁게 60개만 보여준다.

```ts
const INITIAL_MINUTE_VISIBLE_CANDLE_COUNT = 60
```

초기 range 생성 시 1분봉 여부에 따라 다른 개수를 넘긴다.

```ts
const initialVisibleRange = createInitialVisibleRange(
  response.candles.length,
  selectedInterval === '1m'
    ? INITIAL_MINUTE_VISIBLE_CANDLE_COUNT
    : INITIAL_VISIBLE_CANDLE_COUNT,
)
```

## 실시간 드롭다운 제거

처음에는 드롭다운에 `실시간` 옵션이 있었다.

이후 요구사항에 맞춰 `실시간` 옵션을 제거했다.

현재 드롭다운 옵션은 다음과 같다.

```ts
const CHART_INTERVAL_OPTIONS = [
  { value: '1m', label: '1분' },
  { value: '1d', label: '일봉' },
  { value: '1w', label: '주봉' },
  { value: '1mo', label: '월봉' },
  { value: '1y', label: '년봉' },
] as const
```

드롭다운에서 실시간이 없어졌기 때문에 `CandlestickChartPanel.tsx` 안의 실시간 WebSocket 차트 갱신 코드도 제거했다.

## X축 포맷

캔들 차트의 x축은 월 단위로 고정했다.

```ts
options={{
  xTickFormat: 'monthYear',
  xTimeUnit: 'month',
}}
```

렌더링 규칙은 다음과 같다.

- tick 단위는 월이다.
- 일반 월은 `2월`, `3월`처럼 표시한다.
- 1월은 `1월` 대신 해당 연도를 표시한다. 예: `2027년`

이렇게 한 이유는 차트 범위가 바뀔 때 x축이 일/시간 단위로 자동 변경되지 않게 하기 위해서다.

## Y축

중간에 y축 최소값을 0으로 고정하기 위해 `yMin: 0`을 추가했었다.

하지만 이후 요구사항에 따라 캔들 차트 패널에서는 `yMin: 0`을 제거했다.

공통 차트 옵션에는 아직 `yMin?: number` 지원이 남아 있지만, 현재 캔들 차트 패널은 이 값을 넘기지 않는다. 따라서 Chart.js가 y축 최소값을 자동으로 계산한다.

## 검증 방법

`frontend` 디렉터리에서 실행한다.

```bash
pnpm --filter @chart/web build
```

기대 결과:

- TypeScript 빌드가 통과한다.
- Vite production build가 완료된다.

