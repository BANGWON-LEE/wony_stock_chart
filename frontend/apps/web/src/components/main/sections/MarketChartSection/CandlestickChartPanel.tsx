import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { Chart, getStockCandles } from '../../../../feat/chart'
import type { CandleRow, StockCandleInterval } from '../../../../feat/chart'

declare global {
  interface Window {
    __chartDebug?: {
      mountedAt?: string
      hasChartElement?: boolean
      lastWheelEvent?: {
        deltaX: number
        deltaY: number
      }
      lastHorizontalWheelDispatch?: {
        direction: 'left' | 'right'
        accumulatedDeltaX: number
        indexDelta: number
      }
      lastVisibleRange?: {
        direction: 'left' | 'right'
        start: number
        end: number
        candleCount: number
        triggerIndex: number
        willFetchOlder: boolean
      }
      lastOlderRequest?: {
        stockCode: string
        interval: StockCandleInterval
        cacheKey: string
        earliest: string
      }
    }
  }
}

const INITIAL_CANDLE_LIMIT = 300
const OLDER_CANDLE_LIMIT = 120
const INITIAL_VISIBLE_CANDLE_COUNT = 200
const INITIAL_MINUTE_VISIBLE_CANDLE_COUNT = 60
const OLDER_CANDLE_TRIGGER_INDEX = 70
const PAN_SLICE_STEP = 1

const CHART_INTERVAL_OPTIONS = [
  { value: '1m', label: '1분' },
  { value: '1d', label: '일봉' },
  { value: '1w', label: '주봉' },
  { value: '1mo', label: '월봉' },
  { value: '1y', label: '년봉' },
] as const

type ChartInterval = (typeof CHART_INTERVAL_OPTIONS)[number]['value']

type ChartDataCache = Record<string, Partial<Record<string, CandleRow[]>>>

type VisibleRange = {
  start: number
  end: number
}

const chartIntervalLabels = CHART_INTERVAL_OPTIONS.reduce<
  Record<ChartInterval, string>
>(
  (labels, option) => {
    labels[option.value] = option.label
    return labels
  },
  {} as Record<ChartInterval, string>,
)

function getKoreaDateString(date: Date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const year = parts.find(part => part.type === 'year')?.value ?? '1970'
  const month = parts.find(part => part.type === 'month')?.value ?? '01'
  const day = parts.find(part => part.type === 'day')?.value ?? '01'

  return `${year}-${month}-${day}`
}

function parseDateOnly(date: string) {
  const [year, month, day] = date.split('-').map(Number)

  return new Date(year, month - 1, day)
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)

  return next
}

function addYears(date: Date, years: number) {
  const next = new Date(date)
  next.setFullYear(next.getFullYear() + years)

  return next
}

function isWeekendDate(date: Date) {
  const day = date.getDay()

  return day === 0 || day === 6
}

function getPreviousBusinessDate(date: Date) {
  let previous = addDays(date, -1)

  while (isWeekendDate(previous)) {
    previous = addDays(previous, -1)
  }

  return previous
}

function getDefaultMinuteDateTime() {
  const previousBusinessDate = getPreviousBusinessDate(
    parseDateOnly(getKoreaDateString(new Date())),
  )
  previousBusinessDate.setHours(15, 30, 0, 0)

  return previousBusinessDate
}

function formatDateParam(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function formatHourParam(date: Date) {
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  const second = String(date.getSeconds()).padStart(2, '0')

  return `${hour}${minute}${second}`
}

function mergeCandles(previous: CandleRow[], older: CandleRow[]) {
  const candlesByTime = new Map<string, CandleRow>()

  for (const candle of [...older, ...previous]) {
    candlesByTime.set(candle.time, candle)
  }

  return [...candlesByTime.values()].sort(
    (left, right) => Date.parse(left.time) - Date.parse(right.time),
  )
}

function createInitialVisibleRange(
  candleCount: number,
  visibleCandleCount = INITIAL_VISIBLE_CANDLE_COUNT,
): VisibleRange {
  const safeCandleCount = Math.max(0, Math.trunc(candleCount))
  const safeVisibleCandleCount = Math.max(1, Math.trunc(visibleCandleCount))

  return {
    start: Math.max(0, safeCandleCount - safeVisibleCandleCount),
    end: safeCandleCount,
  }
}

function clampInteger(value: number, min: number, max: number) {
  const roundedValue = Number.isFinite(value) ? Math.round(value) : min

  return Math.max(min, Math.min(max, roundedValue))
}

function normalizeVisibleRange(
  range: VisibleRange,
  candleCount: number,
): VisibleRange {
  const safeCandleCount = Math.max(0, Math.trunc(candleCount))

  if (safeCandleCount === 0) {
    return {
      start: 0,
      end: 0,
    }
  }

  const fallbackRange = createInitialVisibleRange(safeCandleCount)
  const rawStart = Number.isFinite(range.start)
    ? range.start
    : fallbackRange.start
  const rawEnd = Number.isFinite(range.end) ? range.end : fallbackRange.end
  const start = clampInteger(rawStart, 0, safeCandleCount - 1)
  const end = clampInteger(rawEnd, start + 1, safeCandleCount)

  return {
    start,
    end,
  }
}

function getVisibleCount(range: VisibleRange) {
  return Math.max(Math.round(range.end) - Math.round(range.start), 1)
}

function moveVisibleRange(
  range: VisibleRange,
  indexDelta: number,
  candleCount: number,
): VisibleRange {
  if (candleCount <= 0) {
    return {
      start: 0,
      end: 0,
    }
  }

  const normalizedRange = normalizeVisibleRange(range, candleCount)
  const visibleCount = getVisibleCount(normalizedRange)
  const roundedIndexDelta = Math.trunc(indexDelta)
  const maxStart = Math.max(0, candleCount - visibleCount)
  const start = clampInteger(
    normalizedRange.start + roundedIndexDelta,
    0,
    maxStart,
  )

  return {
    start,
    end: Math.min(candleCount, start + visibleCount),
  }
}

function sliceCandlesByVisibleRange(candles: CandleRow[], range: VisibleRange) {
  const normalizedRange = normalizeVisibleRange(range, candles.length)

  return candles.slice(normalizedRange.start, normalizedRange.end)
}

function getDateParamFromTimestamp(timestamp: string) {
  const parsed = new Date(timestamp)

  if (Number.isNaN(parsed.getTime())) return null

  return formatDateParam(parsed)
}

function getPreviousRange(
  interval: Exclude<StockCandleInterval, '1m'>,
  earliestTimestamp: string,
) {
  const earliestDateParam = getDateParamFromTimestamp(earliestTimestamp)

  if (!earliestDateParam) return null

  const toDate = addDays(parseDateOnly(earliestDateParam), -1)
  let fromDate: Date

  switch (interval) {
    case '1d':
    case '1w':
      fromDate = addYears(toDate, -1)
      break
    case '1mo':
      fromDate = addYears(toDate, -5)
      break
    case '1y':
      fromDate = addYears(toDate, -20)
      break
  }

  return {
    from: formatDateParam(fromDate),
    to: formatDateParam(toDate),
  }
}

function getPreviousMinutePoint(earliestTimestamp: string) {
  const earliestDate = new Date(earliestTimestamp)

  if (Number.isNaN(earliestDate.getTime())) return null

  const previousMinute = addMinutes(earliestDate, -1)

  if (formatDateParam(previousMinute) !== formatDateParam(earliestDate)) {
    return null
  }

  return {
    date: formatDateParam(previousMinute),
    hour: formatHourParam(previousMinute),
  }
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000)
}

export default function CandlestickChartPanel(props: {
  selectedStockCode: string
}) {
  const { selectedStockCode } = props
  const intervalSelectId = useId()
  const minuteDatePickerId = useId()
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const [selectedInterval, setSelectedInterval] = useState<ChartInterval>('1d')
  const [minuteDateTime, setMinuteDateTime] = useState(getDefaultMinuteDateTime)
  const [isInitialLoading, setIsInitialLoading] = useState(false)
  const [isOlderLoading, setIsOlderLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [, setWheelDebugMessage] = useState('wheel: waiting')

  const [candlesByCode, setCandlesByCode] = useState<ChartDataCache>({})
  const [visibleRanges, setVisibleRanges] = useState<VisibleRange>({
    start: 0,
    end: 0,
  })
  const candlesByCodeRef = useRef(candlesByCode)
  const visibleRangesRef = useRef(visibleRanges)
  const selectedStockCodeRef = useRef(selectedStockCode)
  const apiIntervalRef = useRef<StockCandleInterval>('1d')
  const chartCacheKeyRef = useRef('1d')
  const isOlderLoadingRef = useRef(false)
  const requestedOlderAnchorsRef = useRef(new Set<string>())

  const apiInterval = selectedInterval

  const maxMinuteDate = useMemo(
    () =>
      getPreviousBusinessDate(parseDateOnly(getKoreaDateString(new Date()))),
    [],
  )
  const minuteDateParam = useMemo(
    () => formatDateParam(minuteDateTime),
    [minuteDateTime],
  )
  const minuteHourParam = useMemo(
    () => formatHourParam(minuteDateTime),
    [minuteDateTime],
  )
  const chartCacheKey = useMemo(() => {
    if (selectedInterval === '1m') {
      return `1m:${minuteDateParam}:${minuteHourParam}`
    }

    return selectedInterval
  }, [minuteDateParam, minuteHourParam, selectedInterval])
  const visibleChartData = useMemo(() => {
    if (!selectedStockCode) return []

    const currentCandles =
      candlesByCode[selectedStockCode]?.[chartCacheKey] ?? []

    return sliceCandlesByVisibleRange(currentCandles, visibleRanges)
  }, [candlesByCode, chartCacheKey, selectedStockCode, visibleRanges])

  useEffect(() => {
    candlesByCodeRef.current = candlesByCode
  }, [candlesByCode])

  useEffect(() => {
    visibleRangesRef.current = visibleRanges
  }, [visibleRanges])

  useEffect(() => {
    selectedStockCodeRef.current = selectedStockCode
  }, [selectedStockCode])

  useEffect(() => {
    apiIntervalRef.current = apiInterval
  }, [apiInterval])

  useEffect(() => {
    chartCacheKeyRef.current = chartCacheKey
  }, [chartCacheKey])

  useEffect(() => {
    isOlderLoadingRef.current = isOlderLoading
  }, [isOlderLoading])

  useEffect(() => {
    if (!selectedStockCode) return

    let isMounted = true

    async function fetchInitialCandles() {
      setIsInitialLoading(true)
      setErrorMessage(null)
      // setVisibleRanges({ start: 0, end: 0 })
      visibleRangesRef.current = { start: 0, end: 0 }

      try {
        const response = await getStockCandles({
          symbol: selectedStockCode,
          interval: apiInterval,
          ...(selectedInterval === '1m'
            ? {
                date: minuteDateParam,
                hour: minuteHourParam,
              }
            : {}),
          limit: INITIAL_CANDLE_LIMIT,
        })

        if (!isMounted) return

        const initialVisibleRange = createInitialVisibleRange(
          response.candles.length,
          selectedInterval === '1m'
            ? INITIAL_MINUTE_VISIBLE_CANDLE_COUNT
            : INITIAL_VISIBLE_CANDLE_COUNT,
        )

        setCandlesByCode(current => ({
          ...current,
          [selectedStockCode]: {
            ...current[selectedStockCode],
            [chartCacheKey]: response.candles,
          },
        }))
        setVisibleRanges(initialVisibleRange)
        visibleRangesRef.current = initialVisibleRange
      } catch (error) {
        if (!isMounted) return

        setErrorMessage(
          error instanceof Error
            ? error.message
            : '초기 캔들 데이터를 불러오지 못했습니다.',
        )
      } finally {
        if (isMounted) {
          setIsInitialLoading(false)
        }
      }
    }

    fetchInitialCandles()

    return () => {
      isMounted = false
    }
  }, [
    apiInterval,
    chartCacheKey,
    minuteDateParam,
    minuteHourParam,
    selectedInterval,
    selectedStockCode,
  ])

  const fetchOlderCandlesIfNeeded = useCallback(
    (params: {
      cacheKey: string
      currentCandles: CandleRow[]
      direction: 'left' | 'right'
      nextVisibleRange: VisibleRange
      requestInterval: StockCandleInterval
      stockCode: string
    }) => {
      const {
        cacheKey,
        currentCandles,
        direction,
        nextVisibleRange,
        requestInterval,
        stockCode,
      } = params
      const shouldFetchOlder =
        direction === 'left' &&
        nextVisibleRange.start <= OLDER_CANDLE_TRIGGER_INDEX &&
        !isOlderLoadingRef.current

      window.__chartDebug = {
        ...(window.__chartDebug ?? {}),
        lastVisibleRange: {
          direction,
          start: nextVisibleRange.start,
          end: nextVisibleRange.end,
          candleCount: currentCandles.length,
          triggerIndex: OLDER_CANDLE_TRIGGER_INDEX,
          willFetchOlder: shouldFetchOlder,
        },
      }
      console.log('[CandlestickChartPanel] visible slice changed', {
        direction,
        start: nextVisibleRange.start,
        end: nextVisibleRange.end,
        candleCount: currentCandles.length,
        triggerIndex: OLDER_CANDLE_TRIGGER_INDEX,
        willFetchOlder: shouldFetchOlder,
      })
      setWheelDebugMessage(
        `slice: ${nextVisibleRange.start}-${nextVisibleRange.end} / ${currentCandles.length} fetchOlder=${String(shouldFetchOlder)}`,
      )

      if (!shouldFetchOlder) {
        return
      }

      const earliestCandle = currentCandles[0]
      const earliestTime = Date.parse(earliestCandle.time)

      if (!Number.isFinite(earliestTime)) return

      const requestAnchor = `${stockCode}:${cacheKey}:${earliestCandle.time}`

      if (requestedOlderAnchorsRef.current.has(requestAnchor)) return

      async function fetchOlderCandles() {
        requestedOlderAnchorsRef.current.add(requestAnchor)
        isOlderLoadingRef.current = true
        setIsOlderLoading(true)
        setErrorMessage(null)

        try {
          const olderQuery =
            requestInterval === '1m'
              ? getPreviousMinutePoint(earliestCandle.time)
              : getPreviousRange(requestInterval, earliestCandle.time)

          if (!olderQuery) return

          console.debug('[CandlestickChartPanel] fetch older candles', {
            stockCode,
            interval: requestInterval,
            cacheKey,
            olderQuery,
            direction,
            earliest: earliestCandle.time,
          })
          window.__chartDebug = {
            ...(window.__chartDebug ?? {}),
            lastOlderRequest: {
              stockCode,
              interval: requestInterval,
              cacheKey,
              earliest: earliestCandle.time,
            },
          }
          setWheelDebugMessage(
            `fetch older: ${nextVisibleRange.start}-${nextVisibleRange.end} earliest=${earliestCandle.time}`,
          )

          const response = await getStockCandles({
            symbol: stockCode,
            interval: requestInterval,
            ...olderQuery,
            limit: OLDER_CANDLE_LIMIT,
          })

          if (response.candles.length === 0) return

          const visibleCount = getVisibleCount(nextVisibleRange)
          const currentCandlesBeforeMerge =
            candlesByCodeRef.current[stockCode]?.[cacheKey] ?? []
          const mergedCandles = mergeCandles(
            currentCandlesBeforeMerge,
            response.candles,
          )
          const prependedCount = Math.max(
            0,
            mergedCandles.length - currentCandlesBeforeMerge.length,
          )

          setCandlesByCode(current => ({
            ...current,
            [stockCode]: {
              ...current[stockCode],
              [cacheKey]: mergedCandles,
            },
          }))
          candlesByCodeRef.current = {
            ...candlesByCodeRef.current,
            [stockCode]: {
              ...candlesByCodeRef.current[stockCode],
              [cacheKey]: mergedCandles,
            },
          }
          const visibleRangeAfterPrepend = normalizeVisibleRange(
            {
              start: nextVisibleRange.start + prependedCount,
              end: nextVisibleRange.start + prependedCount + visibleCount,
            },
            mergedCandles.length,
          )
          setVisibleRanges(visibleRangeAfterPrepend)
          visibleRangesRef.current = visibleRangeAfterPrepend
        } catch (error) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : '과거 캔들 데이터를 불러오지 못했습니다.',
          )
        } finally {
          isOlderLoadingRef.current = false
          setIsOlderLoading(false)
        }
      }

      fetchOlderCandles()
    },
    [],
  )

  useEffect(() => {
    const chartElement = chartContainerRef.current
    console.log('chartContainerRef', chartContainerRef.current)

    let accumulatedWheelDelta = 0
    const horizontalWheelThreshold = 18

    console.log('[CandlestickChartPanel] chart wheel ref mounted', {
      hasChartElement: Boolean(chartElement),
    })
    setWheelDebugMessage(
      `wheel: mounted=${String(Boolean(chartElement))} ${new Date().toLocaleTimeString()}`,
    )
    window.__chartDebug = {
      ...(window.__chartDebug ?? {}),
      mountedAt: new Date().toISOString(),
      hasChartElement: Boolean(chartElement),
    }

    if (!chartElement) return undefined

    function handleWheel(event: WheelEvent) {
      const wheelDelta =
        Math.abs(event.deltaX) > Math.abs(event.deltaY)
          ? event.deltaX
          : event.deltaY
      window.__chartDebug = {
        ...(window.__chartDebug ?? {}),
        lastWheelEvent: {
          deltaX: event.deltaX,
          deltaY: event.deltaY,
        },
      }
      setWheelDebugMessage(
        `wheel: delta=${wheelDelta.toFixed(1)} deltaX=${event.deltaX.toFixed(1)} deltaY=${event.deltaY.toFixed(1)}`,
      )
      console.log('[CandlestickChartPanel] wheel event', {
        delta: wheelDelta,
        deltaX: event.deltaX,
        deltaY: event.deltaY,
        target: event.target,
      })

      if (wheelDelta === 0) {
        return
      }

      event.preventDefault()
      accumulatedWheelDelta += wheelDelta

      if (Math.abs(accumulatedWheelDelta) < horizontalWheelThreshold) {
        console.log('[CandlestickChartPanel] wheel below threshold', {
          accumulatedWheelDelta,
          horizontalWheelThreshold,
        })
        setWheelDebugMessage(
          `wheel: accumulating ${accumulatedWheelDelta.toFixed(1)} / ${horizontalWheelThreshold} range=${visibleRangesRef.current.start}-${visibleRangesRef.current.end}`,
        )
        return
      }

      const wheelStepCount = Math.trunc(
        accumulatedWheelDelta / horizontalWheelThreshold,
      )
      const indexDelta = wheelStepCount * PAN_SLICE_STEP
      const direction = indexDelta < 0 ? 'left' : 'right'
      const stockCode = selectedStockCodeRef.current
      const requestInterval = apiIntervalRef.current
      const cacheKey = chartCacheKeyRef.current

      window.__chartDebug = {
        ...(window.__chartDebug ?? {}),
        lastHorizontalWheelDispatch: {
          direction,
          accumulatedDeltaX: accumulatedWheelDelta,
          indexDelta,
        },
      }
      console.log('[CandlestickChartPanel] horizontal wheel dispatch', {
        direction,
        accumulatedWheelDelta,
        indexDelta,
      })
      setWheelDebugMessage(
        `wheel: ${direction} delta=${accumulatedWheelDelta.toFixed(1)} range=${visibleRangesRef.current.start}-${visibleRangesRef.current.end}`,
      )
      accumulatedWheelDelta -= wheelStepCount * horizontalWheelThreshold

      if (!stockCode) {
        return
      }

      const currentCandles =
        candlesByCodeRef.current[stockCode]?.[cacheKey] ?? []
      if (currentCandles.length === 0) return

      const currentVisibleRange = normalizeVisibleRange(
        visibleRangesRef.current,
        currentCandles.length,
      )
      const nextVisibleRange = moveVisibleRange(
        currentVisibleRange,
        indexDelta,
        currentCandles.length,
      )

      setVisibleRanges(nextVisibleRange)
      visibleRangesRef.current = nextVisibleRange
      fetchOlderCandlesIfNeeded({
        cacheKey,
        currentCandles,
        direction,
        nextVisibleRange,
        requestInterval,
        stockCode,
      })
    }

    chartElement.addEventListener('wheel', handleWheel, { passive: false })

    return () => {
      chartElement.removeEventListener('wheel', handleWheel)
    }
  }, [fetchOlderCandlesIfNeeded])

  return (
    <div className="min-w-0 rounded-lg border border-[#e5e8eb] bg-white p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-left">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="m-0 text-lg font-extrabold leading-[1.3] text-[#191f28]">
              종목 차트
            </h3>
            <span className="rounded-full bg-[#f2f4f6] px-2.5 py-1 text-xs font-bold text-[#4e5968]">
              {chartIntervalLabels[selectedInterval]}
            </span>
          </div>
          <p className="mt-1 text-sm font-semibold text-[#8b95a1]">
            {selectedStockCode}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {selectedInterval === '1m' ? (
            <div className="flex items-center gap-2">
              <label
                className="text-sm font-bold text-[#4e5968]"
                htmlFor={minuteDatePickerId}
              >
                조회 시각
              </label>
              <DatePicker
                className="h-10 w-[168px] rounded-md border border-[#d1d6db] bg-white px-3 text-sm font-extrabold text-[#191f28] outline-none transition focus:border-[#3182f6] focus:ring-2 focus:ring-[#3182f6]/20"
                dateFormat="yyyy-MM-dd HH:mm"
                id={minuteDatePickerId}
                filterDate={date => !isWeekendDate(date)}
                maxDate={maxMinuteDate}
                onChange={(date: Date | null) => {
                  if (date) setMinuteDateTime(date)
                }}
                selected={minuteDateTime}
                showTimeSelect
                timeFormat="HH:mm"
                timeIntervals={1}
              />
            </div>
          ) : null}
          <label
            className="text-sm font-bold text-[#4e5968]"
            htmlFor={intervalSelectId}
          >
            기간
          </label>
          <div className="relative">
            <select
              aria-label="차트 기간 선택"
              className="h-10 min-w-[116px] cursor-pointer appearance-none rounded-md border border-[#d1d6db] bg-white py-0 pl-3.5 pr-9 text-sm font-extrabold text-[#191f28] outline-none transition focus:border-[#3182f6] focus:ring-2 focus:ring-[#3182f6]/20"
              id={intervalSelectId}
              onChange={event =>
                setSelectedInterval(event.target.value as ChartInterval)
              }
              value={selectedInterval}
            >
              {CHART_INTERVAL_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <span
              aria-hidden="true"
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-[#6b7684]"
            >
              ▼
            </span>
          </div>
        </div>
      </div>
      <Chart
        className="h-[420px] max-[960px]:h-[340px]"
        containerRef={chartContainerRef}
        data={visibleChartData}
        options={{
          maxTicksLimit: 6,
          title: errorMessage
            ? '초기 캔들 데이터 로드 실패'
            : isInitialLoading || isOlderLoading
              ? isOlderLoading
                ? '과거 캔들 데이터 로딩 중'
                : '초기 캔들 데이터 로딩 중'
              : `${chartIntervalLabels[selectedInterval]} 캔들 차트`,
          xTickFormat: 'monthYear',
          xTimeUnit: 'month',
        }}
        timePropertyName="time"
        type="candlestick"
      />
    </div>
  )
}
