import { Header } from './layout/Header'
import { IndexSummarySection } from './sections/IndexSummarySection'
import { MarketChartSection } from './sections/MarketChartSection'
import { MarketSignalsSection } from './sections/MarketSignalsSection'
import { ScheduleSection } from './sections/ScheduleSection'

export function Main() {
  return (
    <main className="min-h-svh w-full bg-[#f7f8fa] text-left text-[#191f28]">
      <Header />
      <IndexSummarySection />
      <MarketChartSection />
      <MarketSignalsSection />
      <ScheduleSection />
    </main>
  )
}
