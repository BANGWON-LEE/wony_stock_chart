export function MarketSignalsSection() {
  return (
    <section className="bg-white px-12 py-11 max-[960px]:px-5 max-[960px]:py-8" aria-labelledby="signal-title">
      <div className="mb-[22px] flex max-w-[680px] flex-col gap-2">
        <p className="text-sm font-extrabold text-[#3182f6]">주식 골라보기</p>
        <h2 className="m-0 text-[28px] leading-[1.25] tracking-[0] max-[960px]:text-2xl" id="signal-title">
          관심 있게 볼 만한 흐름
        </h2>
      </div>
      <div className="grid grid-cols-3 gap-4 max-[960px]:grid-cols-1">
        <article className="flex flex-col gap-2.5 rounded-lg border border-[#e5e8eb] bg-white p-[22px]">
          <span className="text-[13px] font-bold text-[#8b95a1]">지금 뜨는 산업</span>
          <strong className="text-[22px] text-[#191f28]">반도체 장비</strong>
          <p className="text-[#4e5968] leading-[1.55]">AI 서버 투자 기대감으로 관련 종목 거래가 집중되고 있어요.</p>
        </article>
        <article className="flex flex-col gap-2.5 rounded-lg border border-[#e5e8eb] bg-white p-[22px]">
          <span className="text-[13px] font-bold text-[#8b95a1]">외국인 매매</span>
          <strong className="text-[22px] text-[#191f28]">2,841억 순매수</strong>
          <p className="text-[#4e5968] leading-[1.55]">대형 기술주 중심으로 매수세가 이어지는 중이에요.</p>
        </article>
        <article className="flex flex-col gap-2.5 rounded-lg border border-[#e5e8eb] bg-white p-[22px]">
          <span className="text-[13px] font-bold text-[#8b95a1]">기관 매매</span>
          <strong className="text-[22px] text-[#191f28]">719억 순매도</strong>
          <p className="text-[#4e5968] leading-[1.55]">단기 상승 종목에서는 차익 실현 움직임이 보여요.</p>
        </article>
      </div>
    </section>
  )
}
