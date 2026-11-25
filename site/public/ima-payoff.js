// Stylized annualized IMA payoff comparison across 3 licensed Mega-IBs.
// Models customer pre-tax / after-withholding yield vs broker net fee margin
// (including the asymmetric principal-protection short-put below 0% net return).

export const IMA_PAYOFF_DEFAULTS = Object.freeze({
  grossPct: 5.5,
  cohort: 'recent',
  principalEok: 3.0
});

export const IMA_PAYOFF_COHORTS = Object.freeze({
  recent: Object.freeze({
    label: '2026 하반기 대표형 (S6·7 / 4호 / 중기 3·4)',
    profiles: Object.freeze([
      Object.freeze({
        key: 'kis',
        firm: '한국투자증권',
        trancheLabel: 'S6·S7 대표 (2년)',
        color: '#004ea2',
        baseFeePct: 0.60,
        hurdlePct: 4.50,
        perfSharePct: 40,
        maturityYears: 2.0,
        feeNote: '통상 0.60% 기준'
      }),
      Object.freeze({
        key: 'mirae',
        firm: '미래에셋증권',
        trancheLabel: '4호 대표 (3년)',
        color: '#e88300',
        baseFeePct: 0.22,
        hurdlePct: 5.00,
        perfSharePct: 40,
        maturityYears: 3.0,
        feeNote: '1호 0.22% 준용 가정'
      }),
      Object.freeze({
        key: 'nh',
        firm: 'NH투자증권',
        trancheLabel: '중기 3·4호 (2년 3개월)',
        color: '#1b7a5e',
        baseFeePct: 0.60,
        hurdlePct: 4.50,
        perfSharePct: 40,
        maturityYears: 2.25,
        feeNote: '중기형 0.60% 기준'
      })
    ])
  }),
  early: Object.freeze({
    label: '초기형 · 단기형 비교 (S1~5 / 1~3호 / 단기 1호)',
    profiles: Object.freeze([
      Object.freeze({
        key: 'kis',
        firm: '한국투자증권',
        trancheLabel: 'S1~S5 초기형 (2년)',
        color: '#004ea2',
        baseFeePct: 0.60,
        hurdlePct: 4.00,
        perfSharePct: 40,
        maturityYears: 2.0,
        feeNote: '총보수 0.60% 확인'
      }),
      Object.freeze({
        key: 'mirae',
        firm: '미래에셋증권',
        trancheLabel: '1~3호 초기형 (3년)',
        color: '#e88300',
        baseFeePct: 0.22,
        hurdlePct: 4.00,
        perfSharePct: 30,
        maturityYears: 3.0,
        feeNote: '1호 0.22% 확인'
      }),
      Object.freeze({
        key: 'nh',
        firm: 'NH투자증권',
        trancheLabel: '단기형 1호 (1년 6개월)',
        color: '#1b7a5e',
        baseFeePct: 0.50,
        hurdlePct: 4.30,
        perfSharePct: 40,
        maturityYears: 1.5,
        feeNote: '단기형 0.50% 확인'
      })
    ])
  })
});

const TAX_WITHHOLDING = 0.154;
const COMPREHENSIVE_TAX_THRESHOLD_MAN = 2000;
const f = (value, digits = 2) => Number(value).toLocaleString('ko-KR', {
  minimumFractionDigits: digits,
  maximumFractionDigits: digits
});

export function evaluateFirmPayoff(profile, grossPct, principalEok = 3.0) {
  const afterBasePct = grossPct - profile.baseFeePct;
  let customerPreTaxPct = 0;
  let perfFeePct = 0;
  let principalTopUpLossPct = 0;
  let regime = 'normal';

  if (afterBasePct < 0) {
    customerPreTaxPct = 0;
    principalTopUpLossPct = -afterBasePct;
    regime = 'principal_guarantee';
  } else if (afterBasePct <= profile.hurdlePct) {
    customerPreTaxPct = afterBasePct;
    regime = 'below_hurdle';
  } else {
    const excessPct = afterBasePct - profile.hurdlePct;
    perfFeePct = excessPct * (profile.perfSharePct / 100);
    customerPreTaxPct = profile.hurdlePct + excessPct * (1 - profile.perfSharePct / 100);
    regime = 'above_hurdle';
  }

  const brokerNetMarginPct = profile.baseFeePct + perfFeePct - principalTopUpLossPct;
  const customerAfterWithholdingPct = customerPreTaxPct * (1 - TAX_WITHHOLDING);
  // Simple cumulative lump-sum dividend at maturity (principalEok * 10,000 만원 * rate * years)
  const lumpSumDividendMan = Math.max(0, principalEok) * 10000 * (customerPreTaxPct / 100) * profile.maturityYears;
  const exceedsComprehensiveThreshold = lumpSumDividendMan > COMPREHENSIVE_TAX_THRESHOLD_MAN;

  return {
    ...profile,
    grossPct,
    afterBasePct,
    customerPreTaxPct,
    customerAfterWithholdingPct,
    perfFeePct,
    principalTopUpLossPct,
    brokerNetMarginPct,
    lumpSumDividendMan,
    exceedsComprehensiveThreshold,
    regime
  };
}

export function computeImaPayoff(input = {}) {
  const cohortKey = input.cohort && IMA_PAYOFF_COHORTS[input.cohort] ? input.cohort : IMA_PAYOFF_DEFAULTS.cohort;
  const rawGross = Number(input.grossPct ?? IMA_PAYOFF_DEFAULTS.grossPct);
  const rawPrincipal = Number(input.principalEok ?? IMA_PAYOFF_DEFAULTS.principalEok);
  const grossPct = Number.isFinite(rawGross) ? Math.max(-3, Math.min(10, rawGross)) : IMA_PAYOFF_DEFAULTS.grossPct;
  const principalEok = Number.isFinite(rawPrincipal) ? Math.max(0.1, Math.min(50, rawPrincipal)) : IMA_PAYOFF_DEFAULTS.principalEok;
  const cohort = IMA_PAYOFF_COHORTS[cohortKey];
  const results = cohort.profiles.map(profile => evaluateFirmPayoff(profile, grossPct, principalEok));
  return {
    cohortKey,
    cohortLabel: cohort.label,
    grossPct,
    principalEok,
    results
  };
}

function renderPayoffSvg(state, mode) {
  const cohort = IMA_PAYOFF_COHORTS[state.cohortKey];
  const minX = -3, maxX = 10;
  const samples = Array.from({ length: 53 }, (_, i) => minX + i * 0.25);
  const isBroker = mode === 'broker';
  const yMin = isBroker ? -3.5 : -0.5;
  const yMax = isBroker ? 3.5 : 8.5;
  const x = v => 48 + (v - minX) / (maxX - minX) * 356;
  const y = v => 186 - (v - yMin) / (yMax - yMin) * 150;
  const ticks = isBroker ? [-3, -2, -1, 0, 1, 2, 3] : [0, 2, 4, 6, 8];
  const pathFor = profile => samples.map((g, idx) => {
    const pt = evaluateFirmPayoff(profile, g, state.principalEok);
    const val = isBroker ? pt.brokerNetMarginPct : pt.customerPreTaxPct;
    return `${idx ? 'L' : 'M'}${x(g).toFixed(1)},${y(Math.max(yMin, Math.min(yMax, val))).toFixed(1)}`;
  }).join(' ');
  const curX = x(state.grossPct);

  return `<figure class="ima-payoff-chart">
    <figcaption>${isBroker ? '② 증권사 순수취 마진 (연 %, 고객 수탁금 대비)' : '① 고객 세전 연환산 수익률 (연 %, 만기 보유)'}</figcaption>
    <svg viewBox="0 0 430 222" role="img" aria-label="${isBroker ? '총운용수익률 대비 3사 증권사 순수취 마진 곡선' : '총운용수익률 대비 3사 고객 세전 수익률 곡선'}">
      ${isBroker ? `<rect x="48" y="${y(0).toFixed(1)}" width="${(x(0.6) - 48).toFixed(1)}" height="${(186 - y(0)).toFixed(1)}" fill="#fdf1f0" opacity="0.85"/>` : ''}
      ${ticks.map(v => `<line x1="48" x2="404" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" stroke="${v === 0 ? '#94a3b8' : '#e6edf5'}" stroke-dasharray="${v === 0 ? '' : '3 3'}"/>
        <text x="42" y="${(y(v) + 3.5).toFixed(1)}" text-anchor="end" font-size="10" fill="#64748b">${v > 0 && isBroker ? '+' : ''}${v}%</text>`).join('')}
      <line x1="${x(0).toFixed(1)}" x2="${x(0).toFixed(1)}" y1="30" y2="186" stroke="#cbd5e1" stroke-dasharray="3 3"/>
      <line x1="${curX.toFixed(1)}" x2="${curX.toFixed(1)}" y1="26" y2="186" stroke="#0a1e3c" stroke-width="1.3" stroke-dasharray="4 3"/>
      <text x="${Math.min(378, Math.max(76, curX)).toFixed(1)}" y="20" text-anchor="middle" font-size="10" font-weight="700" fill="#0a1e3c">운용 ${state.grossPct > 0 ? '+' : ''}${f(state.grossPct, 2)}%</text>
      ${cohort.profiles.map((profile, idx) => `<path d="${pathFor(profile)}" fill="none" stroke="${profile.color}" stroke-width="${idx === 0 ? 2.6 : 2.2}" stroke-dasharray="${idx === 2 ? '6 3' : ''}"/>`).join('')}
      ${state.results.map(r => {
        const val = isBroker ? r.brokerNetMarginPct : r.customerPreTaxPct;
        return `<circle cx="${curX.toFixed(1)}" cy="${y(Math.max(yMin, Math.min(yMax, val))).toFixed(1)}" r="4.2" fill="${r.color}" stroke="#fff" stroke-width="1.6"/>`;
      }).join('')}
      ${[-2, 0, 2, 4, 6, 8, 10].map(v => `<text x="${x(v).toFixed(1)}" y="203" text-anchor="middle" font-size="10" fill="#64748b">${v}%</text>`).join('')}
      <text x="226" y="218" text-anchor="middle" font-size="10.5" fill="#475569">총 운용수익률 (보수 차감 전, 연 %)</text>
      ${isBroker ? `<text x="54" y="176" font-size="9.5" font-weight="700" fill="#c4362e">원금보전 손실 구간 (Short Put)</text>` : `<text x="54" y="${(y(0) - 6).toFixed(1)}" font-size="9.5" font-weight="700" fill="#004ea2">만기 원금 0% 하한</text>`}
    </svg>
  </figure>`;
}

function renderPayoffOutput(state) {
  const bestCustomer = [...state.results].sort((a, b) => b.customerPreTaxPct - a.customerPreTaxPct)[0];
  const regimeNote = state.grossPct < 0.6
    ? '운용수익률이 총보수 이하로 내려가면 고객은 만기 원금(0%)을 보전받는 반면, 증권사는 차액을 떠안는 비대칭 손실(Short Put) 구간에 진입합니다.'
    : state.grossPct <= 5.0
      ? '허들 전후 구간에서는 성과보수 부담이 없거나 미미하므로 기본 총보수가 낮은 상품(미래에셋 0.22%)이 고객 실수령에서 직접적인 우위를 보입니다.'
      : '허들 초과 고수익 구간에서는 기본보수뿐 아니라 성과보수율(30~40%)과 허들 수준(4.0~5.0%)이 고객·증권사 배분 비율을 동시에 가릅니다.';

  return `<div class="ima-payoff-banner">
    <span>운용수익률 <b>${state.grossPct > 0 ? '+' : ''}${f(state.grossPct, 2)}%</b> 가정 시 고객 세전 최고: <b style="color:${bestCustomer.color}">${bestCustomer.firm} 연 ${f(bestCustomer.customerPreTaxPct, 2)}%</b></span>
    <small class="muted">${regimeNote}</small>
  </div>
  <div class="ima-payoff-cards">
    ${state.results.map(r => {
      const marginTone = r.brokerNetMarginPct < 0 ? '#c4362e' : r.color;
      return `<article class="ima-payoff-card" style="border-top-color:${r.color}">
        <div class="ima-payoff-card-head">
          <div><b>${r.firm}</b><small class="muted">${r.trancheLabel}</small></div>
          <span class="badge ${r.regime === 'principal_guarantee' ? 'red' : r.regime === 'above_hurdle' ? 'amber' : 'blue'}">${r.regime === 'principal_guarantee' ? '원금보전 발동' : r.regime === 'above_hurdle' ? '성과보수 발생' : '허들 이하'}</span>
        </div>
        <div class="ima-payoff-metrics">
          <div><small>고객 세전 (연)</small><strong class="tabular" style="color:#0a1e3c">${f(r.customerPreTaxPct, 2)}%</strong><span>15.4% 세후 ${f(r.customerAfterWithholdingPct, 2)}%</span></div>
          <div><small>증권사 마진 (연)</small><strong class="tabular" style="color:${marginTone}">${r.brokerNetMarginPct > 0 ? '+' : ''}${f(r.brokerNetMarginPct, 2)}%</strong><span>기본 ${f(r.baseFeePct, 2)} · 성과 ${f(r.perfFeePct, 2)}${r.principalTopUpLossPct > 0 ? ` · 보전 −${f(r.principalTopUpLossPct, 2)}` : ''}</span></div>
        </div>
        <div class="ima-payoff-tax ${r.exceedsComprehensiveThreshold ? 'is-warn' : ''}">
          <span>원금 ${f(state.principalEok, 1)}억 · ${r.maturityYears}년 만기 일시 배당</span>
          <b class="tabular">${f(r.lumpSumDividendMan, 0)}만 원 ${r.exceedsComprehensiveThreshold ? '(2,000만 초과 · 종합과세 구간)' : '(분리과세 범위)'}</b>
        </div>
        <small class="muted" style="font-size:10.5px">조건: 총보수 ${f(r.baseFeePct, 2)}% (${r.feeNote}) · 허들 ${f(r.hurdlePct, 1)}% · 초과분 ${r.perfSharePct}%</small>
      </article>`;
    }).join('')}
  </div>
  <div class="ima-payoff-svg-grid">
    ${renderPayoffSvg(state, 'customer')}
    ${renderPayoffSvg(state, 'broker')}
  </div>`;
}

export function renderImaPayoffPanel(input = {}) {
  const state = computeImaPayoff(input);
  const presets = [
    [-2.0, '손실 −2.0%'],
    [3.0, '저수익 3.0%'],
    [4.5, '허들 4.5%'],
    [5.5, '기준 5.5%'],
    [8.0, '고수익 8.0%']
  ];
  return `<section class="panel ima-payoff-panel" id="ima-payoff-panel" style="scroll-margin-top:95px" aria-labelledby="ima-payoff-title">
    <div class="panel-head">
      <div>
        <div class="eyebrow">IMA PAYOFF SIMULATOR · 고객 실수령 vs 증권사 마진 · 만기 일시 배당과세</div>
        <h2 id="ima-payoff-title">운용수익률이 달라지면, 고객과 3개 증권사는 각각 얼마를 가져갈까?</h2>
        <p>기준수익률은 확정금리가 아니라 성과보수 기준선입니다. 보수 차감 전 총운용수익률 슬라이더로 3사의 <b>고객 실수령 수익률</b>, <b>증권사 순수취 마진(Short Put 손실 포함)</b>, <b>만기 일시 배당소득(금융소득종합과세 2,000만 원 기준)</b>을 비교합니다.</p>
      </div>
      <span class="badge blue">연환산 단순 모형</span>
    </div>

    <div class="ima-payoff-controls">
      <div class="lens-switch" role="group" aria-label="IMA 대표 회차 세대 선택">
        ${Object.entries(IMA_PAYOFF_COHORTS).map(([key, item]) => `<button type="button" class="lens-btn ${state.cohortKey === key ? 'active' : ''}" data-payoff-cohort="${key}" aria-pressed="${state.cohortKey === key}">${item.label}</button>`).join('')}
      </div>
      <label class="ima-payoff-principal">
        <span>가입 원금(세제 참고)</span>
        <input type="number" id="ima-payoff-principal" data-payoff-input="principalEok" min="0.1" max="50" step="0.5" value="${state.principalEok}" inputmode="decimal">
        <span>억 원</span>
      </label>
    </div>

    <div class="ima-payoff-slider-box">
      <div class="ima-payoff-slider-head">
        <label for="ima-payoff-gross">연환산 총 운용수익률 (보수 차감 전) <output id="ima-payoff-gross-out" for="ima-payoff-gross">${state.grossPct > 0 ? '+' : ''}${f(state.grossPct, 2)}%</output></label>
        <div class="chips" role="group" aria-label="운용수익률 시나리오 프리셋">
          ${presets.map(([val, label]) => `<button type="button" class="chip ${Math.abs(state.grossPct - val) < 0.01 ? 'active' : ''}" data-payoff-preset="${val}">${label}</button>`).join('')}
        </div>
      </div>
      <input type="range" id="ima-payoff-gross" data-payoff-input="grossPct" min="-3" max="10" step="0.25" value="${state.grossPct}">
      <div class="range-ends"><span>−3.0% (원금보전 구간)</span><span>0.0%</span><span>+4.5~5.0% (허들)</span><span>+10.0% (고수익)</span></div>
    </div>

    <div id="ima-payoff-output" aria-live="polite">${renderPayoffOutput(state)}</div>

    <div class="source">
      <b>출처 및 모형 가정</b> · 각 사 대표 회차 공개 조건(한투 S1~7, 미래에셋 1~4호, NH 중기 3·4호·단기 1호)을 연환산 단리 기준으로 단순화한 비교 모형입니다. 미래에셋 4호 기본보수(미공개)는 1호 공시치(0.22%)를 준용했으며, 증권사의 5% 의무 시딩 자기계정 손익·복리 효과·타 금융소득 합산은 별도 고려해야 합니다.
      <a href="?q=제4-102조의9#regulations" data-reg-jump>규정모음집 · 제4-102조의9(IMA 업무) 원문 →</a>
    </div>
  </section>`;
}

export function bindImaPayoffPanel(root = document) {
  const panel = root.querySelector('#ima-payoff-panel');
  if (!panel) return;
  let cohortKey = IMA_PAYOFF_DEFAULTS.cohort;
  const grossInput = panel.querySelector('#ima-payoff-gross');
  const principalInput = panel.querySelector('#ima-payoff-principal');
  const grossOut = panel.querySelector('#ima-payoff-gross-out');
  const outputWrap = panel.querySelector('#ima-payoff-output');

  const update = () => {
    const state = computeImaPayoff({
      cohort: cohortKey,
      grossPct: grossInput.value,
      principalEok: principalInput.value
    });
    grossOut.textContent = `${state.grossPct > 0 ? '+' : ''}${f(state.grossPct, 2)}%`;
    outputWrap.innerHTML = renderPayoffOutput(state);
    panel.querySelectorAll('[data-payoff-cohort]').forEach(btn => {
      const active = btn.dataset.payoffCohort === state.cohortKey;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', String(active));
    });
    panel.querySelectorAll('[data-payoff-preset]').forEach(btn => {
      btn.classList.toggle('active', Math.abs(state.grossPct - Number(btn.dataset.payoffPreset)) < 0.01);
    });
  };

  grossInput.addEventListener('input', update);
  principalInput.addEventListener('input', update);
  panel.addEventListener('click', event => {
    const cohortBtn = event.target.closest('[data-payoff-cohort]');
    if (cohortBtn) {
      cohortKey = cohortBtn.dataset.payoffCohort;
      update();
      return;
    }
    const presetBtn = event.target.closest('[data-payoff-preset]');
    if (presetBtn) {
      grossInput.value = presetBtn.dataset.payoffPreset;
      update();
    }
  });
}
