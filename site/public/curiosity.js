const fmt = (n, d = 2) => (n === null || n === undefined || Number.isNaN(Number(n)))
  ? '—'
  : Number(n).toLocaleString('ko-KR', { minimumFractionDigits: d, maximumFractionDigits: d });

const mixLabels = {
  rp: 'RP매도',
  promNote: '발행어음',
  elsDls: 'ELS·DLS',
  shortBorr: '단기차입',
  seniorBond: '선순위채',
  subDebt: '후순위채',
  secSoldOther: '매도증권·기타'
};

const mixColors = {
  rp: '#91b5e8',
  promNote: '#295dd8',
  elsDls: '#8f8dca',
  shortBorr: '#1b64da',
  seniorBond: '#d7ac64',
  subDebt: '#b78f99',
  secSoldOther: '#bdc6d3'
};

const rateLabels = [
  ['promNote', '발행어음'],
  ['rp', 'RP매도'],
  ['bonds', '사채(선·후순위)'],
  ['borr', '단기차입금'],
  ['call', '콜머니'],
  ['deposits', '고객예탁금 이용료']
];

export const explorerState = {
  firmKey: 'kis',
  expandedFirmKey: 'kis',
  pendingInvestKey: null,
  safetyLens: 'rates',
  regCategory: 'all',
  funding10YrLens: 'ib5_1y',
  hwCategory: 'deposits',
  hwSeriesMode: 'quarterly_fin',
  hwCountryLens: 'composition',
  hwSelectedCountry: 'KR'
};

export function getOpportunityCostDefaults(D) {
  const benchmark = D?.ventureCapitalChain2027?.pcboCleanBenchmark?.modes?.[0];
  const pcbo = benchmark ? Math.round((benchmark.pcboYieldPct - benchmark.fundingBasePct) * 1000) / 10 : 0;
  return {basis: 'dart26q3', spread: D?.opportunityCostAssumptions?.normalNetSpreadBp ?? 150, pcbo, cap: 30};
}

export function calcCost(row, {basis = 'dart26q3', spread = 150, pcbo = 0, cap = 30} = {}) {
  const reference = {
    dart26q3: row.dart26Q3Exact,
    actual: row.fisis2606Exact,
    model: row.model26Q2Legacy
  };
  const base = reference[basis] ?? row.q26Base;
  const delta = row.q27Est - base;
  const obligation = delta * .2 + base * .1;
  const cost = obligation * (spread - pcbo);
  return {base, delta, obligation, cost, after: cost * (1 - cap / 100)};
}

export function setExplorerFirmByName(D, firmName) {
  const found = (D.ib9FirmsCuriosityChain || []).find(x => x.firm === firmName || firmName.includes(x.firm.replace('증권', '')));
  if (found) {
    explorerState.firmKey = found.key;
    explorerState.expandedFirmKey = found.key;
  }
}

function getFirmChain(D, key) {
  const list = D.ib9FirmsCuriosityChain || [];
  return list.find(x => x.key === key) || list[0];
}

function srcBox(text, xrayKey = '') {
  return `<div class="source"><b>출처 및 산정방식</b> · ${text} ${xrayKey ? `<button type="button" class="source-xray-btn" data-xray="${xrayKey}">산식·근거 열기</button> · ` : ''}<a href="#sources">원천·검토 사항 ↗</a></div>`;
}

function miniMixBar(fundingRow) {
  if (!fundingRow) return '';
  return `<div class="mini-mix-bar" role="img" aria-label="${fundingRow.firm} 차입부채 조달 비중">${Object.keys(mixLabels).map(k =>
    `<span title="${mixLabels[k]} ${fundingRow.mixPct[k]}%" style="width:${fundingRow.mixPct[k]}%;background:${mixColors[k]}"></span>`
  ).join('')}</div>`;
}

/* ==========================================================================
   1. #funding — 9대 종투사 2027E 전망 분해 & 인라인 연쇄 드릴다운 (방안 A + C)
   ========================================================================== */
function renderSamsungMediaFacts(D) {
  const media = D.fundingForecast2027?.samsungMediaCheck2026;
  if (!media) return '';
  return `<details class="samsung-facts">
    <summary>삼성증권의 발행 현황과 공개 자료</summary>
    <ul class="samsung-fact-list">${media.verifiedFacts.map(fact => `<li>${fact}</li>`).join('')}</ul>
  </details>`;
}

export function renderFundingBreakdownPanel(D) {
  const list = D.ib9FirmsCuriosityChain || [];
  if (!list.length) return '';
  const k = D.globalKpis;

  return `<section class="panel" id="firm-growth-chain" style="scroll-margin-top:95px">
    <div class="panel-head">
      <div>
        <div class="eyebrow">COMPANY BREAKDOWN · 회사별 성장 전제와 조달 구조</div>
        <h2>2027E ${fmt(k.promNoteIma27EstTril, 0)}조 원 전망, 누가 왜 얼마나 늘리고 다른 수단·수익성은 어떻게 다를까?</h2>
        <p>각 증권사 행을 클릭하면 <b>① 인가 현황·성장 전제 → ② 자본 대비 비율 격차 이유와 대체 조달·실효금리 → ③ 전사 영업 수익성(ROE)</b>이 그 자리에서 펼쳐집니다.</p>
      </div>
      <span class="badge green">9사별 전망</span>
    </div>
    <div class="callout" style="margin-top:0">
      <b>삼성·메리츠 각각 연말 4조 원, 연평잔 2조 원</b>
      <p>메리츠는 전달받은 IR 목표를, 삼성은 같은 숫자를 대시보드 가정으로 적용했습니다. 연말 업권 전망은 발행어음 ${fmt(k.promNote27EstTril, 0)}조 원과 IMA ${fmt(k.ima27EstTril, 0)}조 원을 합한 ${fmt(k.promNoteIma27EstTril, 0)}조 원입니다.</p>
    </div>
    <div class="table-wrap">
      <table class="data-table drill-table" id="funding-chain-table">
        <thead>
          <tr>
            <th scope="col">증권사 · 인가 상태</th>
            <th scope="col">'26.3Q 어음+IMA (DART)</th>
            <th scope="col">'26.3Q 어음/자본 비율</th>
            <th scope="col">'27E 수정 전망</th>
            <th scope="col">'26.3Q 대비 순증</th>
            <th scope="col">'26.1H 실효금리 (FISIS)</th>
            <th scope="col">'26.3Q 연결지배 (9M)</th>
          </tr>
        </thead>
        <tbody id="funding-chain-tbody">
          ${renderFundingChainRows(D)}
        </tbody>
      </table>
    </div>
    ${srcBox('잔액·자본·분기 실적은 OpenDART 2026.3Q 분기보고서, 실효금리는 FISIS 2026.1H입니다. 2027년 전망은 메리츠 IR 목표와 삼성에 적용한 동일 가정을 반영합니다.', 'kpi:forecast-85')}
  </section>`;
}

function renderFundingChainRows(D) {
  const list = D.ib9FirmsCuriosityChain || [];
  return list.map(item => {
    const isOpen = explorerState.expandedFirmKey === item.key;
    const fRow = D.ib9FirmsFunding202606[item.fundingIdx];
    const fisisNote = D.promNoteFisis202606.find(x => x.firm === item.firm);
    const oppRow = (D.opportunityCost2027 || []).find(r => r.key === item.costKey);
    const baseNote = item.base26Q3NoteTril ?? item.base26Q2NoteTril;
    const baseIma = item.base26Q3ImaTril ?? item.base26Q2ImaTril;
    const baseTotal = baseNote + baseIma;
    const estNote = item.est27ModelNoteTril;
    const avgNote = item.est27AverageNoteTril;
    const estTotal = estNote + item.est27ModelImaTril;
    const deltaActual = estTotal - baseTotal;
    const deltaModel = oppRow?.delta ?? deltaActual;
    const capPct = item.capRatio26Q3Pct ?? (fisisNote ? fisisNote.capRatioPct : 0);
    const effNote = fRow?.effRates26H1?.promNote;
    const p = item.profitability || {};
    const q3CfsLabel = item.q3_26CfsCtrlNetIncEok != null
      ? `${fmt(item.q3_26CfsCtrlNetIncEok, 0)}억<br><small class="muted">9M ${fmt(item.m9_26CfsCtrlNetIncEok, 0)}억</small>`
      : (p.h126AnnRoePct ? `${fmt(p.h126AnnRoePct, 1)}%` : '—');

    const detailRow = isOpen ? `<tr class="drill-detail-row">
      <td colspan="7">
        <div class="drill-card">
          <div class="drill-col">
            <div class="drill-step-tag">01 · 인가 현황 &amp; '26.3Q → '27E 전망 전제</div>
            <div class="drill-kv"><span>발행어음 / IMA</span><b>${item.noteLicense} / ${item.imaLicense}</b></div>
            <div class="drill-kv"><span>'26.3Q 확정 (DART)</span><b>어음 ${fmt(baseNote)}조 + IMA ${fmt(baseIma)}조${item.imaLossReserve26Q3Eok > 0 ? ` (준비금 ${fmt(item.imaLossReserve26Q3Eok, 0)}억)` : ''}</b></div>
            <div class="drill-kv"><span>수정 전망 '27E 구성</span><b>어음 ${fmt(estNote)}조${avgNote ? ` (평잔 ${fmt(avgNote)}조)` : ''} + IMA ${fmt(item.est27ModelImaTril)}조</b></div>
            <div class="drill-kv"><span>잠재 범위 · 비고</span><b style="color:var(--teal)">${item.est27UpdatedRangeTril}</b></div>
            <p class="drill-prose">${item.growthPremise}</p>
            ${item.key === 'samsung' ? renderSamsungMediaFacts(D) : ''}
          </div>
          <div class="drill-col">
            <div class="drill-step-tag">02 · 자본 대비 비율 격차 이유 &amp; 대체 조달원가 ('26.2Q FISIS)</div>
            <p class="drill-prose">${item.capRatioWhy}</p>
            ${miniMixBar(fRow)}
            <div class="drill-rate-pills">
              ${rateLabels.map(([rk, rlabel]) => {
                const rv = fRow?.effRates26H1?.[rk];
                return `<span class="rate-pill ${rk === 'promNote' ? 'highlight' : ''}">${rlabel} <b>${rv === null || rv === undefined ? '미발행(26.2Q)' : fmt(rv) + '%'}</b></span>`;
              }).join('')}
            </div>
            <p class="drill-subnote">${item.altFundingNote}</p>
          </div>
          <div class="drill-col">
            <div class="drill-step-tag">03 · 전사 운용·영업 수익성 대조 (OpenDART '26.3Q · FISIS)</div>
            <div class="drill-kv"><span>선순위 신용등급 · 연결 NCR</span><b>${item.creditRating} · NCR ${item.consolNcr26Q3Pct ? fmt(item.consolNcr26Q3Pct, 1) + '%' : '—'}</b></div>
            <div class="drill-kv"><span>'26.3Q 별도 영업익 / 순이익</span><b>${item.q3_26OpIncEok != null ? fmt(item.q3_26OpIncEok, 0) + '억 / ' + fmt(item.q3_26NetIncEok, 0) + '억' : '—'}</b></div>
            <div class="drill-kv"><span>'26.3Q 연결 지배 (9M 누적)</span><b>${item.q3_26CfsCtrlNetIncEok != null ? fmt(item.q3_26CfsCtrlNetIncEok, 0) + '억 (' + fmt(item.m9_26CfsCtrlNetIncEok, 0) + '억)' : '—'}</b></div>
            <p class="drill-prose">${p.takeaway}</p>
            <div class="drill-actions">
              <button type="button" class="btn primary" data-jump-ib="${item.key}">9사 조달·수익성 동기화 비교 →</button>
              <button type="button" class="btn" data-jump-invest="${item.key}">이 회사 모험자본 비용 시뮬레이션 →</button>
              <button type="button" class="btn" data-xray="firm:${item.key}">수익·비용·ROE 통합 요약</button>
            </div>
          </div>
        </div>
      </td>
    </tr>` : '';

    return `<tr class="drill-summary-row ${isOpen ? 'selected' : ''}" data-drill-firm="${item.key}" tabindex="0" role="button" aria-expanded="${isOpen}">
      <td>
        <div class="firm-cell-wrap">
          <span class="drill-chevron" aria-hidden="true">${isOpen ? '▾' : '▸'}</span>
          <b>${item.firm}</b>
          <span class="badge ${item.statusTone}">${item.statusBadge}</span>
        </div>
      </td>
      <td><b>${fmt(baseTotal)}조</b>${baseIma > 0 ? `<br><small class="muted">어음 ${fmt(baseNote)} + IMA ${fmt(baseIma)}</small>` : ''}</td>
      <td>
        <div style="min-width:115px">
          <span>${fmt(capPct, 1)}%</span>
          <div class="bar-track" style="margin-top:4px"><div class="bar-fill" style="width:${Math.min(100, capPct / 2)}%"></div></div>
        </div>
      </td>
      <td><b>${fmt(estTotal)}조</b>${avgNote ? `<br><small class="muted">수익평잔 ${fmt(avgNote)}조</small>` : ''}</td>
      <td style="color:var(--teal);font-weight:600">${deltaActual >= 0 ? '+' : ''}${fmt(deltaActual)}조${Math.abs(deltaModel - deltaActual) > 0.01 ? `<br><small class="muted">모형 +${fmt(deltaModel)}조</small>` : ''}</td>
      <td>${effNote === null || effNote === undefined ? '<span class="muted">26.09 인가</span>' : fmt(effNote) + '%'}${item.key === 'kb' ? ' <span class="badge amber" title="과거 고금리 약정물 만기정산 반영">이월정산</span>' : ''}</td>
      <td><b>${q3CfsLabel}</b></td>
    </tr>${detailRow}`;
  }).join('');
}

export function bindFundingBreakdownPanel(D, onNavigate) {
  const tbody = document.getElementById('funding-chain-tbody');
  if (!tbody) return;

  const rerender = () => {
    tbody.innerHTML = renderFundingChainRows(D);
    attachEvents();
  };

  const attachEvents = () => {
    tbody.querySelectorAll('[data-drill-firm]').forEach(row => {
      const toggle = () => {
        const key = row.dataset.drillFirm;
        explorerState.firmKey = key;
        explorerState.expandedFirmKey = explorerState.expandedFirmKey === key ? '' : key;
        rerender();
      };
      row.addEventListener('click', toggle);
      row.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggle();
        }
      });
    });

    tbody.querySelectorAll('[data-jump-ib]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        explorerState.firmKey = btn.dataset.jumpIb;
        onNavigate('ib-funding');
      });
    });

    tbody.querySelectorAll('[data-jump-invest]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const key = btn.dataset.jumpInvest;
        const chain = getFirmChain(D, key);
        explorerState.firmKey = key;
        explorerState.pendingInvestKey = chain?.costKey || key;
        onNavigate('invest');
      });
    });
  };

  attachEvents();
}

/* ==========================================================================
   2. #funding — 머니무브 대기자금 금리 사다리 & 9사 신용등급·원금보호 렌즈 (관점 4)
   ========================================================================== */
export function renderMoneyMoveSafetyPanel(D) {
  const m = D.moneyMoveAndSafety2026Q4;
  if (!m) return '';
  const hw = D.householdWealthAndIntl2026?.headlineKpis;
  const hhTotalLabel = hw ? `${fmt(hw.krTotalHouseholdAssets25Tril, 1)}조 원` : '16,641.3조 원';
  const hhSubLabel = hw
    ? `실물 ${fmt(hw.krNonFinAssets25Tril, 1)}조 · 금융('26.2Q) ${fmt(hw.krFinAssets26Q2Tril, 1)}조`
    : '실물 10,433.7조 · 금융(\'26.2Q) 6,930.2조';

  return `<section class="panel" id="money-move-safety" style="scroll-margin-top:95px">
    <div class="panel-head">
      <div>
        <div class="eyebrow">MONEY MOVE &amp; CREDIT BUFFER · 대기자금 이동 경로와 발행사 안전성</div>
        <h2>시중 대기자금은 어떤 금리 차이로 움직이고, 발행사 신용·원금보호는 얼마나 안전할까?</h2>
        <p>수신금리 스펙트럼과 예금자보호 미적용 상품을 뒷받침하는 9대 종투사 자체 신용등급·자본완충력을 함께 대조합니다.</p>
      </div>
      <div class="lens-switch" role="group" aria-label="머니무브 및 안전성 보기 전환">
        <button type="button" class="lens-btn ${explorerState.safetyLens === 'rates' ? 'active' : ''}" data-safety-lens="rates">수신금리 매력도 사다리</button>
        <button type="button" class="lens-btn ${explorerState.safetyLens === 'credit' ? 'active' : ''}" data-safety-lens="credit">9사 신용등급 · 원금보호 조건</button>
      </div>
    </div>
    <div class="grid4-metrics" style="margin-bottom:18px">
      <a href="#household-wealth" class="metric metric-link-card" id="jump-household-wealth" data-jump-household aria-label="전체 가계자산 상세 브레이크다운 및 5개국 비교 탭으로 이동">
        <div class="metric-link-top">
          <small>전체 가계자산 ('25말 국민대차대조표)</small>
          <span class="badge green">상세 · 5개국 ↗</span>
        </div>
        <strong style="font-size:24px;color:var(--teal)">${hhTotalLabel}</strong>
        <p class="muted">${hhSubLabel}</p>
      </a>
      ${m.macroLiquidity.map((x, idx) => {
        const xk = idx === 0 ? 'kpi:mm-m2' : idx === 1 ? 'kpi:mm-pension' : 'kpi:mm-deposits';
        return `<div class="metric" data-xray="${xk}" tabindex="0" role="button"><small>${x.label}</small><strong style="font-size:24px">${x.amount}</strong><p class="muted">${x.sub}</p></div>`;
      }).join('')}
    </div>
    <div id="money-move-body" aria-live="polite">
      ${renderMoneyMoveBody(D)}
    </div>
    ${srcBox('한국은행·국가데이터처 국민대차대조표(2025말 ECOS 291Y505) · 자금순환(2026.2Q ECOS 281Y002) · 통화 및 예금은행 가중평균금리(2026.09) · 통합연금포털(2025말 501.4조) · FISIS(202606 SF324·SF209·SF408) · 국내 신용평가 3사 무보증 선순위 회사채 신용등급(2026년 하반기). 전체 가계자산 카드를 클릭하면 가계·법인 세부 브레이크다운 및 5개국 비교 탭으로 이동합니다.', 'kpi:mm-m2')}
  </section>`;
}

function renderMoneyMoveBody(D) {
  const m = D.moneyMoveAndSafety2026Q4;
  if (explorerState.safetyLens === 'rates') {
    return `<div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th scope="col">수신 · 대기자금 비히클</th>
            <th scope="col">금리 · 수익률 범위 ('26.4Q)</th>
            <th scope="col">상대 금리 위치</th>
            <th scope="col">만기 성격</th>
            <th scope="col">원금 보호 · 신용 구조</th>
            <th scope="col">머니무브 핵심 포인트</th>
          </tr>
        </thead>
        <tbody>
          ${m.rateSpectrum.map((r, idx) => `<tr class="${idx >= 3 ? 'selected' : ''}">
            <td><b>${r.product}</b></td>
            <td style="color:var(--teal);font-weight:700">${r.rate}</td>
            <td style="min-width:110px"><div class="bar-track"><div class="bar-fill" style="width:${r.barPct}%;background:${idx >= 3 ? '#004ea2' : '#7ea6c8'}"></div></div></td>
            <td>${r.maturity}</td>
            <td>${r.protection}</td>
            <td style="text-align:left">${r.note}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
    <div class="callout" style="margin-bottom:0">
      <b>퇴직연금(378.1조 원리금보장) 교차판매 연결</b> · 퇴직연금감독규정 제9조제3항(자사 원리금보장상품 편입 금지)에 따라 증권사 간 교차편입 생태계가 형성될 수 있으나, 발행어음·IMA의 연금 편입 가능 범위와 한도는 감독규정 적용 요건을 함께 확인해야 합니다.
      <div style="margin-top:8px"><a class="btn" href="?q=guide-pension-eligibility#questions" data-qa-jump="guide-pension-eligibility">질문·답변 · 퇴직연금 편입 조건 자세히 보기 →</a></div>
    </div>`;
  }

  const list = D.ib9FirmsCuriosityChain || [];
  return `<div class="table-wrap">
    <table class="data-table">
      <thead>
        <tr>
          <th scope="col">증권사 (클릭 시 조달 상세)</th>
          <th scope="col">선순위 신용등급</th>
          <th scope="col">별도 자기자본 ('26.2Q)</th>
          <th scope="col">연결 영업용순자본/총위험액</th>
          <th scope="col">3개월 유동성비율</th>
          <th scope="col">취급 인가 비히클</th>
        </tr>
      </thead>
      <tbody>
        ${list.map(item => {
          const fRow = D.ib9FirmsFunding202606[item.fundingIdx];
          return `<tr>
            <td><button type="button" data-credit-firm="${item.key}" style="font-weight:700">${item.firm} ↗</button></td>
            <td><span class="badge ${item.creditRating === 'AA+' ? 'green' : item.creditRating === 'AA0' ? 'blue' : 'amber'}">${item.creditRating}</span></td>
            <td>${fmt(fRow.equity)}조</td>
            <td><b>${fmt(fRow.ratios.consolCapOverRisk, 1)}%</b></td>
            <td>${fmt(fRow.ratios.liq3m, 1)}%</td>
            <td style="text-align:left">어음(${item.noteLicense})${item.imaLicense.startsWith('미인가') ? '' : ` · <b style="color:var(--teal)">IMA(${item.imaLicense})</b>`}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
  </div>
  <div class="grid2" style="margin-top:16px">
    <div class="callout" style="margin:0">
      <b>발행어음 · 중도해지 시에도 원금 손실 없음</b>
      <p>예금자보호법(1억 원) 대상은 아니나 별도자본 5.9~13.2조 원·신용등급 AA급 종투사의 선순위 자체 신용 채무입니다. 만기 1년 이내 확정금리 약정이며 중도해지 시 약정 이율만 차감되고 원금은 보전됩니다.</p>
    </div>
    <div class="callout amber" style="margin:0">
      <b>IMA · 만기 보유 시에만 원금지급 약정 작동</b>
      <p>자본 8조 이상 종투사가 만기 보유 고객에게 원금 지급을 약정하고 수탁고의 5%를 고유 손실충당금으로 우선 적립하지만, <b>만기 전 중도해지 시에는 운용실적 손실 차감과 해지수수료로 원금 손실이 발생할 수 있습니다.</b></p>
    </div>
  </div>`;
}

export function bindMoneyMoveSafetyPanel(D, onNavigate) {
  const root = document.getElementById('money-move-safety');
  if (!root) return;

  const bindInner = () => {
    root.querySelectorAll('[data-credit-firm]').forEach(btn => {
      btn.addEventListener('click', () => {
        explorerState.firmKey = btn.dataset.creditFirm;
        explorerState.expandedFirmKey = btn.dataset.creditFirm;
        onNavigate('ib-funding');
      });
    });
  };

  root.querySelectorAll('[data-safety-lens]').forEach(btn => {
    btn.addEventListener('click', () => {
      explorerState.safetyLens = btn.dataset.safetyLens;
      root.querySelectorAll('[data-safety-lens]').forEach(x => x.classList.toggle('active', x === btn));
      document.getElementById('money-move-body').innerHTML = renderMoneyMoveBody(D);
      bindInner();
    });
  });

  bindInner();
}

/* ==========================================================================
   3. #ib-funding — 9대 증권사 상호 연동 엔티티 렌즈 (방안 B: 조달믹스 + 실효금리 + 수익성)
   ========================================================================== */
export function renderIbSynchronizedExplorer(D) {
  const chainList = D.ib9FirmsCuriosityChain || [];
  const activeChain = getFirmChain(D, explorerState.firmKey);

  return `<div class="callout" style="margin-top:0">
    <b>증권사 선택 시 조달구성 · 수단별 실효금리 · 자본버퍼 · 전사 수익성(ROE)이 동시에 연동됩니다.</b>
    <p>전사 재무·규제비율(FISIS SF325·SF324·SF321·SF307·SF408·SF331) 기준이며, 전사 판관비·순영업수익·ROE를 발행어음 단독 상품 손익으로 치환하지 않습니다.</p>
  </div>
  <section class="panel">
    <div class="panel-head">
      <div>
        <div class="eyebrow">SYNCHRONIZED ENTITY LENS · 9대 종투사 전사 조달 포트폴리오</div>
        <h2>9대 증권사 차입부채 472.75조 원 · 무엇으로 얼마의 금리에 조달할까?</h2>
        <p>상단 칩이나 표의 증권사를 클릭하면 아래 <b>수단별 실효금리('26.1H)</b>와 <b>전사 수익성 대조표</b>가 함께 전환됩니다.</p>
      </div>
      <span class="badge blue">전사 기준 · 2026.2Q</span>
    </div>
    <div class="grid3" style="margin-bottom:16px">
      <div class="metric" data-xray="kpi:ib-debt-472" tabindex="0" role="button"><small>9사 차입부채 합계 (SF325)</small><strong>472.75 <small>조 원</small></strong><p class="muted">RP 31.0% · 단기차입 23.9% · ELS 17.7%</p></div>
      <div class="metric" data-xray="kpi:mm-deposits" tabindex="0" role="button"><small>별도 고객예수금 (SF324)</small><strong>158.50 <small>조 원</small></strong><p class="muted">증권금융 별도예치 · 고유차입과 분리</p></div>
      <div class="metric" data-xray="kpi:actual-5854" tabindex="0" role="button"><small>발행어음 잔액 ('26.2Q 확정)</small><strong>55.94 <small>조 원</small></strong><p class="muted">차입부채의 11.8% · '26.09 9사 전원 인가</p></div>
    </div>
    <div class="chips" id="ib-sync-chips" role="group" aria-label="증권사 선택 렌즈">
      ${chainList.map(c => `<button type="button" class="chip ${c.key === activeChain.key ? 'active' : ''}" data-sync-firm="${c.key}">${c.firm}</button>`).join('')}
    </div>
    <div class="chips" style="margin:6px 0 16px">
      ${Object.keys(mixLabels).map(k => `<span style="font-size:11px;display:inline-flex;align-items:center;gap:5px"><i style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${mixColors[k]}"></i>${mixLabels[k]}</span>`).join('')}
    </div>
    <div class="table-wrap">
      <table class="data-table" id="ib-sync-portfolio-table">
        <thead>
          <tr>
            <th scope="col">증권사</th>
            <th scope="col">차입부채 합계</th>
            <th scope="col">7대 조달수단 구성비</th>
            <th scope="col">어음 비중</th>
            <th scope="col">'26.1H 어음 / RP / 사채 실효금리</th>
            <th scope="col">인가 상태</th>
          </tr>
        </thead>
        <tbody>
          ${D.ib9FirmsFunding202606.map(r => {
            const c = chainList.find(x => x.firm === r.firm);
            const selected = c && c.key === activeChain.key;
            const er = r.effRates26H1 || {};
            return `<tr class="${selected ? 'selected' : ''}" data-sync-row="${c ? c.key : 'kis'}" style="cursor:pointer">
              <td><button type="button" data-sync-firm="${c ? c.key : 'kis'}"><b>${r.firm}</b></button></td>
              <td>${fmt(r.fundingTotal)}조</td>
              <td style="min-width:210px">${miniMixBar(r)}</td>
              <td><b>${fmt(r.mixPct.promNote, 1)}%</b></td>
              <td>${er.promNote !== null && er.promNote !== undefined ? fmt(er.promNote) + '%' : '—'} / ${fmt(er.rp)}% / ${fmt(er.bonds)}%</td>
              <td><span class="badge ${c ? c.statusTone : 'blue'}">${c ? c.statusBadge : ''}</span></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
    ${srcBox('FISIS 202606 SF325(차입부채)·SF324(고객예수금)·SF321(수단별 이자비용 기반 상반기 연환산 실효금리). 7개 항목 단순 합계(472.65조)와 총계(472.75조)의 0.10조 차이는 항목별 반올림 누적 단수차입니다.', 'kpi:ib-debt-472')}
  </section>
  ${renderIb10YrFundingDataPanel(D, activeChain.key)}
  <div id="ib-sync-focus-panel" aria-live="polite" style="scroll-margin-top:95px">
    ${renderIbFirmFocusCard(D, activeChain)}
  </div>
  <section class="panel" id="ib-profitability-matrix" style="scroll-margin-top:95px">
    <div class="panel-head">
      <div>
        <div class="eyebrow">FUNDING MODEL TO ROE · 조달 구조에서 전사 영업 수익성까지</div>
        <h2>조달 전략이 다른 9대 증권사, 실제 운용·영업 수익성(ROE)은 어떻게 다를까?</h2>
        <p>어음 레버리지형(한국투자), 저원가 예탁금·저판관비형(키움), WM·RP형(삼성·미래), 구조화 사채 차환형(메리츠)의 전사 실적을 같은 눈금에서 대조합니다.</p>
      </div>
      <span class="badge green">FISIS 별도 · DART 연결 병기</span>
    </div>
    <div class="table-wrap" id="ib-sync-profit-table">
      ${renderIbProfitabilityTable(D, activeChain.key)}
    </div>
    ${srcBox('FISIS 증권사 요약손익계산서(SF307, 별도 기준 2025년 연간 및 2026년 상반기 누적) 및 DART 사업보고서(연결 영업이익·당기순이익 병기). 2026.1H ROE는 반기 별도순이익 단순 연환산 수치이며, 전사 수익성 차이는 리테일·IB·트레이딩·판관비 구조가 결합된 결과로 발행어음 단독 효과를 뜻하지 않습니다.', 'kpi:kis-mirae-lev')}
  </section>`;
}

function fmtBp(v) {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return '—';
  const n = Number(v);
  return `${n > 0 ? '+' : ''}${fmt(n, 1)}bp`;
}

function fmtSig(t, p) {
  if (t === null || t === undefined) return '—';
  const star = p != null && p < 0.01 ? '***' : (p != null && p < 0.05 ? '**' : (p != null && p < 0.1 ? '*' : ''));
  return `${t > 0 ? '+' : ''}${fmt(t, 2)}${star}`;
}

function renderIb10YrFundingTable(D, activeKey) {
  const ds = D.fundingRate10YrDataset2016_2026;
  if (!ds || !Array.isArray(ds.firmSummary10Yr)) return '';
  const lens = explorerState.funding10YrLens || 'ib5_1y';
  const rows = [...ds.firmSummary10Yr];

  if (lens === 'bond_3y') {
    rows.sort((a, b) => (a.bondVsMatched3YBp?.mean ?? 999) - (b.bondVsMatched3YBp?.mean ?? 999));
    return `<table class="data-table">
      <thead>
        <tr>
          <th scope="col">증권사 (등급)</th>
          <th scope="col">관측 분기</th>
          <th scope="col">사채 − 동일등급 3Y</th>
          <th scope="col">등급보정 알파</th>
          <th scope="col">Newey-West t</th>
          <th scope="col">사채 내 전단채(A60)</th>
          <th scope="col">사채 내 후순위(A8)</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(r => `<tr class="${r.key === activeKey ? 'selected' : ''}" data-10yr-firm="${r.key}" style="cursor:pointer">
          <td><button type="button" data-sync-firm="${r.key}"><b>${r.firm}</b></button> <small class="muted">(${r.ratingCurrent})</small></td>
          <td>${r.bondVsMatched3YBp?.n ?? 0}분기</td>
          <td style="font-weight:700;color:${(r.bondVsMatched3YBp?.mean ?? 0) < 0 ? '#004ea2' : '#c4362e'}">${fmtBp(r.bondVsMatched3YBp?.mean)}</td>
          <td>${fmtBp(r.bondVsMatched3YBp?.ratingAdjAlphaBp)}</td>
          <td>${fmtSig(r.bondVsMatched3YBp?.tNwAlpha, r.bondVsMatched3YBp?.pNwAlpha)}</td>
          <td>${fmt(r.mix10YrPct?.shortCpA60OfBond, 1)}%</td>
          <td>${fmt(r.mix10YrPct?.subDebtA8OfBond, 1)}%</td>
        </tr>`).join('')}
      </tbody>
    </table>`;
  }

  if (lens === 'rp_note') {
    rows.sort((a, b) => (a.rpVsPeerBp?.mean ?? 999) - (b.rpVsPeerBp?.mean ?? 999));
    return `<table class="data-table">
      <thead>
        <tr>
          <th scope="col">증권사 (등급)</th>
          <th scope="col">RP − 9사 평균</th>
          <th scope="col">RP 승률</th>
          <th scope="col">RP t_NW</th>
          <th scope="col">10년 RP 비중</th>
          <th scope="col">발행어음 − 동일등급 1Y</th>
          <th scope="col">어음 '22~'23 / '24~'26</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(r => `<tr class="${r.key === activeKey ? 'selected' : ''}" data-10yr-firm="${r.key}" style="cursor:pointer">
          <td><button type="button" data-sync-firm="${r.key}"><b>${r.firm}</b></button> <small class="muted">(${r.ratingCurrent})</small></td>
          <td style="font-weight:700;color:${(r.rpVsPeerBp?.mean ?? 0) < 0 ? '#004ea2' : '#c4362e'}">${fmtBp(r.rpVsPeerBp?.mean)}</td>
          <td>${fmt(r.rpVsPeerBp?.winRatePct, 1)}%</td>
          <td>${fmtSig(r.rpVsPeerBp?.tNw, r.rpVsPeerBp?.pNw)}</td>
          <td>${fmt(r.mix10YrPct?.rpOfIb5, 1)}%</td>
          <td><b>${fmtBp(r.promNoteVsMatched1YBp?.mean)}</b>${r.promNoteVsMatched1YBp?.n ? ` <small class="muted">(n=${r.promNoteVsMatched1YBp.n})</small>` : ''}</td>
          <td>${r.promNoteVsMatched1YBp?.mean != null ? `${fmtBp(r.promNoteVsMatched1YBp?.reg22_23)} / ${fmtBp(r.promNoteVsMatched1YBp?.reg24_26)}` : '—'}</td>
        </tr>`).join('')}
      </tbody>
    </table>`;
  }

  rows.sort((a, b) => (a.ib5VsMatched1YBp?.mean ?? 999) - (b.ib5VsMatched1YBp?.mean ?? 999));
  return `<table class="data-table">
    <thead>
      <tr>
        <th scope="col">증권사 (등급)</th>
        <th scope="col">종합 − 동일등급 1Y</th>
        <th scope="col">등급보정 알파</th>
        <th scope="col">Newey-West t</th>
        <th scope="col">'16~'21 (저금리)</th>
        <th scope="col">'22~'23 (급등기)</th>
        <th scope="col">'24~'26 (최근)</th>
        <th scope="col">RP / 사채 비중</th>
      </tr>
    </thead>
    <tbody>
      ${rows.map(r => `<tr class="${r.key === activeKey ? 'selected' : ''}" data-10yr-firm="${r.key}" style="cursor:pointer">
        <td><button type="button" data-sync-firm="${r.key}"><b>${r.firm}</b></button> <small class="muted">(${r.ratingCurrent})</small></td>
        <td style="font-weight:700;color:${(r.ib5VsMatched1YBp?.mean ?? 0) < 0 ? '#004ea2' : '#c4362e'}">${fmtBp(r.ib5VsMatched1YBp?.mean)}</td>
        <td>${fmtBp(r.ib5VsMatched1YBp?.ratingAdjAlphaBp)}</td>
        <td>${fmtSig(r.ib5VsMatched1YBp?.tNwAlpha, r.ib5VsMatched1YBp?.pNwAlpha)}</td>
        <td>${fmtBp(r.ib5VsMatched1YBp?.reg16_21)}</td>
        <td>${fmtBp(r.ib5VsMatched1YBp?.reg22_23)}</td>
        <td>${fmtBp(r.ib5VsMatched1YBp?.reg24_26)}</td>
        <td>${fmt(r.mix10YrPct?.rpOfIb5, 1)}% / ${fmt(r.mix10YrPct?.bondOfIb5, 1)}%</td>
      </tr>`).join('')}
    </tbody>
  </table>`;
}

function getIb5DebtTril(D, firmName) {
  const row = (D.ib9FirmsFunding202606 || []).find(x => x.firm === firmName);
  if (!row?.mixTril) return null;
  const m = row.mixTril;
  return (m.rp || 0) + (m.promNote || 0) + (m.shortBorr || 0) + (m.seniorBond || 0) + (m.subDebt || 0);
}

function renderIb10YrFundingVisual(D, activeKey) {
  const ds = D.fundingRate10YrDataset2016_2026;
  if (!ds || !Array.isArray(ds.firmSummary10Yr)) return '';
  const lens = explorerState.funding10YrLens || 'ib5_1y';
  const metricFor = r => {
    if (lens === 'bond_3y') return { val: r.bondVsMatched3YBp?.mean ?? null, sub: `등급보정 ${fmtBp(r.bondVsMatched3YBp?.ratingAdjAlphaBp)}` };
    if (lens === 'rp_note') return { val: r.rpVsPeerBp?.mean ?? null, sub: r.promNoteVsMatched1YBp?.mean != null ? `어음 ${fmtBp(r.promNoteVsMatched1YBp.mean)}` : '어음 미관측' };
    return { val: r.ib5VsMatched1YBp?.mean ?? null, sub: `급등기 ${fmtBp(r.ib5VsMatched1YBp?.reg22_23)}` };
  };
  const titleMap = {
    ib5_1y: '종합 5대 차입금리 − 동일등급 회사채 1Y (10년 평균, bp)',
    bond_3y: '무담보 사채 − 동일등급 회사채 3Y (10년 평균, bp)',
    rp_note: 'RP 매도 − 9사 평균 (10년 평균, bp)'
  };

  const rows = [...ds.firmSummary10Yr]
    .map(r => ({ ...r, metric: metricFor(r), ib5DebtTril: getIb5DebtTril(D, r.firm) }))
    .filter(r => r.metric.val !== null)
    .sort((a, b) => a.metric.val - b.metric.val);
  const maxAbs = Math.max(20, ...rows.map(r => Math.abs(r.metric.val)));
  const selected = rows.find(r => r.key === activeKey) || rows[0];
  const sens10bpEok = selected?.ib5DebtTril != null ? selected.ib5DebtTril * 10 : null;
  const impliedRefEok = (selected?.ib5DebtTril != null && selected.ib5VsMatched1YBp?.mean != null)
    ? selected.ib5DebtTril * selected.ib5VsMatched1YBp.mean
    : null;

  return `<div class="tenyr-vis-wrap">
    <div class="tenyr-vis-chart">
      <div class="tenyr-vis-head">
        <b>${titleMap[lens]}</b>
        <span class="muted">← 왼쪽(파랑): 벤치마크 대비 저렴 · 오른쪽(빨강): 높음 →</span>
      </div>
      <div class="tenyr-div-list">
        ${rows.map(r => {
          const v = r.metric.val;
          const pct = Math.min(50, Math.abs(v) / maxAbs * 48);
          const isNeg = v < 0;
          const sel = r.key === activeKey;
          return `<button type="button" class="tenyr-div-row ${sel ? 'selected' : ''}" data-10yr-firm="${r.key}">
            <span class="tenyr-div-firm"><b>${r.firm}</b> <small class="muted">${r.ratingCurrent}</small></span>
            <span class="tenyr-div-track" aria-hidden="true">
              <i class="tenyr-div-zero"></i>
              <i class="tenyr-div-bar ${isNeg ? 'is-neg' : 'is-pos'}" style="${isNeg ? `right:50%;width:${pct.toFixed(1)}%` : `left:50%;width:${pct.toFixed(1)}%`}"></i>
            </span>
            <span class="tenyr-div-val tabular" style="color:${isNeg ? '#004ea2' : '#c4362e'}">${fmtBp(v)}</span>
            <span class="tenyr-div-sub muted tabular">${r.metric.sub}</span>
          </button>`;
        }).join('')}
      </div>
    </div>
    ${selected ? `<div class="tenyr-sens-strip">
      <div class="tenyr-sens-card">
        <small>${selected.firm} · 5대 이자부 차입부채 ('26.2Q)</small>
        <strong class="tabular">${selected.ib5DebtTril != null ? fmt(selected.ib5DebtTril, 2) + '조 원' : '—'}</strong>
        <span class="muted">RP·어음·단기차입·선/후순위채 합계</span>
      </div>
      <div class="tenyr-sens-card">
        <small>조달금리 10bp 차이 = 연 이자비용 민감도</small>
        <strong class="tabular" style="color:#004ea2">${sens10bpEok != null ? fmt(sens10bpEok, 0) + '억 원/년' : '—'}</strong>
        <span class="muted">단순 규모 환산 (잔액 × 0.10%)</span>
      </div>
      <div class="tenyr-sens-card">
        <small>금리 사이클 3국면 (종합 − 동일등급 1Y)</small>
        <strong class="tabular" style="font-size:13.5px">'16~'21 ${fmtBp(selected.ib5VsMatched1YBp?.reg16_21)} · '22~'23 ${fmtBp(selected.ib5VsMatched1YBp?.reg22_23)} · '24~'26 ${fmtBp(selected.ib5VsMatched1YBp?.reg24_26)}</strong>
        <span class="muted">${impliedRefEok != null ? `참고: 10년 평균 스프레드 단순 적용 시 연 ${impliedRefEok > 0 ? '+' : ''}${fmt(impliedRefEok, 0)}억 규모` : '국면별 원천 관측치'}</span>
      </div>
    </div>` : ''}
  </div>`;
}

function renderIb10YrFundingDataPanel(D, activeKey) {
  const ds = D.fundingRate10YrDataset2016_2026;
  if (!ds) return '';
  const lens = explorerState.funding10YrLens || 'ib5_1y';
  return `<section class="panel" id="ib-10yr-funding-panel" style="scroll-margin-top:95px">
    <div class="panel-head">
      <div>
        <div class="eyebrow">10-YEAR FUNDING RATE BENCHMARK · 원천 정량 데이터 (2016.1Q ~ 2026.2Q · 42분기)</div>
        <h2>9대 증권사 10년 실효조달금리 · 동일 신용등급 회사채 대비 스프레드 원천표</h2>
        <p>순수 5대 이자부 차입수단(RP·발행어음·사채·차입금·콜; ELS·매도증권·예수금 제외)의 분기 연환산 실효금리와 각 사 신용등급에 맞춘 KOFIA 회사채 민평 대비 스프레드(음수 <code>−</code>가 저렴)입니다.</p>
      </div>
      <span class="badge amber">데이터 선행 공개 · 해석 검토중</span>
    </div>
    <div class="lens-toolbar" style="margin-bottom:12px">
      <div class="lens-switch" id="ib-10yr-lens-switch" role="group" aria-label="10년 조달금리 비교 기준 선택">
        <button type="button" class="lens-btn ${lens === 'ib5_1y' ? 'active' : ''}" data-10yr-lens="ib5_1y">① 종합 차입금리 vs 동일등급 1Y</button>
        <button type="button" class="lens-btn ${lens === 'bond_3y' ? 'active' : ''}" data-10yr-lens="bond_3y">② 무담보 사채 vs 동일등급 3Y</button>
        <button type="button" class="lens-btn ${lens === 'rp_note' ? 'active' : ''}" data-10yr-lens="rp_note">③ RP vs 9사 평균 · 발행어음 vs 1Y</button>
      </div>
      <span class="muted" style="font-size:11px">음수(−) = 벤치마크 대비 저렴 · *** p&lt;0.01, ** p&lt;0.05</span>
    </div>
    <div id="ib-10yr-funding-visual" aria-live="polite">
      ${renderIb10YrFundingVisual(D, activeKey)}
    </div>
    <div class="table-wrap" id="ib-10yr-funding-table">
      ${renderIb10YrFundingTable(D, activeKey)}
    </div>
    <div class="callout amber" style="margin-bottom:0">
      <b>데이터 선행 적재 안내 (해석 보류)</b> · ${ds.statusNote} 원화·외화 조달 비중, 세부 만기(초단기 vs 장기), 담보 구성(국공채 vs 크레딧)에 따른 원인 분해는 추후 심화 검토 과제입니다.
    </div>
    ${srcBox('금감원 FISIS OpenAPI SF321(분기 단독 이자비용)·SF325(기말 차입부채 잔액, 2015.4Q~2026.2Q) 및 금융투자협회(KOFIA) 공모 무보증 회사채 AA+·AA0·AA-(1Y·3Y) 일별 민평 15,492건 분기평균(키움증권은 2016~2022 AA- → 2023~2026 AA0 동태 매핑). Newey-West HAC t-통계량(lag=4).', 'kpi:ib-debt-472')}
  </section>`;
}

function renderIbFirmFocusCard(D, c) {
  const r = D.ib9FirmsFunding202606[c.fundingIdx];
  const p = c.profitability || {};
  const er = r.effRates26H1 || {};
  return `<section class="panel sync-highlight-panel">
    <div class="panel-head">
      <div>
        <div class="eyebrow">SELECTED FIRM LENS · ${r.strategyGroup}</div>
        <h2>${r.firm} · 조달원가 · 규제버퍼 · 수익성 한눈에 연결</h2>
        <p>${c.capRatioWhy}</p>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <span class="badge green">신용등급 ${c.creditRating}</span>
        <span class="badge ${c.statusTone}">${c.statusBadge}</span>
      </div>
    </div>
    <div class="grid4-metrics">
      <div class="metric" data-xray="firm:${c.key}" tabindex="0" role="button"><small>규제 레버리지 (한도 1,100%)</small><strong>${fmt(r.ratios.leverageReg, 1)}%</strong><p class="muted">순수 자산÷자본 ${fmt(r.ratios.leverageRawX, 1)}배</p></div>
      <div class="metric" data-xray="firm:${c.key}" tabindex="0" role="button"><small>연결 순자본 ÷ 총위험액</small><strong>${fmt(r.ratios.consolCapOverRisk, 1)}%</strong><p class="muted">개별 ${fmt(r.ratios.indivCapOverRisk, 1)}% · 유동성 ${fmt(r.ratios.liq3m, 1)}%</p></div>
      <div class="metric" data-xray="firm:${c.key}" tabindex="0" role="button"><small>'25년 순익 / 별도 ROE</small><strong>${p.fy25NetIncEok ? fmt(p.fy25NetIncEok, 0) + '억' : '연결 ' + fmt(p.fy25CfsNetIncEok, 0) + '억'}</strong><p class="muted">${p.fy25RoePct ? '별도 ROE ' + fmt(p.fy25RoePct, 1) + '%' : '연결 ROE ' + fmt(p.fy25CfsRoePct, 1) + '%'}${p.fy25CfsRoePct && p.fy25RoePct ? ' (연결 ' + fmt(p.fy25CfsRoePct, 1) + '%)' : ''}</p></div>
      <div class="metric" data-xray="firm:${c.key}" tabindex="0" role="button"><small>'26.1H 반기 순익 / 판관비율</small><strong style="color:var(--teal)">${p.h126NetIncEok ? fmt(p.h126NetIncEok, 0) + '억' : '어음이자 ' + fmt(p.h126NoteIntEok, 0) + '억'}</strong><p class="muted">${p.h126AnnRoePct ? '연환산 ROE ' + fmt(p.h126AnnRoePct, 1) + '% · 판관비율 ' + fmt(p.h126CostIncomePct, 1) + '%' : p.basis}</p></div>
    </div>
    <div class="grid2" style="margin-top:18px">
      <div>
        <h3 style="margin-bottom:10px;font-size:14px">① 7대 차입부채 잔액 및 구성비 ('26.2Q)</h3>
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th>조달 수단</th><th>잔액 (조 원)</th><th>비중</th></tr></thead>
            <tbody>
              ${Object.keys(mixLabels).map(k => `<tr><td>${mixLabels[k]}</td><td>${fmt(r.mixTril[k])}</td><td>${fmt(r.mixPct[k], 1)}%</td></tr>`).join('')}
              <tr style="background:#f8fafb"><td><b>별도 고객예수금 (차입 외)</b></td><td><b>${fmt(r.deposits)}</b></td><td>별도예치</td></tr>
            </tbody>
          </table>
        </div>
      </div>
      <div>
        <h3 style="margin-bottom:10px;font-size:14px">② 조달수단별 '26.1H 연환산 실효금리 비교 (FISIS 복원)</h3>
        <div class="eff-rate-list">
          ${rateLabels.map(([rk, label]) => {
            const val = er[rk];
            const width = val ? Math.min(100, (val / 5.0) * 100) : 0;
            return `<div class="eff-rate-item">
              <div class="stat-row" style="padding:7px 0;border:0">
                <span>${label}${rk === 'promNote' && c.key === 'kb' ? ' <span class="badge amber">과거 특판 만기정산 반영</span>' : ''}</span>
                <b>${val === null || val === undefined ? '26.2Q 미발행 (26.09 인가)' : fmt(val) + '%'}</b>
              </div>
              <div class="bar-track"><div class="bar-fill" style="width:${width}%;background:${rk === 'promNote' ? '#004ea2' : '#6c8ebf'}"></div></div>
            </div>`;
          }).join('')}
        </div>
        <div class="callout" style="margin:14px 0 0;font-size:11px">
          <b>핵심 연결 해석</b> · ${c.altFundingNote}<br>
          <span style="color:#455a64">${p.takeaway}</span>
        </div>
      </div>
    </div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:16px">
      <button type="button" class="btn primary" data-focus-jump-invest="${c.key}">${r.firm} 모험자본 기회비용 계산하기 →</button>
      <a class="btn" href="#funding">2027년 수신 전망 분해표로 돌아가기 ↗</a>
    </div>
  </section>`;
}

function renderIbProfitabilityTable(D, activeKey) {
  const list = D.ib9FirmsCuriosityChain || [];
  return `<table class="data-table">
    <thead>
      <tr>
        <th scope="col">증권사 (클릭 연동)</th>
        <th scope="col">별도자본 ('26.2Q)</th>
        <th scope="col">어음/자본 ('26.2Q)</th>
        <th scope="col">'25년 순영업수익</th>
        <th scope="col">'25년 영업이익</th>
        <th scope="col">'25년 당기순이익</th>
        <th scope="col">'25년 별도 ROE</th>
        <th scope="col">'26.1H 순영업수익</th>
        <th scope="col">'26.1H 당기순이익</th>
        <th scope="col">'26.1H 판관비율</th>
        <th scope="col">'26.1H 연환산 ROE</th>
      </tr>
    </thead>
    <tbody>
      ${list.map(item => {
        const fRow = D.ib9FirmsFunding202606[item.fundingIdx];
        const fisisNote = D.promNoteFisis202606.find(x => x.firm === item.firm);
        const capPct = fisisNote ? fisisNote.capRatioPct : 0;
        const p = item.profitability || {};
        return `<tr class="${item.key === activeKey ? 'selected' : ''}" data-profit-firm="${item.key}" style="cursor:pointer">
          <td><button type="button" data-sync-firm="${item.key}"><b>${item.firm}</b></button></td>
          <td>${fmt(fRow.equity)}조</td>
          <td>${fmt(capPct, 1)}%</td>
          <td>${p.fy25NetOpRevEok ? fmt(p.fy25NetOpRevEok, 0) + '억' : '<span class="muted">연결공시</span>'}</td>
          <td>${p.fy25OpIncEok ? fmt(p.fy25OpIncEok, 0) + '억' : '연결 ' + fmt(p.fy25CfsOpIncEok, 0) + '억'}</td>
          <td>${p.fy25NetIncEok ? fmt(p.fy25NetIncEok, 0) + '억' : '연결 ' + fmt(p.fy25CfsNetIncEok, 0) + '억'}</td>
          <td>${p.fy25RoePct ? fmt(p.fy25RoePct, 1) + '%' : '연결 ' + fmt(p.fy25CfsRoePct, 1) + '%'}</td>
          <td>${p.h126NetOpRevEok ? fmt(p.h126NetOpRevEok, 0) + '억' : '—'}</td>
          <td><b>${p.h126NetIncEok ? fmt(p.h126NetIncEok, 0) + '억' : '—'}</b></td>
          <td>${p.h126CostIncomePct ? fmt(p.h126CostIncomePct, 1) + '%' : '—'}</td>
          <td style="color:var(--teal);font-weight:700">${p.h126AnnRoePct ? fmt(p.h126AnnRoePct, 1) + '%' : '—'}</td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>`;
}

export function bindIbSynchronizedExplorer(D, onNavigate) {
  const focusEl = document.getElementById('ib-sync-focus-panel');
  const profitWrap = document.getElementById('ib-sync-profit-table');
  const tenYrVis = document.getElementById('ib-10yr-funding-visual');
  const tenYrWrap = document.getElementById('ib-10yr-funding-table');
  if (!focusEl || !profitWrap) return;

  const updateFirm = (key, scrollFocus = false) => {
    explorerState.firmKey = key;
    explorerState.expandedFirmKey = key;
    const activeChain = getFirmChain(D, key);

    document.querySelectorAll('#ib-sync-chips [data-sync-firm]').forEach(el => {
      el.classList.toggle('active', el.dataset.syncFirm === key);
    });
    document.querySelectorAll('#ib-sync-portfolio-table [data-sync-row]').forEach(el => {
      el.classList.toggle('selected', el.dataset.syncRow === key);
    });

    focusEl.innerHTML = renderIbFirmFocusCard(D, activeChain);
    profitWrap.innerHTML = renderIbProfitabilityTable(D, key);
    if (tenYrVis) tenYrVis.innerHTML = renderIb10YrFundingVisual(D, key);
    if (tenYrWrap) tenYrWrap.innerHTML = renderIb10YrFundingTable(D, key);
    bindDynamic();
    if (scrollFocus) focusEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const bindDynamic = () => {
    focusEl.querySelectorAll('[data-focus-jump-invest]').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.focusJumpInvest;
        const chain = getFirmChain(D, key);
        explorerState.firmKey = key;
        explorerState.pendingInvestKey = chain?.costKey || key;
        onNavigate('invest');
      });
    });
    profitWrap.querySelectorAll('[data-profit-firm]').forEach(row => {
      row.addEventListener('click', () => updateFirm(row.dataset.profitFirm, true));
    });
  };

  tenYrVis?.addEventListener('click', event => {
    const bar = event.target.closest('[data-10yr-firm]');
    if (bar) updateFirm(bar.dataset['10yrFirm'], false);
  });
  tenYrWrap?.addEventListener('click', event => {
    const row = event.target.closest('[data-10yr-firm]');
    if (row) updateFirm(row.dataset['10yrFirm'], true);
  });
  document.querySelectorAll('#ib-10yr-lens-switch [data-10yr-lens]').forEach(btn => {
    btn.addEventListener('click', () => {
      explorerState.funding10YrLens = btn.dataset['10yrLens'];
      document.querySelectorAll('#ib-10yr-lens-switch [data-10yr-lens]').forEach(el => el.classList.toggle('active', el === btn));
      if (tenYrVis) {
        tenYrVis.innerHTML = renderIb10YrFundingVisual(D, explorerState.firmKey);
      }
      if (tenYrWrap) {
        tenYrWrap.innerHTML = renderIb10YrFundingTable(D, explorerState.firmKey);
      }
    });
  });

  document.querySelectorAll('#ib-sync-chips [data-sync-firm]').forEach(btn => {
    btn.addEventListener('click', () => updateFirm(btn.dataset.syncFirm, false));
  });
  document.querySelectorAll('#ib-sync-portfolio-table [data-sync-row]').forEach(row => {
    row.addEventListener('click', () => updateFirm(row.dataset.syncRow, true));
  });

  bindDynamic();
}

/* ==========================================================================
   4. #invest — AAA 은행채 금리 비교 및 모험자본 수급
   ========================================================================== */
function renderPcboCleanDiagram(D) {
  const pb = D.ventureCapitalChain2027?.pcboCleanBenchmark;
  if (!pb?.modes?.length) return '';
  // Legacy key retained for existing deep links; there is one fixed comparison.
  const m = pb.modes[0];
  const gapBp = Math.round((m.normalYieldPct - m.pcboYieldPct) * 1000) / 10;
  const {pcbo: proxyNetBp} = getOpportunityCostDefaults(D);
  const shadowBp = gapBp * 0.20 * 0.70;
  const yBottom = 240;
  const yAtPct = pct => yBottom - pct * 31;
  const yFund = yAtPct(m.fundingBasePct);
  const yNorm = yAtPct(m.normalYieldPct);
  const yProxy = yAtPct(m.pcboYieldPct);
  const fsc = pb.fscEmpirical26Q2;
  const bars = [
    {x:72, value:m.normalYieldPct, label:'정상 우량 IB', sub:'기존 모형 가정', color:'#004ea2', key:'kpi:pcbo-clean-bench'},
    {x:180, value:5.20, label:'중견 · A급', sub:'기존 모형 가정 · 30% 캡', color:'#3c78c8', key:'kpi:pcbo-clean-bench'},
    {x:292, value:m.pcboYieldPct, label:'AAA 은행채 3년', sub:'KIS 평가수익률 · 비교 대용', color:'#e88300', key:'kpi:pcbo-clean-bench'}
  ];
  return `<div class="vc-diagram-box" id="pcbo-benchmark-diagram">
    <div class="eyebrow" style="color:var(--teal)">AAA 금융채 3년 · 명목 금리차 비교</div>
    <h3 style="margin-top:3px;font-size:17px">AAA 은행채 3년을 기준으로 보면, 금리 차이는 얼마일까?</h3>
    <p class="muted" style="font-size:12px">${pb.whyCleanestSummary}</p>
    <p><span class="badge green">${m.label}</span></p>
    <div class="vc-svg-frame">
      <svg id="pcbo-benchmark-svg" viewBox="0 0 880 310" role="img" aria-labelledby="aaa-bank-title aaa-bank-desc">
        <title id="aaa-bank-title">정상 IB 가정 ${fmt(m.normalYieldPct)}%와 AAA 은행채 3년 ${fmt(m.pcboYieldPct,3)}%의 명목 금리차 ${fmt(gapBp,1)}bp</title>
        <desc id="aaa-bank-desc">은행채 관측수익률을 인정자산 수익률의 대용값으로 놓은 조건부 비교입니다. 신규 수신 1조의 14%에 적용한 연간 차이는 ${fmt(shadowBp,3)}억 원입니다. 은행채 자체가 모험자본 인정자산이라는 의미는 아닙니다.</desc>
        <text x="24" y="24" font-size="11.5" font-weight="700" fill="#192e3d">① 정상 IB·조달 가정 vs AAA 은행채 관측수익률</text>
        ${[0,2,4,6].map(v=>`<line x1="48" x2="478" y1="${yAtPct(v)}" y2="${yAtPct(v)}" stroke="#eaeff3" stroke-dasharray="3 3"/><text x="41" y="${yAtPct(v)+3}" text-anchor="end" font-size="9.5" fill="#8b9aa6">${v}.0%</text>`).join('')}
        <line x1="48" x2="478" y1="${yBottom}" y2="${yBottom}" stroke="#c9d5df"/>
        ${bars.map(b=>`<g class="xray-svg-pt" data-xray="${b.key}" tabindex="0" role="button" aria-label="${b.label} ${fmt(b.value,3)}% · ${b.sub}">
          <rect x="${b.x}" y="${yFund}" width="72" height="${yBottom-yFund}" fill="#dfe7ee" rx="2"/>
          <rect x="${b.x}" y="${yAtPct(b.value)}" width="72" height="${yFund-yAtPct(b.value)}" fill="${b.color}" rx="3"/>
          <text x="${b.x+36}" y="${yAtPct(b.value)-8}" text-anchor="middle" font-size="12" font-weight="800" fill="${b.color}">${fmt(b.value,b.x===292?3:2)}%</text>
          <text x="${b.x+36}" y="${(yAtPct(b.value)+yFund)/2+4}" text-anchor="middle" font-size="9.5" font-weight="700" fill="#fff">+${fmt((b.value-m.fundingBasePct)*100,b.x===292?1:0)}bp</text>
          <text x="${b.x+36}" y="${yBottom+19}" text-anchor="middle" font-size="10.5" font-weight="700" fill="#192e3d">${b.label}</text>
          <text x="${b.x+36}" y="${yBottom+34}" text-anchor="middle" font-size="8.5" fill="#6d7f8c">${b.sub}</text>
        </g>`).join('')}
        <rect x="292" y="${yNorm}" width="72" height="${Math.max(0,yProxy-yNorm)}" fill="#fdeaea" stroke="#d64545" stroke-dasharray="4 3"/>
        <line x1="144" y1="${yNorm}" x2="386" y2="${yNorm}" stroke="#d64545" stroke-dasharray="3 3"/>
        <line x1="376" y1="${yNorm}" x2="376" y2="${yProxy}" stroke="#d64545" stroke-width="2"/>
        <text x="388" y="${(yNorm+yProxy)/2+4}" font-size="12" font-weight="800" fill="#c93030">${fmt(gapBp,1)}bp</text>
        <line x1="54" x2="372" y1="${yFund}" y2="${yFund}" stroke="#445866" stroke-dasharray="5 3"/>
        <text x="68" y="${yFund+20}" font-size="10" fill="#445866">조달원가 가정 ${fmt(m.fundingBasePct)}%</text>
        <text x="292" y="${yFund+20}" font-size="9" fill="#6d7f8c">국고 대비 +${fmt((m.pcboYieldPct-m.ktb3yPct)*100,1)}bp</text>
        <g class="xray-svg-pt" data-xray="kpi:pcbo-clean-bench" tabindex="0" role="button" aria-label="AAA 은행채 금리 대용 시나리오 · 수신 1조당 연 ${fmt(shadowBp,3)}억 원 차이">
          <rect x="500" y="14" width="366" height="278" rx="9" fill="#f7fbfa" stroke="#cbe0da"/>
          <text x="518" y="39" font-size="11.5" font-weight="800" fill="#192e3d">② 신규 수신 1조 원 · 비교 대용 시나리오</text>
          <text x="518" y="60" font-size="10" fill="#5b6f7c">의무 20% 중 A급 상한 30%를 활용하면 잔여 의무는 14%</text>
          <rect x="518" y="76" width="264" height="30" fill="#087f80" rx="4"/><rect x="782" y="76" width="20" height="30" fill="#3c78c8"/><rect x="802" y="76" width="46" height="30" fill="#d64545" rx="4"/>
          <text x="650" y="95" text-anchor="middle" font-size="10" font-weight="700" fill="#fff">정상 기업금융 80%</text><text x="825" y="95" text-anchor="middle" font-size="10" font-weight="700" fill="#fff">14%</text>
          <text x="518" y="130" font-size="10" fill="#2c3e4c">비A급 인정자산 1,400억을 AAA 은행채와 같은</text>
          <text x="518" y="147" font-size="10" fill="#2c3e4c">수익률 ${fmt(m.pcboYieldPct,3)}%로 운용한다고 가정한 금리 차이</text>
          <rect x="518" y="163" width="330" height="76" rx="8" fill="#fff4f3" stroke="#e39b95"/>
          <text x="683" y="186" text-anchor="middle" font-size="10" fill="#9c3535">1,400억 × ${fmt(gapBp/100,3)}%p = ${fmt(shadowBp,3)}억 / 년</text>
          <text x="683" y="217" text-anchor="middle" font-size="18" font-weight="800" fill="#c22929">수신 1조당 연 ${fmt(shadowBp,1)}억 원 차이</text>
          <text x="518" y="260" font-size="9.5" fill="#5b6f7c">P-CBO 실측금리·실제 규제비용을 확정한 결과가 아닙니다.</text>
          <text x="518" y="277" font-size="9.5" font-weight="700" fill="#087f80">은행채 자체의 모험자본 인정 여부와는 별개입니다.</text>
        </g>
      </svg>
    </div>
    <p class="drill-subnote"><b>산식·범위</b> · ${m.note} AAA 은행채의 조달원가 차감 명목마진은 ${fmt(proxyNetBp,1)}bp입니다. 두 자산의 신용과 유동성 차이를 고려해 해석합니다.</p>
    <p class="drill-subnote"><a href="${pb.sourceUrl}" target="_blank" rel="noopener noreferrer">${pb.sourceTitle} ↗</a> · 관측일 ${pb.sourceDate}. P-CBO 비중 ${fmt(fsc.pcboSharePct,1)}%(${fmt(fsc.pcboTril,1)}조/${fmt(fsc.totalVcTril,1)}조, 저장소 2026.2Q 실적 집계)는 금리의 출처·기준일과 구분합니다.</p>
  </div>`;
}

export function renderVentureDeepDive(D) {
  const vc = D.ventureCapitalChain2027;
  if (!vc) return '';
  return `<section class="panel" id="vc-raroc-lab" aria-label="AAA 은행채 금리 비교">
    ${renderPcboCleanDiagram(D)}
  </section>${renderVentureCapitalSupply(vc.addressableMarket)}`;
}

function renderVentureCapitalSupply(market) {
  const {demandSchedule, recognizedSupply, ventureInvestment, assetMarketSizes, verdictSummary} = market;
  const scenarios = demandSchedule.filter(row => typeof row.mandatePct === 'number');
  const maxDemand = Math.max(...scenarios.map(row => row.totalMandateTril));
  return `<section class="panel" id="vc-addressable-market">
    <div class="panel-head"><div>
      <h2>모험자본은 앞으로도 계속 부족할까?</h2>
      <p>${verdictSummary}</p>
    </div></div>
    <div class="vc-market-grid">
      <figure class="vc-evidence vc-demand" aria-labelledby="vc-demand-caption">
        <figcaption id="vc-demand-caption">의무가 늘수록 상한 밖에서 채울 몫이 커집니다</figcaption>
        ${scenarios.map(row => `<div class="vc-demand-row">
          <div class="vc-demand-label"><b>${row.period.split(' ')[0]} 시나리오</b><strong>${fmt(row.totalMandateTril, 1)}조 원</strong></div>
          <div class="vc-demand-track" role="img" aria-label="중견·A급 상한 ${fmt(row.aCapTril, 2)}조 원, 나머지 인정자산 ${fmt(row.nonACapNetTril, 2)}조 원">
            <span class="vc-demand-cap" style="width:${row.aCapTril / maxDemand * 100}%"></span>
            <span class="vc-demand-other" style="width:${row.nonACapNetTril / maxDemand * 100}%"></span>
          </div>
          <p>수신 ${fmt(row.totalFundingTril, 0)}조 × ${row.mandatePct}% · 중견·A급 상한 ${fmt(row.aCapTril, 2)}조 · <b>나머지 ${fmt(row.nonACapNetTril, 2)}조</b></p>
        </div>`).join('')}
        <div class="vc-demand-legend"><span>중견·A급 인정 상한</span><span>상한 밖 인정자산</span></div>
        <p class="muted">의무액의 30%를 중견·A급으로 채운 경우입니다.</p>
      </figure>
      <div class="vc-evidence vc-supply" aria-label="공개 공급 자료">
        <div>
          <h3>종투사 모험자본 인정 잔액</h3>
          <strong>${fmt(recognizedSupply.amountTril, 1)}조 원</strong>
          <p>${recognizedSupply.period} ${recognizedSupply.participants}개사 · 신기사·VC ${fmt(recognizedSupply.ventureTril, 1)}조, P-CBO ${fmt(recognizedSupply.pcboTril, 1)}조 · 조달액 대비 ${fmt(recognizedSupply.ratioPct, 1)}%</p>
          <a href="${recognizedSupply.sourceUrl}" target="_blank" rel="noopener noreferrer">금융위원회 공급 실적</a>
        </div>
        <div>
          <h3>국내 벤처시장 신규 투자</h3>
          <strong>${fmt(ventureInvestment.amountTril, 2)}조 원</strong>
          <p>${ventureInvestment.period} 누적 · 전년 동기 대비 ${fmt(ventureInvestment.growthPct, 1)}% 증가 · 벤처투자회사·신기술금융사 및 조합 합산</p>
          <a href="${ventureInvestment.sourceUrl}" target="_blank" rel="noopener noreferrer">중소벤처기업부 벤처투자 동향</a>
        </div>
      </div>
    </div>
    <p class="vc-market-basis">종투사 인정액은 분기말 잔액이고, 벤처시장 투자액은 여러 투자자가 9개월 동안 집행한 누적액입니다. 공개 통계로 확인할 수 있는 것은 공급이 늘었다는 점까지입니다. 종투사가 추가로 확보할 수 있는 물량은 적격성, 배정, 만기, 가격을 확인해야 합니다.</p>
    ${renderVentureAssetMarketSizes(assetMarketSizes)}
    <div class="vc-policy">
      <h3>소싱을 늘리면서 인정 대상도 넓혀야 합니다</h3>
      <div class="vc-policy-grid">
        <div><b>당사 운용</b><p>VC·신기사와 공동 발굴을 하되, 예정된 집행액과 만기가 확인된 적격 투자처만 수신 계획에 반영합니다. 물량과 가격이 맞지 않으면 수신 속도를 조절합니다.</p></div>
        <div><b>정부에 건의할 내용</b><p>성장기업의 사업화·설비 투자에 신규 자금이 들어가는 금융 중 현행 기준으로 포착하기 어려운 유형을 구체화해 인정 범위를 확대합니다. 자금 용도와 순증 집행을 확인하고 중복 계상과 단순 차환은 기준에서 구분합니다.</p></div>
      </div>
      <p class="muted">적격 투자 잔액이 조달 증가 속도를 따라가고 가격과 집행 조건도 유지되는지 분기별로 확인합니다.</p>
      <a class="btn" href="?q=guide-sizing-growth#questions" data-qa-jump="guide-sizing-growth">관련 질문과 근거</a>
    </div>
  </section>`;
}

function renderVentureAssetMarketSizes(assets) {
  if (!assets?.length) return '';
  return `<section id="vc-market-sizes" class="vc-market-sizes" aria-labelledby="vc-market-sizes-title">
    <h3 id="vc-market-sizes-title">인정자산별 시장규모</h3>
    <p id="vc-market-sizes-note" class="muted">발행액·펀드 결성액·잔액의 기준이 달라 합산하면 시장을 과대평가할 수 있습니다. 옆의 전망은 기존 시나리오 추정치입니다. 실제 인정과 배정은 자산별 요건 및 거래 조건을 확인해야 합니다.</p>
    <table class="vc-market-table" role="table" aria-labelledby="vc-market-sizes-title" aria-describedby="vc-market-sizes-note">
      <thead role="rowgroup"><tr role="row">
        <th scope="col" role="columnheader">주요 자산군</th>
        <th scope="col" role="columnheader">최근 시장 지표</th>
        <th scope="col" role="columnheader">2027~28년 추정</th>
      </tr></thead>
      <tbody role="rowgroup">
        ${assets.map(asset => `<tr role="row">
          <th scope="row" role="rowheader">${asset.name}</th>
          <td role="cell">
            <span class="vc-market-mobile-label" aria-hidden="true">최근 시장 지표</span>
            <strong>${asset.recent}</strong>
            <small>${asset.recentBasis}${asset.sourceUrl ? ` · <a href="${asset.sourceUrl}" target="_blank" rel="noopener noreferrer">자료</a>` : ''}</small>
          </td>
          <td role="cell">
            <span class="vc-market-mobile-label" aria-hidden="true">2027~28년 추정</span>
            <strong>${asset.outlook}</strong>
            <small>${asset.outlookBasis}</small>
          </td>
        </tr>`).join('')}
      </tbody>
    </table>
  </section>`;
}

/* ==========================================================================
   5. #household-wealth — 수신의 거시 원천: 가계·법인 자산 브레이크다운 · 시계열 · 5개국 비교
   ========================================================================== */
const hwFinColors = {
  deposits: '#295dd8',
  equitiesFunds: '#004ea2',
  insPension: '#537cca',
  bonds: '#d09b43',
  other: '#95a4b1'
};

const hwFinLabels = [
  ['deposits', '① 현금·예금'],
  ['equitiesFunds', '② 주식·투자펀드'],
  ['insPension', '③ 보험·연금'],
  ['bonds', '④ 채권'],
  ['other', '⑤ 기타']
];

export function renderHouseholdWealthPage(D) {
  const hw = D.householdWealthAndIntl2026;
  if (!hw) return '';
  const k = hw.headlineKpis;
  const nbs25 = hw.krAnnualBalanceSheet.at(-1);
  const detailItems = hw.krFinCategories26Q2.flatMap(cat => cat.subItems);
  const assetDetailCount = detailItems.filter(item => item.ecosCode !== 'F00B_L').length;
  const liabilityReferenceCount = detailItems.length - assetDetailCount;
  const corpLatest = hw.corpLiquiditySeries.at(-1);

  return `
    <div class="grid4-metrics" style="margin-bottom:20px">
      <div class="metric" data-xray="kpi:hw-kr-total" tabindex="0" role="button">
        <small>한국 전체 가계자산 ('25말 국민대차대조표)</small>
        <strong style="font-size:25px">${fmt(k.krTotalHouseholdAssets25Tril, 1)} <small>조 원</small></strong>
        <p class="muted">명목 GDP(${fmt(k.krNominalGdp25Tril, 1)}조)의 ${fmt(k.krAssetsToGdp25X, 2)}배 · 순자산 ${fmt(k.krNetWorth25Tril, 1)}조</p>
      </div>
      <div class="metric" data-xray="kpi:hw-kr-fin" tabindex="0" role="button">
        <small>가계 금융자산 ('26.2Q 자금순환)</small>
        <strong style="font-size:25px;color:var(--teal)">${fmt(k.krFinAssets26Q2Tril, 1)} <small>조 원</small></strong>
        <p class="muted">'25말 ${fmt(k.krFinAssets25Tril, 1)}조 대비 +${fmt(k.krFinAssets26Q2Tril - k.krFinAssets25Tril, 1)}조 · 부채배율 2.78배</p>
      </div>
      <div class="metric" data-xray="kpi:hw-corp-s11" tabindex="0" role="button">
        <small>가계 + 법인 현금·예금 합산 ('26.2Q)</small>
        <strong style="font-size:25px">${fmt(k.combinedDepositsPool26Q2Tril, 1)} <small>조 원</small></strong>
        <p class="muted">가계 ${fmt(k.krDeposits26Q2Tril, 1)}조 + 비금융법인 ${fmt(k.corpDeposits26Q2Tril, 1)}조</p>
      </div>
      <a href="#funding" class="metric metric-link-card" aria-label="2027E 발행어음·IMA ${fmt(D.globalKpis.promNoteIma27EstTril, 0)}조 전망 및 NIM 화면으로 이동">
        <div class="metric-link-top">
          <small>'27E 어음+IMA(${fmt(D.globalKpis.promNoteIma27EstTril, 0)}조) 침투율</small>
          <span class="badge green">수신 전망 ↗</span>
        </div>
        <strong style="font-size:25px;color:var(--teal)">${fmt(k.promNoteIma27ShareOfFinPct, 2)}%</strong>
        <p class="muted">가계 예금 대비 ${fmt(k.promNoteIma27ShareOfHhDepPct, 2)}% · 거시 수용여력 충분</p>
      </a>
    </div>

    <section class="panel" id="hw-korea-tree" style="scroll-margin-top:95px">
      <div class="panel-head">
        <div>
          <div class="eyebrow">STAGE 01–03 · 한국 가계자산 3단계 브레이크다운</div>
          <h2>가계 총자산 1경 6,641조 원은 실물·금융·세부 상품으로 어떻게 나뉠까?</h2>
          <p>1단계(실물 vs 금융 총량)에서 시작해 아래 5대 금융자산 카드를 클릭하면 <b>${assetDetailCount}개 세부 자산 항목의 잔액·증감 시계열(ECOS 281Y002)과 부채 참고 ${liabilityReferenceCount}개</b>이 펼쳐집니다.</p>
        </div>
        <span class="badge green">'25말 총량 · '26.2Q 금융</span>
      </div>

      <div class="sub-lens-card" style="margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;font-size:12px">
          <b>1단계 · 가계 및 비영리단체 총자산 구성 ('25말 국민대차대조표 ${fmt(nbs25.totalAssetsTril, 1)}조 원 = 100%)</b>
          <span class="muted">토지 ${fmt(nbs25.landTril, 1)}조 · 주택·건물 ${fmt(nbs25.buildingsTril, 1)}조 · 설비등 ${fmt(nbs25.otherNonFinTril, 1)}조 | 금융부채 ${fmt(nbs25.finLiabTril, 1)}조</span>
        </div>
        <div class="hw-split-bar" role="img" aria-label="비금융 실물자산 ${nbs25.nonFinShareOfGrossPct}%, 금융자산 ${nbs25.finShareOfGrossPct}%">
          <span style="width:${nbs25.nonFinShareOfGrossPct}%;background:#60788c">비금융(실물)자산 ${fmt(nbs25.nonFinAssetsTril, 1)}조 (${fmt(nbs25.nonFinShareOfGrossPct, 1)}%)</span>
          <span style="width:${nbs25.finShareOfGrossPct}%;background:var(--teal)">금융자산 ${fmt(nbs25.finAssetsTril, 1)}조 (${fmt(nbs25.finShareOfGrossPct, 1)}%) → '26.2Q 6,930.2조</span>
        </div>
        <p class="drill-subnote" style="margin-top:4px">
          <b>분모 기준 유의</b> · 국제비교(SNA 총자산) 기준 실물 비중은 <b>62.7%</b>이며, 부채 차감 <b>순자산(14,200.5조) 기준은 73.5%</b>, 표본 가구평균인 <b>가계금융복지조사('25년) 기준은 75.8%</b>입니다.
        </p>
      </div>

      <div style="font-size:12px;font-weight:600;color:var(--ink)">2단계 · 가계 금융자산 5대 부문 선택 ('26.2Q 총 ${fmt(k.krFinAssets26Q2Tril, 1)}조 원 = 100% · 클릭하여 3단계 세부상품 확인)</div>
      <div class="hw-cat-grid" id="hw-cat-cards" role="group" aria-label="가계 금융자산 5대 부문 선택">
        ${hw.krFinCategories26Q2.map(cat => {
          const isAct = explorerState.hwCategory === cat.id;
          return `<button type="button" class="hw-cat-card ${isAct ? 'active' : ''}" data-hw-cat="${cat.id}" aria-pressed="${isAct}">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:4px">
              <small style="font-weight:700;color:${cat.color}">${cat.label}</small>
              <span class="badge">${fmt(cat.share26Q2Pct, 1)}%</span>
            </div>
            <strong>${fmt(cat.amount26Q2Tril, 1)}<small style="font-size:11px;font-weight:400"> 조</small></strong>
            <div class="bar-track" style="margin-top:7px"><div class="bar-fill" style="width:${Math.min(100, cat.share26Q2Pct * 2)}%;background:${cat.color}"></div></div>
            <small class="muted" style="display:block;margin-top:5px">'25말 ${fmt(cat.share25Q4Pct, 1)}% (${fmt(cat.amount25Q4Tril, 1)}조)</small>
          </button>`;
        }).join('')}
      </div>

      <div id="hw-cat-detail" aria-live="polite">
        ${renderHwCategoryDetail(D)}
      </div>
      ${srcBox('한국은행 ECOS 291Y505(제도부문별 대차대조표, SEC04 가계 및 비영리단체) · ECOS 281Y002(금융자산·부채 잔액표, S14 분기말 원천 조회). 2026.2Q 보도자료 속보 요약에서는 일부 잠정 분류차로 예금 비중이 39.5%로 표기되기도 하나 ECOS 확정 코드 합산치는 2,688.07 ÷ 6,930.21 = 38.8%입니다.', 'kpi:hw-kr-total')}
    </section>

    <section class="panel" id="hw-timeseries" style="scroll-margin-top:95px">
      <div class="panel-head">
        <div>
          <div class="eyebrow">TIME-SERIES EXPLORER · 분기별 금융자산('19.4Q~'26.2Q) &amp; 연간 총자산('20~'25)</div>
          <h2>금리인상기 예금 쏠림에서 2025–2026년 자본시장 머니무브까지, 시계열은 어떻게 움직였을까?</h2>
          <p>분기별 잔액(조 원)·구성비(%) 추이와 연간 실물+금융 총자산 및 명목 GDP 대비 배율을 전환해 비교합니다.</p>
        </div>
        <div class="lens-switch" role="group" aria-label="시계열 보기 전환">
          <button type="button" class="lens-btn ${explorerState.hwSeriesMode === 'quarterly_fin' ? 'active' : ''}" data-hw-series="quarterly_fin">분기별 잔액 (조 원)</button>
          <button type="button" class="lens-btn ${explorerState.hwSeriesMode === 'quarterly_share' ? 'active' : ''}" data-hw-series="quarterly_share">분기별 비중 (%)</button>
          <button type="button" class="lens-btn ${explorerState.hwSeriesMode === 'annual_total' ? 'active' : ''}" data-hw-series="annual_total">연간 총자산 · GDP 배율</button>
        </div>
      </div>
      <div id="hw-timeseries-body" aria-live="polite">
        ${renderHwTimeseriesBody(D)}
      </div>
      ${srcBox('한국은행 ECOS 281Y002(분기별 금융자산·부채 잔액표, 2019.4Q~2026.2Q) · ECOS 291Y505(연간 국민대차대조표, 2020~2025) · ECOS 200Y113(연간 명목 GDP). 2023년 보험·연금 잔액 감소는 IFRS17 보험부채 시가평가 전환(-127.1조 평가조정) 영향입니다.', 'kpi:hw-kr-fin')}
    </section>

    <section class="panel" id="hw-aux-pools" style="scroll-margin-top:95px">
      <div class="panel-head">
        <div>
          <div class="eyebrow">CORPORATE &amp; WEALTH TIER · 법인 단기유동성(S11) &amp; 가계 순자산 5분위 분포</div>
          <h2>법인 수신 토대와 상위 자산계층(5분위) 투자 여력은 얼마나 될까?</h2>
          <p>발행어음·RP의 또 다른 축인 <b>비금융법인(S11) 유동성</b>과 리테일 IMA·발행어음 핵심 고객군인 <b>순자산 상위 20%(5분위) 가구 분포</b>, 그리고 3대 공식 통계의 차이를 함께 보여줍니다.</p>
        </div>
        <span class="badge blue">S11 법인 + 가계금융복지조사</span>
      </div>

      <div class="grid2">
        <div class="sub-lens-card" id="hw-corp-s11">
          <b>비금융법인(S11) 금융자산 · 단기 수신 풀 추이 (ECOS 281Y002, 조 원)</b>
          <p class="drill-subnote">기업 결제·운전자금 특성상 3개월 이하 초단기 발행어음·수시형 RP·MMF의 핵심 기관 수요처를 형성합니다.</p>
          <div class="table-wrap" style="margin-top:10px">
            <table class="data-table">
              <thead>
                <tr>
                  <th scope="col">시점</th>
                  <th scope="col">법인 총금융자산</th>
                  <th scope="col">현금 및 예금</th>
                  <th scope="col">투자펀드(MMF등)</th>
                  <th scope="col">채권 (단기어음·CP)</th>
                </tr>
              </thead>
              <tbody>
                ${hw.corpLiquiditySeries.map((r, idx) => `<tr class="${idx === hw.corpLiquiditySeries.length - 1 ? 'selected' : ''}">
                  <td><b>${r.period}</b></td>
                  <td>${fmt(r.totalFinTril, 1)}조</td>
                  <td style="color:var(--teal);font-weight:700">${fmt(r.depositsTril, 1)}조</td>
                  <td>${fmt(r.fundsTril, 1)}조</td>
                  <td>${fmt(r.bondsTril, 1)}조 <small class="muted">(${fmt(r.shortCpNoteTril, 2)}조)</small></td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
          <div class="callout" style="margin:12px 0 0">
            <b>가계 + 법인 합산 현금·예금 ${fmt(k.combinedDepositsPool26Q2Tril, 1)}조 원</b> = 가계 현금·예금 ${fmt(k.krDeposits26Q2Tril, 1)}조 + 비금융법인 현금·예금 ${fmt(k.corpDeposits26Q2Tril, 1)}조입니다. 법인 투자펀드(MMF 등) ${fmt(corpLatest.fundsTril, 1)}조는 위 합계에 포함하지 않고 별도로 표시합니다.
          </div>
        </div>

        <div class="sub-lens-card" id="hw-shf-quintile">
          <b>가계 순자산 5분위별 가구당 평균 자산 · 금융자산 세부 구성 ('25년 가계금융복지조사, 만 원)</b>
          <p class="drill-subnote">매년 3월 말 기준 표본 미시조사(ECOS 903Y212) · 전월세보증금이 금융자산에 포함되는 점에 유의하세요.</p>
          <div class="table-wrap" style="margin-top:10px">
            <table class="data-table">
              <thead>
                <tr>
                  <th scope="col">순자산 계층</th>
                  <th scope="col">총자산 (실물비중)</th>
                  <th scope="col">금융자산</th>
                  <th scope="col">예치·적립저축</th>
                  <th scope="col">주식·채권·펀드</th>
                </tr>
              </thead>
              <tbody>
                ${hw.shfQuintiles2025.map(q => `<tr class="${q.key === '5분위_상위20%' ? 'selected' : ''}" data-xray="kpi:hw-shf-top20" tabindex="0" role="button">
                  <td><b class="xray-token">${q.group}</b></td>
                  <td>${fmt(q.totalAssetManwon / 10000, 2)}억 <small class="muted">(${fmt(q.realSharePct, 1)}%)</small></td>
                  <td><b>${fmt(q.finAssetManwon, 0)}만</b></td>
                  <td style="color:var(--teal);font-weight:600">${fmt(q.depositSavingsManwon, 0)}만</td>
                  <td>${fmt(q.stocksBondsFundsManwon, 0)}만</td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
          <div class="callout" style="margin:12px 0 0">
            <b>상위 20%(5분위) 가구당 예치식 저축 1.46억 · 금융자산 3.46억 원</b> · 원금지급 약정과 예금 대비 초과금리를 결합한 발행어음·IMA의 실질 리테일 WM 타깃층입니다.
          </div>
        </div>
      </div>

      <details style="margin-top:16px;border-bottom:0;padding-bottom:0">
        <summary>참고 · 왜 『자금순환(분기)』 · 『국민대차대조표(연간)』 · 『가계금융복지조사(연간)』 수치가 서로 다를까? (3대 통계 비교표)</summary>
        <div class="table-wrap" style="margin-top:12px">
          <table class="data-table">
            <thead>
              <tr>
                <th scope="col">공식 통계명</th>
                <th scope="col">ECOS 코드</th>
                <th scope="col">발표 주기</th>
                <th scope="col">집계 단위 · 범위</th>
                <th scope="col">실물자산 포함</th>
                <th scope="col">본 포털 활용 역할</th>
              </tr>
            </thead>
            <tbody>
              ${hw.surveyComparison.map(s => `<tr>
                <td><b>${s.name}</b></td>
                <td>${s.ecosCode}</td>
                <td>${s.cycle}</td>
                <td>${s.scope}</td>
                <td style="text-align:left">${s.realAssets}</td>
                <td style="text-align:left">${s.role}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </details>
      ${srcBox('한국은행 ECOS 281Y002(S11 비금융법인) · 국가데이터처·금융감독원·한국은행 『2025년 가계금융복지조사』(ECOS 903Y212, 2025년 3월 말 기준 자산·부채). 분기마다 공표되는 가구 표본조사는 자산·부채 항목이 없는 『가계동향조사(소득·지출)』입니다.', 'kpi:hw-corp-s11')}
    </section>

    <section class="panel" id="hw-intl-5country" style="scroll-margin-top:95px">
      <div class="panel-head">
        <div>
          <div class="eyebrow">5-COUNTRY COMPARISON · 한국 · 미국 · 영국 · 일본 · 중국 (+유로존 참고)</div>
          <h2>주요 5개국의 명목 GDP 대비 가계자산과 금융자산 포트폴리오는 어떻게 다를까?</h2>
          <p>국가를 클릭하면 각국 중앙은행·통계청의 편제 기준(미국 MMF·비법인기업지분, 영국 사적연금, 일본 신NISA, 중국 은행예금 집중)과 한국 수신시장 시사점을 확인할 수 있습니다.</p>
        </div>
        <div class="lens-switch" role="group" aria-label="5개국 비교 기준 전환">
          <button type="button" class="lens-btn ${explorerState.hwCountryLens === 'composition' ? 'active' : ''}" data-hw-country-lens="composition">금융자산 5대 세부 구성비 (%)</button>
          <button type="button" class="lens-btn ${explorerState.hwCountryLens === 'macro_gdp' ? 'active' : ''}" data-hw-country-lens="macro_gdp">명목 GDP 배율 · 실물 vs 금융</button>
        </div>
      </div>

      <div id="hw-intl-visual" aria-live="polite">
        ${renderHwIntlVisual(D)}
      </div>

      <div class="table-wrap" style="margin-top:16px">
        <table class="data-table" id="hw-intl-table">
          <thead>
            <tr>
              <th scope="col">국가 (클릭 시 편제 주석)</th>
              <th scope="col">'25 명목 GDP (USD)</th>
              <th scope="col">가계 총자산 (GDP 배율)</th>
              <th scope="col">실물 : 금융 비중</th>
              <th scope="col">① 현금·예금</th>
              <th scope="col">② 주식·펀드</th>
              <th scope="col">③ 보험·연금</th>
              <th scope="col">④ 채권</th>
              <th scope="col">포트폴리오 유형</th>
            </tr>
          </thead>
          <tbody>
            ${hw.intl5Countries.map(c => {
              const sel = explorerState.hwSelectedCountry === c.code;
              return `<tr class="${sel ? 'selected' : ''}" data-hw-country="${c.code}" style="cursor:pointer">
                <td><b>${c.country}</b> <small class="muted">(${c.basePeriod})</small></td>
                <td>${c.nominalGdpLocal}<br><small class="muted">약 $${fmt(c.nominalGdpUsdTril, 2)}T</small></td>
                <td><b>${c.totalAssetsLocal}</b><br><small class="muted">${c.assetsToGdpX ? `GDP의 ${fmt(c.assetsToGdpX, 2)}배` : '금융계정 기준'}</small></td>
                <td>${c.realAssetSharePct !== null ? `${fmt(c.realAssetSharePct, 1)}% : <b>${fmt(c.finAssetSharePct, 1)}%</b>` : '—'}</td>
                <td style="color:#295dd8;font-weight:700">${fmt(c.finMixPct.deposits, 1)}%</td>
                <td style="color:var(--teal);font-weight:700">${fmt(c.finMixPct.equitiesFunds, 1)}%</td>
                <td>${fmt(c.finMixPct.insPension, 1)}%</td>
                <td>${fmt(c.finMixPct.bonds, 1)}%</td>
                <td style="text-align:left"><span class="badge ${c.code === 'KR' ? 'green' : c.code === 'US' ? 'blue' : ''}">${c.archetype}</span></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>

      <div id="hw-intl-note" style="margin-top:16px" aria-live="polite">
        ${renderHwCountryNote(D)}
      </div>

      ${srcBox('한국은행 ECOS(291Y505·281Y002·200Y113·902Y016) · 미국 연준 Fed Z.1(Table B.101, 2025.4Q~2026.2Q) 및 상무부 BEA · 영국 통계청 ONS(National Balance Sheet·UKEA) 및 영란은행 · 일본은행 자금순환통계(2026.2Q)·『資金循環の日米欧比較(2026.1Q SNA 표준화)』 및 내각부 국민경제계산 · 중국 국가통계국(NBS)·인민은행(PBOC)·사회과학원 NIFD·Allianz Global Wealth Report(2025/2026 추계).')}
    </section>
  `;
}

function renderHwCategoryDetail(D) {
  const hw = D.householdWealthAndIntl2026;
  const cat = hw.krFinCategories26Q2.find(x => x.id === explorerState.hwCategory) || hw.krFinCategories26Q2[0];
  const detailAssetTotal = cat.subItems.filter(item => item.ecosCode !== 'F00B_L').reduce((sum, item) => sum + item.q26_2, 0);
  const residual = Math.round((cat.amount26Q2Tril - detailAssetTotal) * 100) / 100;

  return `<div class="sub-lens-card" style="border-left:4px solid ${cat.color}">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px">
      <div>
        <div class="drill-step-tag" style="color:${cat.color}">3단계 세부 드릴다운 · ${cat.label} ('26.2Q ${fmt(cat.amount26Q2Tril, 1)}조 원 · 금융자산의 ${fmt(cat.share26Q2Pct, 1)}%)</div>
        <h3 style="margin-top:3px">${cat.headline}</h3>
      </div>
      ${cat.id === 'pensions'
        ? `<a class="btn" href="?q=guide-pension-eligibility#questions" data-qa-jump="guide-pension-eligibility">질문·답변 · 퇴직연금 편입 조건 →</a>`
        : `<a class="btn" href="#funding">수신 전망 · 머니무브 금리 사다리 →</a>`}
    </div>
    <p class="drill-prose" style="margin-top:8px">${cat.implication}</p>
    ${Math.abs(residual) > 0.02 ? `<div class="callout" data-hw-detail-reconciliation style="font-size:11px">선택 부문 총액 <b>${fmt(cat.amount26Q2Tril)}조</b> = 표시된 세부 자산 합계 <b>${fmt(detailAssetTotal)}조</b> ${residual < 0 ? '−' : '+'} <b>세부표 미분류 차이 ${fmt(Math.abs(residual))}조</b>입니다. 원문 부문 총액과 표시된 세부 항목 합계의 차이를 계산한 값이며, 추가 자산으로 분류한 금액은 아닙니다. 부채 참고행은 자산 합계에서 제외합니다.</div>` : ''}
    <div class="table-wrap" style="margin-top:12px">
      <table class="data-table">
        <thead>
          <tr>
            <th scope="col">세부 금융상품 (ECOS 281Y002)</th>
            <th scope="col">'19.4Q</th>
            <th scope="col">'22.4Q</th>
            <th scope="col">'24.4Q</th>
            <th scope="col">'25.4Q</th>
            <th scope="col">'26.2Q 최신</th>
            <th scope="col">'24말 대비 증감</th>
            <th scope="col">금융 내 비중</th>
            <th scope="col">수신 · 머니무브 해석</th>
          </tr>
        </thead>
        <tbody>
          ${cat.subItems.map(s => {
            const pos = s.deltaFrom24Q4Tril > 0;
            return `<tr>
              <td><b>${s.name}</b> <small class="muted">(${s.ecosCode})</small></td>
              <td>${fmt(s.q19_4, 1)}조</td>
              <td>${fmt(s.q22_4, 1)}조</td>
              <td>${fmt(s.q24_4, 1)}조</td>
              <td>${fmt(s.q25_4, 1)}조</td>
              <td><b>${fmt(s.q26_2, 1)}조</b></td>
              <td style="color:${pos ? 'var(--teal)' : '#c65e53'};font-weight:700">${pos ? '+' : ''}${fmt(s.deltaFrom24Q4Tril, 1)}조</td>
              <td>${s.ecosCode === 'F00B_L' ? '부채 참고' : fmt(s.shareOfFin26Q2Pct, 1) + '%'}</td>
              <td style="text-align:left">${s.note}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  </div>`;
}

function renderHwTimeseriesBody(D) {
  const hw = D.householdWealthAndIntl2026;
  const mode = explorerState.hwSeriesMode;

  if (mode === 'annual_total') {
    const rows = hw.krAnnualBalanceSheet;
    const w = 840, h = 235, left = 52, right = w - 45, top = 24, bottom = h - 34;
    const maxV = 18000;
    const stepX = (right - left) / rows.length;
    const bars = rows.map((r, i) => {
      const cx = left + stepX * (i + 0.5);
      const bw = 46;
      const realH = (r.nonFinAssetsTril / maxV) * (bottom - top);
      const finH = (r.finAssetsTril / maxV) * (bottom - top);
      const yReal = bottom - realH;
      const yFin = yReal - finH;
      return `<g class="xray-svg-pt" data-xray="hw-y:${r.year}" tabindex="0" role="button" aria-label="${r.year}년 가계 총자산 ${fmt(r.totalAssetsTril, 1)}조 원 분해">
        <rect x="${cx - bw / 2}" y="${yReal}" width="${bw}" height="${realH}" fill="#60788c" rx="2"/>
        <rect x="${cx - bw / 2}" y="${yFin}" width="${bw}" height="${finH}" fill="#004ea2" rx="2"/>
        <text x="${cx}" y="${yFin - 7}" text-anchor="middle" font-size="10" font-weight="700" fill="#0f223d">${fmt(r.totalAssetsTril, 0)}조 (${fmt(r.totalAssetsToGdpX, 2)}x)</text>
        <text x="${cx}" y="${bottom + 18}" text-anchor="middle" font-size="10" fill="#65717e">${r.year}말</text>
      </g>`;
    }).join('');

    return `
      <div class="legend" style="margin-bottom:8px">
        <span><i style="background:#60788c"></i>비금융(실물)자산 (토지+주택·건물 등)</span>
        <span><i style="background:#004ea2"></i>금융자산</span>
        <span class="muted">막대 상단 = 가계 총자산 및 명목 GDP 대비 배율(x)</span>
      </div>
      <svg class="chart-svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="2020년~2025년 한국 가계 총자산 실물 및 금융자산 추이">
        ${[0, 6000, 12000, 18000].map(v => {
          const y = bottom - (v / maxV) * (bottom - top);
          return `<line x1="${left}" x2="${right}" y1="${y}" y2="${y}" stroke="#e8eef0" stroke-dasharray="3 4"/><text x="${left - 8}" y="${y + 3}" text-anchor="end" font-size="9" fill="#9aa6ae">${(v / 1000).toFixed(0)}천조</text>`;
        }).join('')}
        ${bars}
      </svg>
      <div class="table-wrap" style="margin-top:14px">
        <table class="data-table">
          <thead>
            <tr>
              <th scope="col">연도 말</th>
              <th scope="col">명목 GDP</th>
              <th scope="col">가계 총자산</th>
              <th scope="col">비금융(실물) [토지 / 건물]</th>
              <th scope="col">금융자산</th>
              <th scope="col">실물 : 금융 (총자산 기준)</th>
              <th scope="col">금융부채</th>
              <th scope="col">순자산 (GDP 배율)</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((r, i) => `<tr class="${i === rows.length - 1 ? 'selected' : ''}" data-xray="hw-y:${r.year}" tabindex="0" role="button">
              <td><b class="xray-token">${r.year}</b></td>
              <td>${fmt(r.nominalGdpTril, 1)}조</td>
              <td><b>${fmt(r.totalAssetsTril, 1)}조</b> <small class="muted">(${fmt(r.totalAssetsToGdpX, 2)}배)</small></td>
              <td>${fmt(r.nonFinAssetsTril, 1)}조 <small class="muted">[${fmt(r.landTril, 0)} / ${fmt(r.buildingsTril, 0)}]</small></td>
              <td style="color:var(--teal);font-weight:700">${fmt(r.finAssetsTril, 1)}조</td>
              <td>${fmt(r.nonFinShareOfGrossPct, 1)}% : <b>${fmt(r.finShareOfGrossPct, 1)}%</b></td>
              <td>${fmt(r.finLiabTril, 1)}조</td>
              <td>${fmt(r.netWorthTril, 1)}조 <small class="muted">(${fmt(r.netWorthToGdpX, 2)}배)</small></td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  }

  const qRows = hw.krQuarterlyFinSeries;
  const w = 860, h = 245, left = 48, right = w - 28, top = 22, bottom = h - 34;
  const xAt = i => left + (i * (right - left)) / (qRows.length - 1);

  if (mode === 'quarterly_share') {
    const maxPct = 55;
    const yAt = p => bottom - (p / maxPct) * (bottom - top);
    const poly = key => qRows.map((r, i) => `${xAt(i)},${yAt(r.sharesPct[key])}`).join(' ');
    return `
      <div class="legend" style="margin-bottom:8px">
        <span><i style="background:#295dd8"></i>현금·예금 (46.4%→38.8%)</span>
        <span><i style="background:#004ea2"></i>주식·투자펀드 (18.1%→34.4%)</span>
        <span><i style="background:#537cca"></i>보험·연금 (32.8%→23.6%)</span>
        <span><i style="background:#d09b43"></i>채권 (2.4~3.6%)</span>
      </div>
      <svg class="chart-svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="분기별 가계 금융자산 구성비 변화 2019.4Q~2026.2Q">
        ${[0, 15, 30, 45, 55].map(v => {
          const y = yAt(v);
          return `<line x1="${left}" x2="${right}" y1="${y}" y2="${y}" stroke="#e8eef0" stroke-dasharray="3 4"/><text x="${left - 8}" y="${y + 3}" text-anchor="end" font-size="9" fill="#9aa6ae">${v}%</text>`;
        }).join('')}
        <polyline points="${poly('deposits')}" fill="none" stroke="#295dd8" stroke-width="2.5"/>
        <polyline points="${poly('equitiesFunds')}" fill="none" stroke="#004ea2" stroke-width="2.5"/>
        <polyline points="${poly('insPension')}" fill="none" stroke="#537cca" stroke-width="2"/>
        <polyline points="${poly('bonds')}" fill="none" stroke="#d09b43" stroke-width="1.8"/>
        ${qRows.map((r, i) => `<g class="xray-svg-pt" data-xray="hw-q:${r.period}" tabindex="0" role="button" aria-label="${r.period} 가계 금융자산 구성비 상세">
          <circle cx="${xAt(i)}" cy="${yAt(r.sharesPct.deposits)}" r="4" fill="#295dd8"/>
          <circle cx="${xAt(i)}" cy="${yAt(r.sharesPct.equitiesFunds)}" r="4" fill="#004ea2"/>
          ${i === 0 || i === 5 || i === 9 || i === qRows.length - 1 ? `<text x="${xAt(i)}" y="${yAt(r.sharesPct.deposits) - 8}" text-anchor="middle" font-size="9.5" font-weight="700" fill="#295dd8">${fmt(r.sharesPct.deposits, 1)}%</text><text x="${xAt(i)}" y="${yAt(r.sharesPct.equitiesFunds) + 14}" text-anchor="middle" font-size="9.5" font-weight="700" fill="#004ea2">${fmt(r.sharesPct.equitiesFunds, 1)}%</text>` : ''}
          <text x="${xAt(i)}" y="${bottom + 19}" text-anchor="middle" font-size="9" fill="#65717e">${r.period.slice(2)}</text>
        </g>`).join('')}
      </svg>
      <div class="table-wrap" style="margin-top:14px">
        <table class="data-table">
          <thead>
            <tr>
              <th scope="col">시점</th>
              <th scope="col">총금융자산</th>
              <th scope="col">① 현금·예금 (%)</th>
              <th scope="col">② 주식·투자펀드 (%)</th>
              <th scope="col">③ 보험·연금 (%)</th>
              <th scope="col">④ 채권 (%)</th>
              <th scope="col">⑤ 기타 (%)</th>
              <th scope="col">자산/부채 배율</th>
            </tr>
          </thead>
          <tbody>
            ${qRows.map((r, i) => `<tr class="${i === qRows.length - 1 ? 'selected' : ''}" data-xray="hw-q:${r.period}" tabindex="0" role="button">
              <td><b class="xray-token">${r.period}</b></td>
              <td>${fmt(r.totalFinTril, 1)}조</td>
              <td style="color:#295dd8;font-weight:700">${fmt(r.sharesPct.deposits, 1)}%</td>
              <td style="color:var(--teal);font-weight:700">${fmt(r.sharesPct.equitiesFunds, 1)}%</td>
              <td>${fmt(r.sharesPct.insPension, 1)}%</td>
              <td>${fmt(r.sharesPct.bonds, 1)}%</td>
              <td>${fmt(r.sharesPct.other, 1)}%</td>
              <td><b>${fmt(r.assetLiabRatioX, 2)}배</b></td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  }

  const maxTril = 7500;
  const yTril = v => bottom - (v / maxTril) * (bottom - top);
  const linePts = key => qRows.map((r, i) => `${xAt(i)},${yTril(r[key])}`).join(' ');
  const areaTot = `M${left},${bottom} L` + qRows.map((r, i) => `${xAt(i)},${yTril(r.totalFinTril)}`).join(' L') + ` L${xAt(qRows.length - 1)},${bottom} Z`;

  return `
    <div class="legend" style="margin-bottom:8px">
      <span><i style="background:#0f223d"></i>총금융자산 (3,981.5→6,930.2조)</span>
      <span><i style="background:#295dd8"></i>현금·예금 (2,688.1조)</span>
      <span><i style="background:#004ea2"></i>주식·투자펀드 (2,381.1조)</span>
      <span><i style="background:#537cca"></i>보험·연금 (1,633.0조)</span>
    </div>
    <svg class="chart-svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="분기별 가계 금융자산 잔액 추이 2019.4Q~2026.2Q">
      ${[0, 2500, 5000, 7500].map(v => {
        const y = yTril(v);
        return `<line x1="${left}" x2="${right}" y1="${y}" y2="${y}" stroke="#e8eef0" stroke-dasharray="3 4"/><text x="${left - 8}" y="${y + 3}" text-anchor="end" font-size="9" fill="#9aa6ae">${v.toLocaleString()}조</text>`;
      }).join('')}
      <path d="${areaTot}" fill="#ebf3fe" fill-opacity="0.55"/>
      <polyline points="${linePts('totalFinTril')}" fill="none" stroke="#0f223d" stroke-width="2.4"/>
      <polyline points="${linePts('depositsTril')}" fill="none" stroke="#295dd8" stroke-width="2.1"/>
      <polyline points="${linePts('equitiesFundsTril')}" fill="none" stroke="#004ea2" stroke-width="2.1"/>
      <polyline points="${linePts('insPensionTril')}" fill="none" stroke="#537cca" stroke-width="1.8" stroke-dasharray="4 3"/>
      ${qRows.map((r, i) => `<g class="xray-svg-pt" data-xray="hw-q:${r.period}" tabindex="0" role="button" aria-label="${r.period} 가계 금융자산 ${fmt(r.totalFinTril, 1)}조 원 분해">
        <circle cx="${xAt(i)}" cy="${yTril(r.totalFinTril)}" r="4.2" fill="#fff" stroke="#0f223d" stroke-width="2"/>
        ${i === 0 || i === 5 || i === 9 || i === qRows.length - 1 ? `<text x="${xAt(i)}" y="${yTril(r.totalFinTril) - 9}" text-anchor="middle" font-size="9.5" font-weight="700" fill="#0f223d">${fmt(r.totalFinTril, 0)}</text>` : ''}
        <text x="${xAt(i)}" y="${bottom + 19}" text-anchor="middle" font-size="9" fill="#65717e">${r.period.slice(2)}</text>
      </g>`).join('')}
    </svg>
    <div class="table-wrap" style="margin-top:14px">
      <table class="data-table">
        <thead>
          <tr>
            <th scope="col">시점</th>
            <th scope="col">총금융자산</th>
            <th scope="col">① 현금 및 예금</th>
            <th scope="col">② 지분증권·펀드</th>
            <th scope="col">③ 보험·연금</th>
            <th scope="col">④ 채권·ELS</th>
            <th scope="col">총금융부채</th>
            <th scope="col">순금융자산 (배율)</th>
          </tr>
        </thead>
        <tbody>
          ${qRows.map((r, i) => `<tr class="${i === qRows.length - 1 ? 'selected' : ''}" data-xray="hw-q:${r.period}" tabindex="0" role="button">
            <td><b class="xray-token">${r.period}</b></td>
            <td><b>${fmt(r.totalFinTril, 1)}조</b></td>
            <td>${fmt(r.depositsTril, 1)}조 <small class="muted">(${fmt(r.sharesPct.deposits, 1)}%)</small></td>
            <td style="color:var(--teal);font-weight:700">${fmt(r.equitiesFundsTril, 1)}조 <small class="muted">(${fmt(r.sharesPct.equitiesFunds, 1)}%)</small></td>
            <td>${fmt(r.insPensionTril, 1)}조</td>
            <td>${fmt(r.bondsTril, 1)}조</td>
            <td>${fmt(r.finLiabTril, 1)}조</td>
            <td><b>${fmt(r.netFinTril, 1)}조</b> <small class="muted">(${fmt(r.assetLiabRatioX, 2)}x)</small></td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

function renderHwIntlVisual(D) {
  const hw = D.householdWealthAndIntl2026;
  const list = hw.intl5Countries;

  if (explorerState.hwCountryLens === 'macro_gdp') {
    const five = list.filter(c => c.assetsToGdpX !== null);
    return `
      <div class="legend" style="margin-bottom:8px">
        <span><i style="background:#60788c"></i>비금융(실물)자산 비중</span>
        <span><i style="background:#004ea2"></i>금융자산 비중</span>
        <span class="muted">우측 수치 = 명목 GDP 대비 가계총자산 배율(배) · 클릭 시 국가별 편제 주석 표시</span>
      </div>
      <div class="hw-stack-list">
        ${five.map(c => {
          const sel = explorerState.hwSelectedCountry === c.code;
          return `<div class="hw-stack-row ${sel ? 'selected' : ''}" data-hw-country="${c.code}" tabindex="0" role="button" aria-pressed="${sel}">
            <div><b>${c.country}</b><br><small class="muted">GDP ${c.nominalGdpLocal}</small></div>
            <div>
              <div class="hw-stack-track" title="${c.country} 실물 ${c.realAssetSharePct}% / 금융 ${c.finAssetSharePct}%">
                <span style="width:${c.realAssetSharePct}%;background:#60788c"></span>
                <span style="width:${c.finAssetSharePct}%;background:#004ea2"></span>
              </div>
              <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--muted);margin-top:3px">
                <span>실물 ${fmt(c.realAssetSharePct, 1)}%</span>
                <span style="color:var(--teal);font-weight:600">금융 ${fmt(c.finAssetSharePct, 1)}%</span>
              </div>
            </div>
            <div style="text-align:right"><strong style="font-size:17px;color:var(--ink)">GDP ${fmt(c.assetsToGdpX, 2)}배</strong><br><small class="muted">${c.totalAssetsLocal.split(' ')[0]}</small></div>
          </div>`;
        }).join('')}
      </div>`;
  }

  return `
    <div class="legend" style="margin-bottom:8px">
      ${hwFinLabels.map(([k, lbl]) => `<span><i style="background:${hwFinColors[k]}"></i>${lbl}</span>`).join('')}
    </div>
    <div class="hw-stack-list">
      ${list.map(c => {
        const sel = explorerState.hwSelectedCountry === c.code;
        const m = c.finMixPct;
        const tot = m.deposits + m.equitiesFunds + m.insPension + m.bonds + m.other;
        return `<div class="hw-stack-row ${sel ? 'selected' : ''}" data-hw-country="${c.code}" tabindex="0" role="button" aria-pressed="${sel}">
          <div><b>${c.country}</b><br><small class="muted">${c.basePeriod}</small></div>
          <div class="hw-stack-track" role="img" aria-label="${c.country} 예금 ${m.deposits}%, 주식펀드 ${m.equitiesFunds}%, 보험연금 ${m.insPension}%, 채권 ${m.bonds}%">
            ${hwFinLabels.map(([k, lbl]) => `<span title="${lbl} ${m[k]}%" style="width:${(m[k] / tot) * 100}%;background:${hwFinColors[k]}"></span>`).join('')}
          </div>
          <div style="text-align:right;font-size:11px"><b>예금 ${fmt(m.deposits, 1)}%</b><br><span style="color:var(--teal);font-weight:600">증권·펀드 ${fmt(m.equitiesFunds, 1)}%</span></div>
        </div>`;
      }).join('')}
    </div>`;
}

function renderHwCountryNote(D) {
  const hw = D.householdWealthAndIntl2026;
  const c = hw.intl5Countries.find(x => x.code === explorerState.hwSelectedCountry) || hw.intl5Countries[0];
  return `<div class="pool-detail-box">
    <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:4px">
      <b>${c.country} · 통계 원천 및 편제 경계 (${c.sourceOrg})</b>
      <span class="badge green">${c.latestFinAssetsNote}</span>
    </div>
    <p style="margin:0">${c.accountingNote}</p>
    <p style="margin-top:6px;color:var(--muted);font-size:11px"><b>한국 발행어음·IMA 시사점</b> · 5개국 모두 가계의 개별 채권 직접보유 비중은 1~4%(한국 2.6%, 미국 4.3%, 일본 1.5%, 영국 &lt;1%)에 불과합니다. 미국이 MMF·채권형 펀드로, 영국이 사적연금으로 예금과 직접채권 사이의 공백을 메웠듯, 한국에서는 AA급 종투사의 발행어음·IMA가 은행 정기예금(1,474조)과 퇴직연금 원리금보장(378조)의 중수익 대안 축을 담당합니다.</p>
  </div>`;
}

export function bindHouseholdWealthPage(D, onNavigate = tab => { location.hash = tab; }) {
  const treeRoot = document.getElementById('hw-korea-tree');
  if (!treeRoot) return;

  treeRoot.querySelectorAll('[data-hw-cat]').forEach(btn => {
    btn.addEventListener('click', () => {
      explorerState.hwCategory = btn.dataset.hwCat;
      treeRoot.querySelectorAll('[data-hw-cat]').forEach(el => {
        const act = el === btn;
        el.classList.toggle('active', act);
        el.setAttribute('aria-pressed', String(act));
      });
      document.getElementById('hw-cat-detail').innerHTML = renderHwCategoryDetail(D);
    });
  });

  const tsRoot = document.getElementById('hw-timeseries');
  if (tsRoot) {
    tsRoot.querySelectorAll('[data-hw-series]').forEach(btn => {
      btn.addEventListener('click', () => {
        explorerState.hwSeriesMode = btn.dataset.hwSeries;
        tsRoot.querySelectorAll('[data-hw-series]').forEach(el => el.classList.toggle('active', el === btn));
        document.getElementById('hw-timeseries-body').innerHTML = renderHwTimeseriesBody(D);
      });
    });
  }

  const intlRoot = document.getElementById('hw-intl-5country');
  if (intlRoot) {
    const syncCountrySelection = code => {
      explorerState.hwSelectedCountry = code;
      document.getElementById('hw-intl-visual').innerHTML = renderHwIntlVisual(D);
      intlRoot.querySelectorAll('#hw-intl-table [data-hw-country]').forEach(tr => {
        tr.classList.toggle('selected', tr.dataset.hwCountry === code);
      });
      document.getElementById('hw-intl-note').innerHTML = renderHwCountryNote(D);
      bindVisualRows();
    };

    const bindVisualRows = () => {
      intlRoot.querySelectorAll('#hw-intl-visual [data-hw-country]').forEach(row => {
        const pick = () => syncCountrySelection(row.dataset.hwCountry);
        row.addEventListener('click', pick);
        row.addEventListener('keydown', e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            pick();
          }
        });
      });
    };

    intlRoot.querySelectorAll('[data-hw-country-lens]').forEach(btn => {
      btn.addEventListener('click', () => {
        explorerState.hwCountryLens = btn.dataset.hwCountryLens;
        intlRoot.querySelectorAll('[data-hw-country-lens]').forEach(el => el.classList.toggle('active', el === btn));
        document.getElementById('hw-intl-visual').innerHTML = renderHwIntlVisual(D);
        bindVisualRows();
      });
    });

    intlRoot.querySelectorAll('#hw-intl-table [data-hw-country]').forEach(tr => {
      tr.addEventListener('click', () => syncCountrySelection(tr.dataset.hwCountry));
    });

    bindVisualRows();
  }
}

/* ==========================================================================
   6. #pnl — 발행어음 & IMA 금융당국 전수 규제 · 금감원 보고 주기 · 복구기간 · 법적 페널티 총람
   ========================================================================== */
const regLibraryDeepLinks = [
  { href: '?mode=comparison&topic=0#regulations', label: '규정모음집 · 조달 한도 비교 →' },
  { href: '?mode=comparison&topic=1#regulations', label: '규정모음집 · 기업금융 의무 비교 →' },
  { href: '?mode=comparison&topic=5#regulations', label: '규정모음집 · 부동산 한도 비교 →' },
  { href: '?mode=comparison&topic=2#regulations', label: '규정모음집 · 모험자본 비교 →' },
  { href: '?mode=comparison&topic=11#regulations', label: '규정모음집 · 단기 유동성 비교 →' },
  { href: '?q=제77조의3#regulations', label: '규정모음집 · 제77조의3 특례 →' },
  { href: '?q=제3-20조의6#regulations', label: '규정모음집 · 세칙 제3-20조의6(IMA 감경) →' },
  { href: '?mode=comparison&topic=6#regulations', label: '규정모음집 · 구분관리 비교 →' },
  { href: '?q=제4-102조의8#regulations', label: '규정모음집 · 제4-102조의8·9 →' }
];

function renderRegulatoryRows(D) {
  const reg = D.regulatoryComplianceMatrix2027;
  if (!reg) return '';
  const filtered = reg.rules.filter(r =>
    explorerState.regCategory === 'all' || r.category === explorerState.regCategory
  );
  return filtered.map(r => {
    const deep = regLibraryDeepLinks[r.idx] || { href: '#regulations', label: '규정모음집 →' };
    return `<tr data-xray="reg-rule:${r.idx}" tabindex="0" role="button">
    <td style="min-width:170px">
      <span class="badge ${r.severity}">${r.categoryBadge}</span>
      <div style="margin-top:5px"><b class="xray-token">${r.title}</b></div>
      <span class="reg-statute-tag">${r.statute.split(' · ')[0]}</span>
    </td>
    <td style="min-width:195px">${r.promNoteRule}</td>
    <td style="min-width:195px">${r.imaRule}</td>
    <td style="min-width:155px"><b>${r.reportingCycle}</b></td>
    <td style="min-width:185px">${r.curePeriod}</td>
    <td style="min-width:210px">
      <div style="color:#9e2a2b;font-weight:600">${r.penalty}</div>
      <small class="muted" style="display:block;margin-top:4px">근거: ${r.statute}</small>
      <a class="reg-internal-link" href="${deep.href}" data-reg-jump>${deep.label}</a>
    </td>
  </tr>`;
  }).join('');
}

export function renderRegulatoryCompliancePanel(D) {
  const reg = D.regulatoryComplianceMatrix2027;
  if (!reg) return '';

  return `<section class="panel" id="reg-compliance-matrix" style="scroll-margin-top:95px">
    <div class="panel-head">
      <div>
        <div class="eyebrow">CORE STATUTORY COMPLIANCE · 발행어음·IMA 9대 고유 규제 · 보고 주기 · 복구기한 · 법적 제재</div>
        <h2>발행어음 &amp; IMA 9대 고유 건전성·운용 규제와 금감원 보고 주기 · 위반 복구기간 · 페널티 총람</h2>
        <p>전사 공통 여신 규제(신용공여·대주주 제한)와 진입 요건(인가 자기자본)을 제외하고, <b>조달 한도·만기, 기업금융·부동산·모험자본 의무, 원화·외화 유동성비율(1·3개월 ≥100%), 규제 레버리지 차감 특례, 신NCR 위험액, 구분관리·자전거래 금지, 금소법 설명의무</b> 등 9대 고유 규제만 법적 조항 출처와 함께 정리했습니다.</p>
      </div>
      <span class="badge blue">고유 규제 9대 항목</span>
    </div>

    <div class="grid4-metrics" style="margin-bottom:16px">
      ${reg.overviewCards.map(c => `<div class="metric" data-xray="${c.xrayKey}" tabindex="0" role="button">
        <small>${c.label}</small>
        <strong style="font-size:21px;color:var(--ink)">${c.value}</strong>
        <p class="muted">${c.sub}</p>
      </div>`).join('')}
    </div>

    <div class="lens-toolbar" style="margin-bottom:12px">
      <div class="lens-switch" role="group" aria-label="규제 영역별 필터">
        ${reg.categories.map(cat => `<button type="button" class="lens-btn ${explorerState.regCategory === cat.id ? 'active' : ''}" data-reg-cat="${cat.id}">${cat.label}</button>`).join('')}
      </div>
      <span class="muted" style="font-size:11px">${reg.updatedAsOf}</span>
    </div>

    <div class="table-wrap">
      <table class="data-table reg-matrix-table" id="reg-compliance-table">
        <thead>
          <tr>
            <th scope="col">규제 영역 · 핵심 의무 (클릭 시 상세)</th>
            <th scope="col">발행어음 (단기금융업)</th>
            <th scope="col">IMA (종합투자계좌)</th>
            <th scope="col">금감원 보고 · 점검 주기</th>
            <th scope="col">위반 시 복구(유예 · 시정) 기간</th>
            <th scope="col">법적 페널티 및 근거 조항 출처</th>
          </tr>
        </thead>
        <tbody id="reg-compliance-tbody">
          ${renderRegulatoryRows(D)}
        </tbody>
      </table>
    </div>

    <div class="callout" style="margin-bottom:0">
      <b>복구(유예) 기간의 법적 구분 핵심</b> · 발행어음·IMA 고유 건전성·운용 규제는 <b>사전 자동 유예기간이 없습니다</b>(부동산 15%→10% · 모험자본 10%→25%의 연도별 단계적 경과조치만 존재). <b>① 원화 유동성비율(1·3개월 &lt;100%, 금투업규정 제3-24조의4)</b> 및 <b>② 신NCR(&lt;100%, 적기시정조치)</b> 미달 시 즉시 금감원장 사유·시정계획 보고 후 단기 복구 명령 대상이며, <b>③ 불건전 자전거래·불완전판매</b>는 유예 없이 즉시 과징금·기관제재·형사벌 대상입니다.
    </div>
    ${srcBox('자본시장과 금융투자업에 관한 법률(제30조·제33조·제47조·제77조의3·제85조·제416조·제420조·제422조·제428조·제444조·제449조) · 동법 시행령(제36조·제77조의6) · 금융투자업규정(제3-24조·제3-24조의2·제3-24조의4·제3-28조~제3-32조·제3-66조·제4-102조의6~9·제5-23조의2) · 동 시행세칙(제2-8조의3·별표 5·별표 10) · 금융소비자보호법(제19조·제21조·제47조·제57조·제69조).', 'reg-rule:4')}
  </section>`;
}

export function bindRegulatoryCompliancePanel(D) {
  const root = document.getElementById('reg-compliance-matrix');
  const tbody = document.getElementById('reg-compliance-tbody');
  if (!root || !tbody) return;

  root.querySelectorAll('[data-reg-cat]').forEach(btn => {
    btn.addEventListener('click', () => {
      explorerState.regCategory = btn.dataset.regCategory || btn.dataset.regCat;
      root.querySelectorAll('[data-reg-cat]').forEach(el => el.classList.toggle('active', el === btn));
      tbody.innerHTML = renderRegulatoryRows(D);
    });
  });
}

const imaComparisonState = { lens: 'tranches', firm: 'all' };
const imaComparisonLenses = [
  ['tranches', '회차별 상품'],
  ['dart_assets', '편입자산 · 공시'],
  ['findings', '읽을 때 확인할 점']
];

function imaComparisonLinks(sources) {
  return sources.map(({ label, url }) =>
    `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`
  ).join('');
}

function renderImaFirmCards(ds) {
  return `<div class="ima-firms-grid">
    ${ds.firms.map(firm => {
      const segments = firm.assetMix.map(asset =>
        `<span style="width:${asset.sharePct}%;background:${asset.color}" title="${asset.label} ${fmt(asset.sharePct, 1)}%"></span>`
      ).join('');
      const mainAssets = firm.assetMix.slice(0, 2);
      return `<article class="ima-firm-card" style="--ima-accent:${firm.accentColor}">
        <div>
          <h3>${firm.name}</h3>
          <p class="ima-firm-maturity">${firm.maturityRange}</p>
        </div>
        <dl class="ima-firm-balances">
          <div><dt>운용자산</dt><dd>${fmt(firm.dartAssetsEok / 10000, 2)}조</dd></div>
          <div><dt>수탁부채</dt><dd>${fmt(firm.dartLiabEok / 10000, 2)}조</dd></div>
        </dl>
        <div>
          <div class="ima-stack-bar" aria-hidden="true">${segments}</div>
          <p class="ima-firm-mix">${mainAssets.map(asset => `<span>${asset.label} <b>${fmt(asset.sharePct, 1)}%</b></span>`).join('')}</p>
        </div>
        <div class="ima-firm-strategy">
          <p class="ima-strategy-title" data-ima-strategy="${firm.key}"><span class="badge amber">전략 해석 · 추정</span><strong>${firm.strategyTag}</strong></p>
          <p>${firm.strategySummary}</p>
          <p class="ima-strategy-watch"><b>점검할 신호</b> ${firm.strategyWatch}</p>
        </div>
        <div class="ima-firm-actions">
          <div class="ima-source-links" aria-label="${firm.name} 전략 근거">${imaComparisonLinks(firm.strategySources)}</div>
          <button class="chip" type="button" data-ima-card-filter="${firm.key}" aria-controls="ima-compare-details" aria-label="${firm.name} 회차 보기">회차 보기</button>
        </div>
      </article>`;
    }).join('')}
  </div>`;
}

function renderImaTrancheTable(ds) {
  const selected = imaComparisonState.firm;
  const rows = ds.tranches.filter(tranche => selected === 'all' || tranche.firmKey === selected);
  const filters = [['all', '전체'], ...ds.firms.map(firm => [firm.key, firm.name])];
  return `<div class="chips" role="group" aria-label="증권사별 회차 필터">
    ${filters.map(([key, name]) => `<button type="button" class="chip${selected === key ? ' active' : ''}" data-ima-firm="${key}" aria-pressed="${selected === key}">${name}</button>`).join('')}
  </div>
  <div class="table-wrap ima-table">
    <table class="data-table ima-tranche-table" aria-label="IMA 회차별 모집 조건">
      <thead><tr>
        <th scope="col">증권사 · 회차</th><th scope="col">유형 · 상태</th><th scope="col">모집 시기</th>
        <th scope="col">모집 규모</th><th scope="col">상품 만기</th><th scope="col">기준수익률</th>
        <th scope="col">총보수</th><th scope="col">성과보수</th><th scope="col">주요 조건</th>
      </tr></thead>
      <tbody>${rows.map(tranche => `<tr data-ima-tranche="${tranche.firmKey}">
        <th scope="row"><b>${tranche.tranche}</b><br><small class="muted">${tranche.firmName}</small></th>
        <td>${tranche.category}<br><small class="muted">${tranche.status}</small></td>
        <td class="tabular">${tranche.launchPeriod}</td>
        <td><b>${tranche.amountLabel}</b>${tranche.dartLiab26Q3Eok == null ? '' : `<br><small>9월 말 수탁부채 ${fmt(tranche.dartLiab26Q3Eok, 1)}억</small>`}</td>
        <td>${tranche.maturityLabel}</td>
        <td class="tabular">${tranche.hurdlePct == null ? '미확인' : `연 ${fmt(tranche.hurdlePct, 1)}%`}</td>
        <td>${tranche.baseFeeLabel}</td>
        <td>${tranche.perfFeeLabel}</td>
        <td>${tranche.assetsAndNotes}${tranche.source ? `<div class="ima-source-links">${imaComparisonLinks([tranche.source])}</div>` : ''}</td>
      </tr>`).join('')}</tbody>
    </table>
  </div>`;
}

function renderImaDartAssetView(ds) {
  const names = ds.firms.map(firm => `<th scope="col">${firm.name}</th>`).join('');
  const balance = n => `${fmt(n, 1)}억`;
  const fairValueTier = firm => firm.level3SharePct == null
    ? 'IMA 단독 미분리'
    : `Level 2 ${fmt(firm.level2SharePct, 1)}% · Level 3 ${fmt(firm.level3SharePct, 1)}%`;
  const reportRows = [
    ['공정가치 서열', fairValueTier],
    ['평가 투입변수', firm => firm.level3InputNote],
    ['누적 장부 손익', firm => `자산·수익 ${balance(firm.q3CumAssetPnlEok)} / 부채·비용 ${balance(firm.q3CumLiabPnlEok)}`],
    ['분기 공시 손익 참고', firm => firm.q3NetCaptureLabel],
    ['시딩 / 손실준비금', firm => `${balance(firm.dartSeedingEok)} / ${balance(firm.dartLossReserveEok)}<br><small>${firm.dartLossReserveDetail}</small>`],
    ['회사별 공시 범위', firm => firm.dartDisclosureHighlight]
  ];
  const miraeMix = ds.firms.find(firm => firm.key === 'mirae').rebalancingComparison;
  return `<div class="table-wrap ima-table"><table class="data-table" aria-label="3분기 실제 편입자산">
    <thead><tr><th scope="col">편입자산 공정가치 · 2026.09.30</th>${names}</tr></thead>
    <tbody>${ds.assetComparisonMatrix.map(row => `<tr>
      <th scope="row">${row.category}</th>
      ${ds.firms.map(({ key }) => {
        const amount = row[key + 'Eok'];
        return `<td class="tabular">${amount > 0 ? `${balance(amount)} (${fmt(row[key + 'Pct'], 1)}%)` : '—'}</td>`;
      }).join('')}
    </tr>`).join('')}
    <tr><th scope="row">IMA 투자자산 합계</th>${ds.firms.map(firm => `<td><b>${balance(firm.dartAssetsEok)}</b></td>`).join('')}</tr></tbody>
  </table></div>
  <p class="ima-table-note">— 는 해당 공시에서 금액이 별도 확인되지 않은 항목을 포함합니다.</p>
  <div class="table-wrap ima-table"><table class="data-table" aria-label="공정가치·손익·손실준비금">
    <thead><tr><th scope="col">공정가치 · 손익 · 준비금</th>${names}</tr></thead>
    <tbody>${reportRows.map(([label, value]) => `<tr><th scope="row">${label}</th>${ds.firms.map(firm => `<td>${value(firm)}</td>`).join('')}</tr>`).join('')}</tbody>
  </table></div>
  <p class="ima-table-note">분기 공시의 자산·부채 손익 차이는 별도 집계한 상품 순이익과 범위가 다릅니다.</p>
  <div class="table-wrap ima-table"><table class="data-table" aria-label="미래에셋 합산 편입자산 변화">
    <thead><tr><th scope="col">미래에셋 합산 자산 구성</th><th scope="col">${miraeMix.fromLabel}</th><th scope="col">${miraeMix.toLabel}</th><th scope="col">금액 변화</th></tr></thead>
    <tbody>${miraeMix.rows.map(row => `<tr><th scope="row">${row.item}</th><td>${fmt(row.fromPct, 1)}%</td><td>${fmt(row.toPct, 1)}%</td><td>${row.note}</td></tr>`).join('')}</tbody>
  </table></div>`;
}

function renderImaSpecialFindings(ds) {
  return `<div class="ima-findings-grid">
    ${ds.specialFindings.map(({ title, summary, detail }) => `<article class="ima-finding-card">
      <h3>${title}</h3>
      <p>${summary} ${detail}</p>
    </article>`).join('')}
  </div>`;
}

function renderImaLensBody(ds) {
  if (imaComparisonState.lens === 'dart_assets') return renderImaDartAssetView(ds);
  if (imaComparisonState.lens === 'findings') return renderImaSpecialFindings(ds);
  return renderImaTrancheTable(ds);
}

function imaFundingPeriod(label) {
  const match = /^(\d{4})\.(\d{2})(?:\.(\d{2})(?:~(?:(\d{2})\.)?(\d{2}))?)?/.exec(label);
  if (!match) return null;
  const [, yearText, monthText, day, endMonthText, endDay] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const start = Date.UTC(year, month - 1, Number(day || 1));
  if (!day) return { start, end: Date.UTC(year, month, 0), monthOnly: true };

  const endMonth = Number(endMonthText || month);
  const endYear = endMonth < month ? year + 1 : year;
  const end = endDay ? Date.UTC(endYear, endMonth - 1, Number(endDay)) : start;
  return { start, end, monthOnly: false };
}

function imaFundingAmountLabel(label) {
  const text = String(label ?? '').trim().replace(/^약\s*/, '').replaceAll(',', '');
  const trillions = /^(\d+(?:\.\d+)?)\s*조(?:\s*(\d+)\s*억)?/.exec(text);
  if (trillions) {
    return `${fmt(Number(trillions[1]) + Number(trillions[2] || 0) / 10000, 1)}조`;
  }
  const amount = /^(\d+)(?:\s*~\s*(\d+))?\s*억/.exec(text);
  if (!amount) return '미확인';
  const [, low, high = low] = amount;
  const digits = Number(low) < 1000 ? 2 : 1;
  const start = fmt(Number(low) / 10000, digits);
  const end = fmt(Number(high) / 10000, digits);
  return `${start === end ? start : `${start}~${end}`}조`;
}

function renderImaFundingTimeline(ds) {
  const entries = ds.tranches.flatMap((tranche, index) => {
    const period = imaFundingPeriod(tranche.launchPeriod);
    return period ? [{ tranche, index, ...period }] : [];
  }).sort((a, b) => a.start - b.start);
  if (!entries.length) return '';

  const first = new Date(entries[0].start);
  const last = new Date(Math.max(...entries.map(entry => entry.end)));
  const firstMonth = first.getUTCFullYear() * 12 + first.getUTCMonth();
  const lastMonth = last.getUTCFullYear() * 12 + last.getUTCMonth();
  const monthStart = index => Date.UTC(Math.floor(index / 12), index % 12, 1);
  const axisStart = monthStart(firstMonth);
  const axisEnd = monthStart(lastMonth + 1);
  const position = date => (date - axisStart) / (axisEnd - axisStart) * 100;
  const ticks = Array.from({ length: lastMonth - firstMonth + 1 }, (_, offset) => {
    const date = monthStart(firstMonth + offset);
    return {
      position: position(date),
      text: new Date(date).toISOString().slice(2, 7).replace('-', '.')
    };
  });
  const gridlines = ticks.map(tick =>
    `<span class="ima-funding-gridline" style="left:${tick.position}%" aria-hidden="true"></span>`
  ).join('');

  return `<section class="ima-funding-timeline" id="ima-funding-timeline" aria-labelledby="ima-funding-title">
    <h3 id="ima-funding-title">회차별 IMA 모집 시점</h3>
    <div class="ima-funding-scroll" role="region" tabindex="0" aria-label="세 회사의 회차별 IMA 모집 시점">
      <div class="ima-funding-plot">
        ${ds.firms.map(firm => `<div class="ima-funding-firm">${firm.name}</div>
          <div class="ima-funding-lane" data-ima-funding-lane="${firm.key}" style="--ima-accent:${firm.accentColor}">
            ${gridlines}
            ${entries.filter(entry => entry.tranche.firmKey === firm.key).map(({ tranche, index, start, end, monthOnly }) => {
              const announced = tranche.status?.includes('설정 예정');
              const css = monthOnly ? ' is-month' : announced ? ' is-announced' : '';
              const label = tranche.tranche.replace(/^IMA ([SG]\d+) .*$/, '$1')
                .replace(/^N2 IMA1 |^미래에셋 IMA /, '').replace('기형 ', '기 ');
              const amount = imaFundingAmountLabel(tranche.amountLabel);
              const text = `${firm.name} ${tranche.tranche} · ${tranche.launchPeriod} · 공개 규모 ${tranche.amountLabel}${announced ? ' · 설정 예정' : ''}`;
              return `${end > start ? `<span class="ima-funding-window${css}" style="left:${position(start)}%;width:${position(end) - position(start)}%" aria-hidden="true"></span>` : ''}
                <button type="button" class="ima-funding-event${css}" style="left:${position(monthOnly ? (start + end) / 2 : start)}%" data-ima-funding-event="${index}" title="${text}" aria-label="${text}" aria-pressed="false">
                  <span class="ima-funding-event-label">${label}</span><span class="ima-funding-point" aria-hidden="true"></span>
                  <span class="ima-funding-amount${amount === '미확인' ? ' is-unknown' : ''}" aria-hidden="true">${amount}</span>
                </button>`;
            }).join('')}
          </div>`).join('')}
        <div class="ima-funding-firm ima-funding-axis-label">모집 시점</div>
        <div class="ima-funding-axis" aria-hidden="true">
          ${ticks.map(tick => `<span style="left:${tick.position}%">${tick.text}</span>`).join('')}
        </div>
      </div>
    </div>
    <p class="ima-table-note">점은 모집 시작일, 선은 모집 기간입니다. 흐린 막대는 월 단위 자료이며, 빈 점은 설정 예정 회차입니다. 금액은 공개 모집 규모를 조 원으로 환산해 반올림했습니다.</p>
    <p id="ima-funding-selection" class="ima-funding-selection" role="status">회차를 선택하면 모집 시기와 공개 규모를 볼 수 있습니다.</p>
  </section>`;
}

export function renderIma3FirmsComparisonPanel(D) {
  const ds = D.ima3FirmsComparison2026Q3;
  if (!ds) return '';
  const scheduled = ds.tranches.length - ds.totalTranchesConfirmed;
  return `<section class="panel" id="ima-3firms-panel" aria-labelledby="ima-comparison-title">
    <div class="panel-head">
      <div>
        <h2 id="ima-comparison-title">세 회사는 왜 IMA에 다르게 접근할까?</h2>
        <p>2026.09.30 운용 공시 · 출시 확인 ${ds.totalTranchesConfirmed}개 회차 · 추가 모집 공지 ${scheduled}건 (${ds.asOfDate})</p>
      </div>
    </div>
    ${renderImaFirmCards(ds)}
    ${renderImaFundingTimeline(ds)}
    <details class="ima-compare-details" id="ima-compare-details">
      <summary>회차별 상품 조건 · 편입자산 · 공시 보기</summary>
      <div class="lens-switch ima-compare-lenses" role="group" aria-label="3사 IMA 자료 선택">
        ${imaComparisonLenses.map(([key, label]) => `<button type="button" class="lens-btn${imaComparisonState.lens === key ? ' active' : ''}" data-ima-lens="${key}" aria-pressed="${imaComparisonState.lens === key}">${label}</button>`).join('')}
      </div>
      <div id="ima-compare-body">${renderImaLensBody(ds)}</div>
      <p class="ima-table-note">${ds.disclosureBoundaryNote}</p>
      <div class="ima-source-links" aria-label="IMA 비교 공시 출처">${imaComparisonLinks(ds.sources)} · <a class="reg-internal-link" href="?q=제4-102조의9#regulations" data-reg-jump>규정모음집 · 제4-102조의9(IMA 업무·5% 준비금) →</a></div>
    </details>
  </section>`;
}

export function bindIma3FirmsComparisonPanel(D) {
  const ds = D.ima3FirmsComparison2026Q3;
  const root = document.getElementById('ima-3firms-panel');
  if (!root || !ds) return;
  const details = root.querySelector('#ima-compare-details');
  const body = root.querySelector('#ima-compare-body');
  const lensButtons = root.querySelectorAll('[data-ima-lens]');

  const renderSelection = () => {
    body.innerHTML = renderImaLensBody(ds);
    lensButtons.forEach(button => {
      const selected = button.dataset.imaLens === imaComparisonState.lens;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
  };

  root.addEventListener('click', event => {
    const button = event.target.closest('button[data-ima-lens], button[data-ima-firm], button[data-ima-card-filter], button[data-ima-funding-event]');
    if (!button) return;
    const { imaLens, imaFirm, imaCardFilter, imaFundingEvent } = button.dataset;
    if (imaFundingEvent !== undefined) {
      const tranche = ds.tranches[Number(imaFundingEvent)];
      root.querySelector('[data-ima-funding-event][aria-pressed="true"]')?.setAttribute('aria-pressed', 'false');
      button.setAttribute('aria-pressed', 'true');
      root.querySelector('#ima-funding-selection').textContent =
        `${tranche.firmName} · ${tranche.tranche} · 모집 ${tranche.launchPeriod} · 공개 규모 ${tranche.amountLabel} · ${tranche.status}`;
      return;
    }
    if (imaLens) {
      imaComparisonState.lens = imaLens;
      renderSelection();
      return;
    }
    imaComparisonState.firm = imaCardFilter || imaFirm;
    if (imaCardFilter) {
      imaComparisonState.lens = 'tranches';
      details.open = true;
    }
    renderSelection();
    body.querySelector('[data-ima-firm][aria-pressed="true"]')?.focus({ preventScroll: Boolean(imaCardFilter) });
    if (imaCardFilter) {
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      details.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    }
  });
}
