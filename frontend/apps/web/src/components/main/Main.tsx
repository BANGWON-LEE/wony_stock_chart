import { useEffect } from 'react'
import { issueKisAccessToken } from '../../feat/stock'
import { Header } from './layout/Header'
import { IndexSummarySection } from './sections/IndexSummarySection'
import { MarketChartSection } from './sections/MarketChartSection'
// import { MarketSignalsSection } from './sections/MarketSignalsSection'
// import { ScheduleSection } from './sections/ScheduleSection'

export function Main() {
  useEffect(() => {
    console.log('232323')
    async function fetchData() {
      try {
        await issueKisAccessToken()
      } catch (error) {
        console.error('Error issuing KIS access token:', error)
      }
    }

    fetchData()
  }, [])

  return (
    <main className="min-h-svh w-full bg-[#f7f8fa] text-left text-[#191f28]">
      <Header />
      <IndexSummarySection />
      <MarketChartSection />
      {/* <MarketSignalsSection /> */}
      {/* <ScheduleSection /> */}
    </main>
  )
}
