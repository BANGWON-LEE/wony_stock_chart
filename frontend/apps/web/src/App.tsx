import { Chart } from './feat/chart'

const lineChartData = [
  {
    time: '2026-07-01',
    price: 120,
    volume: 320,
  },
  {
    time: '2026-07-02',
    price: 128,
    volume: 410,
  },
  {
    time: '2026-07-03',
    price: 124,
    volume: 380,
  },
]

function App() {
  return (
    <Chart
      type="candlestick"
      data={lineChartData}
      timePropertyName="time"
      options={{ title: 'Candlestick Chart' }}
    />
  )
}

export default App
