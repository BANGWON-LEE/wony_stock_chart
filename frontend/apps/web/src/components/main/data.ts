export const navItems = ['홈', '주식 골라보기']

export const indexItems = [
  { name: '코스피', value: '3,312.48', change: '+1.24%' },
  { name: '나스닥', value: '18,942.11', change: '+0.68%' },
  { name: 'S&P 500', value: '5,812.36', change: '-0.12%' },
]

export const filterItems = [
  '전체',
  '국내',
  '해외',
  '거래대금',
  '거래량',
  '급상승',
  '급하락',
]

export const candlestickData = [
  { time: '2026-07-01', open: 120, high: 132, low: 116, close: 128 },
  { time: '2026-07-02', open: 128, high: 134, low: 121, close: 124 },
  { time: '2026-07-03', open: 124, high: 142, low: 123, close: 138 },
  { time: '2026-07-04', open: 138, high: 146, low: 135, close: 141 },
  { time: '2026-07-05', open: 141, high: 149, low: 137, close: 145 },
  { time: '2026-07-06', open: 145, high: 152, low: 140, close: 143 },
]

export const risingStocks = [
  {
    name: '삼성전자',
    price: '92,400원',
    change: '+3.82%',
    trend: [88.1, 88.8, 89.4, 90.2, 91.5, 92.4],
  },
  {
    name: '현대차',
    price: '286,000원',
    change: '+2.14%',
    trend: [272, 275, 279, 277, 282, 286],
  },
  {
    name: 'NVIDIA',
    price: '$163.42',
    change: '+1.76%',
    trend: [156.3, 158.1, 157.4, 160.6, 162.2, 163.42],
  },
  {
    name: 'Tesla',
    price: '$246.18',
    change: '-0.44%',
    trend: [251.6, 249.8, 250.3, 248.9, 247.4, 246.18],
  },
]

export const scheduleItems = [
  { date: '7.08', title: '미국 FOMC 의사록 공개' },
  { date: '7.10', title: '국내 옵션 만기일' },
  { date: '7.12', title: '주요 빅테크 실적 발표' },
]

export const notificationItems = [
  {
    id: 'ae_3001',
    title: '목표 가격 도달',
    body: '삼성전자가 92,000원을 돌파했어요.',
    meta: '삼성전자 · 2분 전',
    status: 'new',
  },
  {
    id: 'ae_3002',
    title: '급등 알림',
    body: 'NVIDIA가 장중 +1.7% 상승하며 거래량이 늘었어요.',
    meta: 'NVIDIA · 18분 전',
    status: 'new',
  },
  {
    id: 'ae_3003',
    title: '포트폴리오 변동',
    body: '보유 종목 평가액이 전일 대비 +0.8% 변동했어요.',
    meta: '내 계좌 · 1시간 전',
    status: 'read',
  },
]
