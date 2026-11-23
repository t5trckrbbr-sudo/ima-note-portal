const format = (value, digits) => value.toLocaleString('ko-KR', {
  minimumFractionDigits: digits,
  maximumFractionDigits: digits
});

export function renderBearFlatStrategy(data) {
  const outlook = data.fundingOutlook2027BearFlattening;
  const observations = outlook.bearFlatteningRegimes.filter(row => Number.isFinite(row.ktbSpreadBp));
  const [quarter, november] = observations;
  const spreadDrop = quarter.ktbSpreadBp - november.ktbSpreadBp;
  const maxSpread = Math.max(quarter.ktbSpreadBp, november.ktbSpreadBp);
  const shortShare = data.shortYieldCurveAndMaturity.maturityBuckets26Q1.under3mSharePct;
  const kis = data.promNoteDart202609.find(row => row.key === 'kis');
  const firstTranche = data.imaTranchesKis.find(row => row.tranche === 'IMA 1호');
  const maturity = firstTranche.maturity.replace('-', '.');

  return `<section id="funding-bear-strategy" class="bf-strategy" aria-labelledby="bf-strategy-title">
    <div class="bf-heading">
      <h3 id="bf-strategy-title">베어 플랫 국면에서 한국투자증권은 무엇을 선택할 수 있을까?</h3>
      <p>단기금리가 더 빠르게 오르면 만기를 늘려 얻는 추가 금리가 줄어듭니다. 조달금리를 일찍 고정할 이유와 우량 자산의 수익을 고정할 이유를 각각 점검할 때입니다.</p>
    </div>
    <div class="bf-evidence-grid">
      <figure class="bf-spread-chart" aria-labelledby="bf-spread-caption">
        <figcaption id="bf-spread-caption">국고채 3년물 금리 − 1년물 금리</figcaption>
        <div class="bf-spread-result"><strong>−${format(spreadDrop, 1)}bp</strong><span>기간스프레드 축소</span></div>
        ${observations.map((row, index) => `<div class="bf-bar-row">
          <div><span>${index === 0 ? '2026.2Q 평균' : outlook.observedDate}</span><b>+${format(row.ktbSpreadBp, 1)}bp</b></div>
          <div class="bf-track" aria-hidden="true"><span style="width:${row.ktbSpreadBp / maxSpread * 100}%"></span></div>
        </div>`).join('')}
        <p>금융투자협회 민평 집계 · 막대는 0bp에서 시작</p>
      </figure>
      <div class="bf-operating-context" aria-label="조달과 만기 여건">
        <div><strong>${format(shortShare, 1)}%</strong><div><b>업권 발행어음 3개월 이하 비중</b><p>2026.1Q 말 · 금리 상승과 하락이 조달원가에 빨리 반영될 수 있습니다.</p></div></div>
        <div><strong>${format(kis.limitUsagePct, 1)}%</strong><div><b>당사 발행어음 한도 사용률</b><p>2026.3Q 말 · 잔액 ${format(kis.promNoteTril, 2)}조 ÷ 한도 ${format(kis.legalCap200Tril, 2)}조</p></div></div>
        <div><strong>${format(firstTranche.amountTril, 2)}조</strong><div><b>당사 IMA 1호 만기</b><p>${maturity} · 만기에 필요한 현금과 차환 계획을 미리 잡아야 합니다.</p></div></div>
      </div>
    </div>
    <div class="bf-choices">
      <article class="bf-choice">
        <span>조달</span><h4>고금리 1년물 특판은 필요한 만큼만</h4>
        <p>비싸게 고정한 1년물은 단기금리가 내려가도 만기까지 이자비용이 남습니다. 1년 조달은 같은 기간에 자금이 필요한 자산과 유동성 확보분에 우선 배정합니다.</p>
        <p class="bf-check"><b>확인할 지표</b> 수시·단기 잔액 이탈, 만기별 실효 조달금리, 1·3개월 유동성비율</p>
      </article>
      <article class="bf-choice">
        <span>운용</span><h4>조건이 맞는 2~3년 우량 여신은 나눠 집행</h4>
        <p>장기 국고채의 추가 금리가 줄어든 만큼, 신용스프레드가 충분한 자산만 검토합니다. 같은 만기의 조달비용과 회수 조건까지 확인한 뒤 수익을 고정합니다.</p>
        <p class="bf-check"><b>확인할 지표</b> 동일 만기 조달비용 차감 후 스프레드, 승인된 적격 자산과 집행 일정</p>
      </article>
      <article class="bf-choice">
        <span>만기 매칭</span><h4>IMA와 사채는 회수 일정에 맞춰 비교</h4>
        <p>어음 한도 사용률이 높은 만큼 긴 자산은 회수 시점을 먼저 잡고 자금원을 고릅니다. IMA 1호의 ${maturity} 만기를 앞두고 상환 재원과 차환 가능액을 나눠 점검합니다.</p>
        <p class="bf-check"><b>확인할 지표</b> 월별 현금흐름 격차, 만기별 IMA·사채의 실효 조달비용</p>
      </article>
    </div>
    <div class="bf-decision">
      <h4>하반기 수신 확대는 세 가지가 확인될 때</h4>
      <div><span>단기 조달비용 하락</span><span>고객 잔액 유지</span><span>집행 가능한 적격 자산 확보</span></div>
      <p>${outlook.selfBrakeNote}</p>
    </div>
    <details class="bf-sources">
      <summary>근거 자료와 해석</summary>
      <ul>
        <li>국고채 금리차는 시장의 만기별 금리 차이입니다. 당사 NIM을 계산할 때는 실제 조달금리와 자산 운용수익률을 따로 확인합니다. 11월 13일 최종호가도 1년 3.631%, 3년 3.759%로 좁은 격차를 보였습니다(12.8bp, 별도 호가 계열). <a href="https://www.yna.co.kr/view/AKR20261113146751008" target="_blank" rel="noopener noreferrer">당일 국고채 최종호가</a></li>
        <li>63.4%는 2026.1Q 말 업권 만기 분포입니다. 당사 단기 조달 비중과 고객 잔액 유지율을 확인할 때는 회사 기준 만기표를 사용합니다. <a href="?q=guide-yield-curve-short-funding#questions" data-qa-jump="guide-yield-curve-short-funding">단기 수신 구조와 산식</a></li>
        <li>당사 어음 잔액과 한도는 2026.3Q 말, IMA 1호는 상품의 만기 일정 기준입니다. <a href="https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${kis.rceptNo}" target="_blank" rel="noopener noreferrer">한국투자증권 분기보고서</a> · <a href="#ima-maturity">IMA 만기 타임라인</a></li>
      </ul>
    </details>
    <a class="btn" href="?q=guide-2027-funding-outlook-bear-flattening#questions" data-qa-jump="guide-2027-funding-outlook-bear-flattening">수신환경 전망 Q&A</a>
  </section>`;
}
