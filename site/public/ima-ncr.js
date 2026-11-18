// Conditional old-NCR comparison: the IMA risk charge is reflected at 50%.
// Amounts use trillion KRW. A full 5% reduction in operating net capital is
// an explicit conservative comparison assumption, not a universal deduction.
export const IMA_NCR_DEFAULTS = Object.freeze({capital:8, existingRisk:4, amount:1, riskPct:10});
const RESERVE = .05;
const f = (value, digits=2) => Number(value).toLocaleString('ko-KR', {minimumFractionDigits:digits, maximumFractionDigits:digits});

export function computeImaOldNcr(input={}) {
  const state = Object.fromEntries(Object.entries(IMA_NCR_DEFAULTS).map(([key,value]) => [key, Number(input[key] ?? value)]));
  const {capital:E, existingRisk:R, amount:A, riskPct} = state;
  if (!Object.values(state).every(Number.isFinite) || E<=0 || R<=0 || A<0 || riskPct<0) {
    return {valid:false, error:'영업용순자본과 기존 총위험액은 0보다 크게, 신규 운용액과 위험률은 0 이상으로 입력하세요.'};
  }
  const reserve = RESERVE*A;
  if (E-reserve<=0) return {valid:false, error:'5% 감소 가정 후 영업용순자본이 0 이하입니다. 이 조건에서 정상 운용과 감경 적용을 가정할 수 없습니다.'};
  const risk = A*riskPct/100;
  const notePct = E/(R+risk)*100;
  const imaPct = (E-reserve)/(R+risk*.5)*100;
  const imaFullRiskPct = (E-reserve)/(R+risk)*100;
  const riskSaved = risk*.5;
  const newNcrCapitalGain = riskSaved-reserve;
  const crossingDenominator = .5*E-RESERVE*A;
  const crossingPct = A>0 && crossingDenominator>0 ? RESERVE*R/crossingDenominator*100 : null;
  if (![risk,notePct,imaPct,imaFullRiskPct,E/R*100,newNcrCapitalGain].every(Number.isFinite) || (crossingPct!==null && !Number.isFinite(crossingPct))) {
    return {valid:false, error:'입력 규모가 계산 가능한 범위를 벗어났습니다. 조 원 단위의 현실적인 금액으로 입력하세요.'};
  }
  return {
    valid:true, ...state, reserve, risk, riskSaved, notePct, imaPct,
    imaFullRiskPct, differencePp:imaPct-notePct, crossingPct,
    newNcrCapitalGain, above150:imaPct>150, beforePct:E/R*100,
    reliefEligibility:'conditional'
  };
}

function chart(state) {
  const {capital,existingRisk,amount,riskPct,crossingPct} = state;
  const samples = Array.from({length:101}, (_,i) => computeImaOldNcr({capital,existingRisk,amount,riskPct:i*.5}));
  const values = samples.flatMap(point => [point.notePct,point.imaPct]);
  const low = Math.min(...values,150), high = Math.max(...values,150);
  const span = Math.max(high-low,10);
  const yMin = Math.max(0,low-span*.12), yMax = high+span*.15;
  const x = r => 62+r/50*596;
  const y = value => 270-(value-yMin)/(yMax-yMin)*222;
  const line = field => samples.map((point,i) => `${i?'L':'M'}${x(point.riskPct).toFixed(2)},${y(point[field]).toFixed(2)}`).join(' ');
  const selectedX = x(Math.min(50,riskPct));
  const selected = computeImaOldNcr({capital,existingRisk,amount,riskPct:Math.min(50,riskPct)});
  const ticks = Array.from({length:5}, (_,i) => yMin+(yMax-yMin)*i/4);
  const crossover = crossingPct!==null && crossingPct<=50;
  return `<div class="ima-ncr-chart" tabindex="0" role="region" aria-label="자산 위험률에 따른 구NCR 그래프, 가로 스크롤 가능">
    <svg viewBox="0 0 710 330" role="img" aria-labelledby="ima-ncr-chart-title ima-ncr-chart-desc">
      <title id="ima-ncr-chart-title">취득 자산 위험률과 구NCR: 발행어음 대 위험액 50%를 반영하는 IMA 비교</title>
      <desc id="ima-ncr-chart-desc">가로축은 취득 자산의 NCR 위험률 0~50%, 세로축은 구NCR입니다. IMA 영업용순자본은 운용액의 5%만큼 감소한다고 가정하고 위험액은 50% 반영해 비교합니다. ${crossover?`두 곡선은 위험률 ${f(crossingPct,3)}%에서 교차합니다.`:'표시 범위의 분기점은 없습니다.'} 수치는 아래 표에서도 확인할 수 있습니다.</desc>
      ${ticks.map(value=>`<path d="M62 ${y(value)}H658" stroke="#e6edf1"/><text x="52" y="${y(value)+4}" text-anchor="end" fill="#637682" font-size="11">${f(value,1)}</text>`).join('')}
      <text x="62" y="23" fill="#425a68" font-size="12">구NCR (%)</text>
      <path d="M62 ${y(150)}H658" stroke="#af8454" stroke-dasharray="5 5"/>
      <text x="658" y="${y(150)-7}" text-anchor="end" fill="#906c42" font-size="11">150% 요건 참고선</text>
      ${crossover?`<path d="M${x(crossingPct)} 48V270" stroke="#9aadb6" stroke-dasharray="3 4"/><text x="${Math.min(568,x(crossingPct)+7)}" y="43" fill="#546c78" font-size="11">분기점 ${f(crossingPct,2)}%</text>`:''}
      <path d="${line('notePct')}" fill="none" stroke="#496bba" stroke-width="3"/>
      <path d="${line('imaPct')}" fill="none" stroke="#087f80" stroke-width="3" stroke-dasharray="8 4"/>
      <path d="M${selectedX} 48V270" stroke="#bcc9ce"/>
      <circle cx="${selectedX}" cy="${y(selected.notePct)}" r="4.5" fill="#496bba" stroke="#fff" stroke-width="2"/>
      <circle cx="${selectedX}" cy="${y(selected.imaPct)}" r="4.5" fill="#087f80" stroke="#fff" stroke-width="2"/>
      <path d="M62 270H658" stroke="#a5b5be"/>
      ${[0,10,20,30,40,50].map(value=>`<text x="${x(value)}" y="289" text-anchor="middle" fill="#637682" font-size="11">${value}%</text>`).join('')}
      <text x="360" y="316" text-anchor="middle" fill="#425a68" font-size="12">취득 자산 위험률 r = NCR 총위험액 ÷ 취득액</text>
    </svg>
  </div>`;
}

function output(state) {
  if (!state.valid) return `<div class="callout ima-ncr-warning" role="alert">${state.error}</div>`;
  const direction = Math.abs(state.differencePp)<1e-8?'동일':state.differencePp>0?'IMA가 높음':'발행어음이 높음';
  const crossing = state.amount===0 ? '신규 운용액이 0이므로 두 방식의 비율이 같습니다.' : state.crossingPct===null ? '양의 위험률 분기점이 없습니다. 이 가정에서는 분자 감소 부담을 상쇄하지 못합니다.' : `이 가정의 분기점은 위험률 ${f(state.crossingPct,3)}%입니다.${state.crossingPct>50?' 분기점이 그래프 표시 범위 밖에 있습니다.':''} 이보다 높으면 IMA의 구NCR이 발행어음보다 높아집니다.`;
  return `<div class="ima-ncr-result" aria-live="polite" aria-atomic="true">
    <strong>${direction} · 구NCR 차이 ${state.differencePp>0?'+':''}${f(state.differencePp)}%p</strong>
    <p>${crossing}</p>
    ${!state.above150?'<p class="ima-ncr-warning"><b>IMA 구NCR 계산값이 150% 이하입니다.</b> 신규 납입 시 감경 요건과 폐쇄형 IMA의 유지 예외를 따로 확인해야 합니다. 이 계산만으로 실제 적용 가능 여부를 판정하지 않습니다.</p>':''}
  </div>
  <div class="ima-ncr-legend"><span><i class="note-line"></i>발행어음 · 위험액 100%</span><span><i class="ima-line"></i>IMA · 위험액 50% 반영</span></div>
  ${chart(state)}
  <div class="table-wrap"><table class="data-table ima-ncr-table"><caption>선택 위험률 ${f(state.riskPct,1)}%에서의 구NCR 분해 · 조 원</caption><thead><tr><th scope="col">항목</th><th scope="col">발행어음</th><th scope="col">IMA · 50% 반영 비교</th></tr></thead><tbody>
    <tr><th scope="row">영업용순자본 · 분자</th><td>${f(state.capital)}</td><td>${f(state.capital-state.reserve)} <small>(−${f(state.reserve*10000,0)}억)</small></td></tr>
    <tr><th scope="row">총위험액 · 분모</th><td>${f(state.existingRisk+state.risk,3)}</td><td>${f(state.existingRisk+state.risk*.5,3)} <small>(−${f(state.riskSaved*10000,0)}억)</small></td></tr>
    <tr><th scope="row">구NCR = 분자 ÷ 분모</th><td><b>${f(state.notePct)}%</b></td><td><b>${f(state.imaPct)}%</b></td></tr>
  </tbody></table></div>
  <p class="ima-ncr-subnote">분자와 분모에서 줄어드는 금액이 같아도 비율 효과는 서로 다릅니다. 구NCR의 분기점은 기존 E·R 및 신규 운용액에 따라 달라지므로 고정된 10%로 판단하지 않습니다.</p>`;
}

export function renderImaOldNcr(input={}) {
  const state = {...IMA_NCR_DEFAULTS,...input};
  for (const key of Object.keys(state)) state[key] = Number.isFinite(Number(state[key]))?Number(state[key]):IMA_NCR_DEFAULTS[key];
  state.riskPct = Math.max(0,Math.min(50,state.riskPct));
  return `<section class="panel ima-ncr-panel" id="ima-old-ncr-panel">
    <div class="panel-head"><div><span class="badge green">5% 자본 부담 · 위험액 50% 반영</span><h2>5%를 쌓아도 위험액을 절반으로 줄이면, 구NCR은 좋아질까?</h2><p>구NCR에서도 위험액 50% 감경을 반영하는 비교입니다. 자산 위험률에 따라 분자 감소와 분모 감소의 효과가 달라집니다.</p></div></div>
    <p class="ima-ncr-subnote">아래는 특정 회사 실적이 아닌 설명용 가정입니다. <b>5% 전액만큼 영업용순자본이 감소한다고 둔 보수적 비교</b>이며, 법령이 5% 전액의 별도 차감을 일률적으로 정한다는 뜻은 아닙니다. 실제 적용 대상·산정 기준은 감독 규정과 회사별 공시를 대조해야 합니다.</p>
    <label class="ima-ncr-risk-label" for="ima-ncr-risk">취득 자산 위험률 <output id="ima-ncr-risk-value" for="ima-ncr-risk">${f(state.riskPct,1)}%</output></label>
    <input type="range" id="ima-ncr-risk" data-ncr-input="riskPct" min="0" max="50" step="0.5" value="${state.riskPct}" aria-describedby="ima-ncr-risk-help">
    <p class="ima-ncr-subnote" id="ima-ncr-risk-help">NCR 위험액 ÷ 취득액입니다. 부도확률(PD)이나 은행의 위험가중치(RWA)가 아닙니다.</p>
    <details class="ima-ncr-assumptions"><summary>계산 가정 · 영업용순자본 ${f(state.capital,1)}조 / 기존 위험액 ${f(state.existingRisk,1)}조 / 신규 운용 ${f(state.amount,1)}조</summary><div class="ima-ncr-inputs">
      <label>감소 전 영업용순자본 E · 조 원<input type="number" data-ncr-input="capital" min="0.01" step="0.1" value="${state.capital}" inputmode="decimal"></label>
      <label>기존 총위험액 R · 조 원<input type="number" data-ncr-input="existingRisk" min="0.01" step="0.1" value="${state.existingRisk}" inputmode="decimal"></label>
      <label>한도 내 신규 운용액 A · 조 원<input type="number" data-ncr-input="amount" min="0" step="0.1" value="${state.amount}" inputmode="decimal"></label>
    </div><p class="ima-ncr-subnote">평가손실 0·그 밖의 자산 및 위험액 고정·세금과 손익 미반영. E·R은 같은 연결 범위로 비교합니다. 취득액에 단일 위험률을 적용하는 단순 비교이며 분산·상계·집중 효과는 별도 반영하지 않습니다. E는 IMA 5% 감소 전 값입니다. 이미 감소한 영업용순자본을 넣으면 중복 차감됩니다.</p></details>
    <div data-ncr-output>${output(computeImaOldNcr(state))}</div>
    <details class="ima-ncr-assumptions"><summary>산식과 감경 조건 확인</summary><p>발행어음: E ÷ (R + A×r). IMA: (E − 0.05×A) ÷ (R + 0.5×A×r). 비율 표시는 각각 ×100입니다.</p><p>구NCR 분기점 r* = 0.05×R ÷ (0.5×E − 0.05×A). A&gt;0, 분모&gt;0일 때의 비교이며 법정 공통 위험률이 아닙니다. 보조적으로 신NCR 순자본 여력 차이는 0.5×A×r − 0.05×A이지만, 구NCR의 비율 분기점과 구분합니다.</p><p><b>감경 요건을 충족하는 운용액을 전제로 합니다.</b> 현행 세칙은 매 결산 시 손실충당금·손실준비금 합계가 원본 결손액 + 원본 5% 이상이고, 연결 구NCR이 150%를 초과하는 요건을 함께 둡니다. 만기 전 해지가 불가능한 IMA는 두 요건을 충족한 상태에서 납입·운용한 자산에 대해 이후 150% 요건의 유지 예외가 있습니다.</p><p>손실충당금의 비용 처리와 손실준비금의 이익잉여금 내 적립은 다릅니다. 본 그래프의 분자 5% 전액 감소는 보수적 가정이며 실제 영업용순자본 감소액은 회계·세금·규제 조정을 대조해야 합니다. 시딩·충당금·준비금의 같은 부담을 중복 차감하지 않습니다.</p><p>자기자본의 100%를 초과하는 IMA 수탁금 원본에는 50% 감경을 적용하지 않는 한도를 고려합니다. 본 모형의 A는 전액 감경 요건과 한도 내에 있는 신규 운용액으로 가정합니다. 영업용순자본 E는 자기자본과 다르므로 E로 한도 충족을 판정하지 않습니다.</p></details>
    <a class="btn" href="?q=guide-ima-old-ncr-capital#questions" data-qa-jump="guide-ima-old-ncr-capital">질문 · IMA의 자본효율은 언제 유의미한가요? →</a>
    <div class="source"><b>출처 및 산정방식</b> · <a href="https://www.fsc.go.kr/no010101/84322" target="_blank" rel="noopener noreferrer">금융위 2025.04.09 · 영업용순자본비율 산출 시 IMA 50% 반영</a> · <a href="https://www.law.go.kr/LSW/flDownload.do?flSeq=166876081" target="_blank" rel="noopener noreferrer">금융투자업규정 시행세칙 제3-20조의6 · 2026.07.08 시행, 9쪽</a> · <a href="https://www.law.go.kr/LSW/admRulLsInfoR.do?admRulSeq=2100000285020" target="_blank" rel="noopener noreferrer">금융투자업규정 제3-6조·제3-24조의4·제4-99조</a> · <a href="https://www.fsc.go.kr/no010101/84928" target="_blank" rel="noopener noreferrer">금융위 제도 설명</a> · 위 비교 산식의 가정과 실제 적용 기준을 구분합니다. <button type="button" class="source-xray-btn" data-xray="ima-old-ncr">산식·근거 열기</button></div>
  </section>`;
}

export function getImaNcrScenario(root=typeof document==='undefined'?null:document) {
  const panel = root?.querySelector('#ima-old-ncr-panel');
  if (!panel) return computeImaOldNcr();
  const state = Object.fromEntries([...panel.querySelectorAll('[data-ncr-input]')].map(input => [input.dataset.ncrInput,input.value.trim()===''?NaN:Number(input.value)]));
  return computeImaOldNcr(state);
}

export function bindImaOldNcr(root=document) {
  const panel = root.querySelector('#ima-old-ncr-panel');
  if (!panel) return;
  const inputs = [...panel.querySelectorAll('[data-ncr-input]')];
  const update = () => {
    const state = Object.fromEntries(inputs.map(input => [input.dataset.ncrInput, input.value.trim()===''?NaN:Number(input.value)]));
    panel.querySelector('#ima-ncr-risk-value').textContent = `${f(state.riskPct,1)}%`;
    const summary = panel.querySelector('.ima-ncr-assumptions summary');
    summary.textContent = `계산 가정 · 영업용순자본 ${f(state.capital,1)}조 / 기존 위험액 ${f(state.existingRisk,1)}조 / 신규 운용 ${f(state.amount,1)}조`;
    panel.querySelector('[data-ncr-output]').innerHTML = output(computeImaOldNcr(state));
  };
  inputs.forEach(input => input.addEventListener('input',update));
}
