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
  shortBorr: '#44a695',
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
  vcLens: 'raroc_eva',
  vcVehicle: 'note',
  vcPkgYear: '2027',
  vcStrategyIdx: 1,
  vcPoolFilter: 'all',
  expandedPoolId: 'vc_ntfc'
};

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

function srcBox(text) {
  return `<div class="source"><b>출처 및 산정방식</b> · ${text} <a href="#sources">원천·검토 사항 ↗</a></div>`;
}

function miniMixBar(fundingRow) {
  if (!fundingRow) return '';
  return `<div class="mini-mix-bar" role="img" aria-label="${fundingRow.firm} 차입부채 조달 비중">${Object.keys(mixLabels).map(k =>
    `<span title="${mixLabels[k]} ${fundingRow.mixPct[k]}%" style="width:${fundingRow.mixPct[k]}%;background:${mixColors[k]}"></span>`
  ).join('')}</div>`;
}

/* ==========================================================================
   1. #funding — 9대 종투사 2027E 85조 수정 전망 분해 & 인라인 연쇄 드릴다운 (방안 A + C)
   ========================================================================== */
export function renderFundingBreakdownPanel(D) {
  const list = D.ib9FirmsCuriosityChain || [];
  if (!list.length) return '';

  return `<section class="panel" id="firm-growth-chain" style="scroll-margin-top:95px">
    <div class="panel-head">
      <div>
        <div class="eyebrow">COMPANY BREAKDOWN · 85조 수정 전망에서 회사별 전략·수익성까지</div>
        <h2>2027E 85조 원 수정 전망, 누가 왜 얼마나 늘리고 다른 수단·수익성은 어떻게 다를까?</h2>
        <p>각 증권사 행을 클릭하면 <b>① 인가 현황·성장 전제 → ② 자본 대비 비율 격차 이유와 대체 조달·실효금리 → ③ 전사 영업 수익성(ROE)</b>이 그 자리에서 펼쳐집니다.</p>
      </div>
      <span class="badge green">9사 전원 인가 · 메리츠 IR 반영</span>
    </div>
    <div class="callout" style="margin-top:0">
      <b>메리츠 2027 IR 목표(연말 4조 · 평잔 2조) 반영 &amp; 9사 전원 인가 요약</b> · 사용자가 전달한 <b>메리츠증권 2027년 발행어음 IR 목표(연말 잔액 4.00조 · 연간 NIM 수익 계산용 평잔 2.00조, 원문 링크 별도 확인 전)</b>로 기존 잠재 2사 합산 2.00조 가정을 대체해 연말 수정 전망은 <b>85.00조 원(발행어음 80.00조 + IMA 5.00조 · 원문 모형 83.00조)</b>입니다. 2026.09.09 8호 인가를 받은 삼성증권은 별도 목표 자료가 없어 추가 물량(0.00조)을 미반영했으며(0은 회사 발표 목표가 아님), 2026.09 삼성·메리츠 어음 인가 및 2026.03 NH IMA 3호 인가를 반영한 잠재 레인지는 행을 클릭하면 펼쳐집니다.
    </div>
    <div class="table-wrap">
      <table class="data-table drill-table" id="funding-chain-table">
        <thead>
          <tr>
            <th scope="col">증권사 · 인가 상태</th>
            <th scope="col">'26.2Q 어음+IMA</th>
            <th scope="col">'26.2Q 어음/자본 비율</th>
            <th scope="col">'27E 수정 전망</th>
            <th scope="col">공시 기준 순증</th>
            <th scope="col">'26.1H 어음 실효금리</th>
            <th scope="col">'26.1H 별도 ROE(연환산)</th>
          </tr>
        </thead>
        <tbody id="funding-chain-tbody">
          ${renderFundingChainRows(D)}
        </tbody>
      </table>
    </div>
    ${srcBox('발행어음·IMA 잔액 및 실효금리는 FISIS 202606(SF304·SF325·SF321) 기준. 한국투자·미래에셋·NH 전망에는 IMA가 포함됩니다. 메리츠 연말 4.00조·평잔 2.00조는 2026.11.17 사용자 전달 IR 목표(원문 링크 별도 확인 전)이며, 삼성 0.00조는 별도 목표 미확인에 따른 미반영(발표 목표 아님)입니다. 별도·연결 ROE 및 순영업수익은 전사 재무제표 기준이며 발행어음 단독 손익이 아닙니다.')}
  </section>`;
}

function renderFundingChainRows(D) {
  const list = D.ib9FirmsCuriosityChain || [];
  return list.map(item => {
    const isOpen = explorerState.expandedFirmKey === item.key;
    const fRow = D.ib9FirmsFunding202606[item.fundingIdx];
    const fisisNote = D.promNoteFisis202606.find(x => x.firm === item.firm);
    const oppRow = (D.opportunityCost2027 || []).find(r => r.key === item.costKey);
    const baseTotal = item.base26Q2NoteTril + item.base26Q2ImaTril;
    const estTotal = item.est27ModelNoteTril + item.est27ModelImaTril;
    const deltaActual = estTotal - baseTotal;
    const deltaModel = oppRow ? oppRow.delta : deltaActual;
    const capPct = fisisNote ? fisisNote.capRatioPct : 0;
    const effNote = fRow?.effRates26H1?.promNote;
    const p = item.profitability || {};
    const roeLabel = p.h126AnnRoePct !== null && p.h126AnnRoePct !== undefined
      ? `${fmt(p.h126AnnRoePct, 1)}%`
      : (p.fy25CfsRoePct ? `연결 ${fmt(p.fy25CfsRoePct, 1)}%` : '—');

    const detailRow = isOpen ? `<tr class="drill-detail-row">
      <td colspan="7">
        <div class="drill-card">
          <div class="drill-col">
            <div class="drill-step-tag">01 · 인가 현황 &amp; '27E 전망 전제</div>
            <div class="drill-kv"><span>발행어음 / IMA</span><b>${item.noteLicense} / ${item.imaLicense}</b></div>
            <div class="drill-kv"><span>수정 전망 '27E 구성</span><b>어음 ${fmt(item.est27ModelNoteTril)}조${item.est27AverageNoteTril ? ` (평잔 ${fmt(item.est27AverageNoteTril)}조)` : ''} + IMA ${fmt(item.est27ModelImaTril)}조</b></div>
            <div class="drill-kv"><span>잠재 범위 · 비고</span><b style="color:var(--teal)">${item.est27UpdatedRangeTril}</b></div>
            <p class="drill-prose">${item.growthPremise}</p>
          </div>
          <div class="drill-col">
            <div class="drill-step-tag">02 · 자본 대비 비율 격차 이유 &amp; 대체 조달원가</div>
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
            <div class="drill-step-tag">03 · 전사 운용·영업 수익성 대조 (${p.basis})</div>
            <div class="drill-kv"><span>선순위 신용등급</span><b>${item.creditRating} <small class="muted">(${item.creditTier})</small></b></div>
            <div class="drill-kv"><span>'25년 순영업수익 / 순익</span><b>${p.fy25NetOpRevEok ? fmt(p.fy25NetOpRevEok, 0) + '억' : '연결영업익 ' + fmt(p.fy25CfsOpIncEok, 0) + '억'} / ${p.fy25NetIncEok ? fmt(p.fy25NetIncEok, 0) + '억' : '연결 ' + fmt(p.fy25CfsNetIncEok, 0) + '억'}</b></div>
            <div class="drill-kv"><span>'26.1H 반기 순익 / 판관비율</span><b>${p.h126NetIncEok ? fmt(p.h126NetIncEok, 0) + '억' : '어음이자 ' + fmt(p.h126NoteIntEok, 0) + '억'} / ${p.h126CostIncomePct ? fmt(p.h126CostIncomePct, 1) + '%' : '—'}</b></div>
            <p class="drill-prose">${p.takeaway}</p>
            <div class="drill-actions">
              <button type="button" class="btn primary" data-jump-ib="${item.key}">9사 조달·수익성 동기화 비교 →</button>
              <button type="button" class="btn" data-jump-invest="${item.key}">이 회사 모험자본 비용 시뮬레이션 →</button>
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
      <td>${fmt(baseTotal)}조</td>
      <td>
        <div style="min-width:115px">
          <span>${fmt(capPct, 1)}%</span>
          <div class="bar-track" style="margin-top:4px"><div class="bar-fill" style="width:${Math.min(100, capPct / 2)}%"></div></div>
        </div>
      </td>
      <td><b>${fmt(estTotal)}조</b>${item.est27AverageNoteTril ? `<br><small class="muted">수익평잔 ${fmt(item.est27AverageNoteTril)}조</small>` : item.key === 'samsung' ? '<br><small class="muted">별도목표 미반영</small>' : ''}</td>
      <td style="color:var(--teal);font-weight:600">+${fmt(deltaActual)}조${Math.abs(deltaModel - deltaActual) > 0.005 ? `<br><small class="muted">모형 +${fmt(deltaModel)}조</small>` : ''}</td>
      <td>${effNote === null || effNote === undefined ? '<span class="muted">26.09 인가</span>' : fmt(effNote) + '%'}${item.key === 'kb' ? ' <span class="badge amber" title="과거 고금리 약정물 만기정산 반영">이월정산</span>' : ''}</td>
      <td><b>${roeLabel}</b></td>
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

  return `<section class="panel" id="money-move-safety">
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
    <div class="grid3" style="margin-bottom:18px">
      ${m.macroLiquidity.map(x => `<div class="metric"><small>${x.label}</small><strong style="font-size:24px">${x.amount}</strong><p class="muted">${x.sub}</p></div>`).join('')}
    </div>
    <div id="money-move-body" aria-live="polite">
      ${renderMoneyMoveBody(D)}
    </div>
    ${srcBox('한국은행 ECOS 통화·예금은행 가중평균금리(2026.09) · 통합연금포털(2025말 501.4조) · FISIS(202606 SF324·SF209·SF408) · 국내 신용평가 3사 무보증 선순위 회사채 신용등급(2026년 하반기). 연금 편입 세부 조건은 질문·답변에서 확인하세요.')}
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
            <td style="min-width:110px"><div class="bar-track"><div class="bar-fill" style="width:${r.barPct}%;background:${idx >= 3 ? '#087f80' : '#7ea6c8'}"></div></div></td>
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
      <div class="metric"><small>9사 차입부채 합계 (SF325)</small><strong>472.75 <small>조 원</small></strong><p class="muted">RP 31.0% · 단기차입 23.9% · ELS 17.7%</p></div>
      <div class="metric"><small>별도 고객예수금 (SF324)</small><strong>158.50 <small>조 원</small></strong><p class="muted">증권금융 별도예치 · 고유차입과 분리</p></div>
      <div class="metric"><small>발행어음 잔액 ('26.2Q 확정)</small><strong>55.94 <small>조 원</small></strong><p class="muted">차입부채의 11.8% · '26.09 9사 전원 인가</p></div>
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
    ${srcBox('FISIS 202606 SF325(차입부채)·SF324(고객예수금)·SF321(수단별 이자비용 기반 상반기 연환산 실효금리). 7개 항목 단순 합계(472.65조)와 총계(472.75조)의 0.10조 차이는 항목별 반올림 누적 단수차입니다.')}
  </section>
  <div id="ib-sync-focus-panel" aria-live="polite" style="scroll-margin-top:95px">
    ${renderIbFirmFocusCard(D, activeChain)}
  </div>
  <section class="panel" id="ib-profitability-matrix">
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
    ${srcBox('FISIS 증권사 요약손익계산서(SF307, 별도 기준 2025년 연간 및 2026년 상반기 누적) 및 DART 사업보고서(연결 영업이익·당기순이익 병기). 2026.1H ROE는 반기 별도순이익 단순 연환산 수치이며, 전사 수익성 차이는 리테일·IB·트레이딩·판관비 구조가 결합된 결과로 발행어음 단독 효과를 뜻하지 않습니다.')}
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
      <div class="metric"><small>규제 레버리지 (한도 1,100%)</small><strong>${fmt(r.ratios.leverageReg, 1)}%</strong><p class="muted">순수 자산÷자본 ${fmt(r.ratios.leverageRawX, 1)}배</p></div>
      <div class="metric"><small>연결 순자본 ÷ 총위험액</small><strong>${fmt(r.ratios.consolCapOverRisk, 1)}%</strong><p class="muted">개별 ${fmt(r.ratios.indivCapOverRisk, 1)}% · 유동성 ${fmt(r.ratios.liq3m, 1)}%</p></div>
      <div class="metric"><small>'25년 순익 / 별도 ROE</small><strong>${p.fy25NetIncEok ? fmt(p.fy25NetIncEok, 0) + '억' : '연결 ' + fmt(p.fy25CfsNetIncEok, 0) + '억'}</strong><p class="muted">${p.fy25RoePct ? '별도 ROE ' + fmt(p.fy25RoePct, 1) + '%' : '연결 ROE ' + fmt(p.fy25CfsRoePct, 1) + '%'}${p.fy25CfsRoePct && p.fy25RoePct ? ' (연결 ' + fmt(p.fy25CfsRoePct, 1) + '%)' : ''}</p></div>
      <div class="metric"><small>'26.1H 반기 순익 / 판관비율</small><strong style="color:var(--teal)">${p.h126NetIncEok ? fmt(p.h126NetIncEok, 0) + '억' : '어음이자 ' + fmt(p.h126NoteIntEok, 0) + '억'}</strong><p class="muted">${p.h126AnnRoePct ? '연환산 ROE ' + fmt(p.h126AnnRoePct, 1) + '% · 판관비율 ' + fmt(p.h126CostIncomePct, 1) + '%' : p.basis}</p></div>
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
              <div class="bar-track"><div class="bar-fill" style="width:${width}%;background:${rk === 'promNote' ? '#087f80' : '#6c8ebf'}"></div></div>
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

  document.querySelectorAll('#ib-sync-chips [data-sync-firm]').forEach(btn => {
    btn.addEventListener('click', () => updateFirm(btn.dataset.syncFirm, false));
  });
  document.querySelectorAll('#ib-sync-portfolio-table [data-sync-row]').forEach(row => {
    row.addEventListener('click', () => updateFirm(row.dataset.syncRow, true));
  });

  bindDynamic();
}

/* ==========================================================================
   4. #invest — 모험자본 심화 3부작 (방안 C + A: 4대 기회비용 렌즈 · 선점전략 · 잠재시장)
   ========================================================================== */
export function renderVentureDeepDive(D) {
  const vc = D.ventureCapitalChain2027;
  if (!vc) return '';

  return `<section class="panel" id="vc-raroc-lab" style="scroll-margin-top:95px">
    <div class="panel-head">
      <div>
        <div class="eyebrow">OPPORTUNITY COST METHODOLOGY · 기회비용 산정 방식 비교</div>
        <h2>모험자본 취득에 따른 기회비용, 어떤 산정 방식이 있고 무엇이 가장 적절할까?</h2>
        <p>단순 명목 금리차부터 부도손실(EL), 신NCR 자기자본 구속비용(RAROC), 수신 1조 패키지 한계이익까지 4가지 산정 렌즈를 전환하며 비교해 보세요.</p>
      </div>
      <span class="badge green">KOFIA ${vc.observedYieldDate} · 별표 5 반영</span>
    </div>
    <div class="lens-toolbar">
      <div class="lens-switch" role="group" aria-label="기회비용 산정 방식 선택">
        ${vc.opportunityCostLenses.map(l => `<button type="button" class="lens-btn ${explorerState.vcLens === l.id ? 'active' : ''}" data-vc-lens="${l.id}">${l.badge.replace(' · 현행 기본식', '').replace(' · 여신심사 기준', '').replace(' · 개별자산 최적 표준', '').replace(' · 수신증액 최적 표준', '')} · ${l.id === 'nominal' ? '명목 금리차' : l.id === 'el_adjusted' ? '신용손실(EL) 조정' : l.id === 'raroc_eva' ? '자본조정 RAROC' : '수신 1조 패키지'}</button>`).join('')}
      </div>
      <div class="lens-switch" role="group" aria-label="계정 비히클 선택">
        <button type="button" class="lens-btn ${explorerState.vcVehicle === 'note' ? 'active' : ''}" data-vc-vehicle="note">발행어음 계정 (위험액 100%)</button>
        <button type="button" class="lens-btn ${explorerState.vcVehicle === 'ima' ? 'active' : ''}" data-vc-vehicle="ima">IMA 분리계정 (위험액 50% 감경)</button>
      </div>
    </div>
    <div id="vc-lens-content" aria-live="polite">
      ${renderVcLensBody(D)}
    </div>
    ${srcBox(`KOFIA 채권 시가평가 기준수익률(${vc.observedYieldDate}) · 금융투자업규정 시행세칙 별표 5(신용위험값 AA급 1.6%~2.4%, A급 4.0%, BBB급 8~12%, 비상장·조합출자 12~20%) · 별표 10(IMA 위험액 50% 반영). 조달원가 ${fmt(vc.fundingCostBasePct)}% 및 목표 자기자본비용(CoE) ${fmt(vc.targetCoePct, 1)}%는 방법론 비교용 기준 가정이며 회사별 내부 허들레이트에 따라 달라집니다.`)}
  </section>

  <section class="panel" id="vc-preemptive-strategy">
    <div class="panel-head">
      <div>
        <div class="eyebrow">COMPETITIVE STRATEGY · 선제적 확보를 통한 경쟁자 견제 타당성</div>
        <h2>단기 기회비용을 감수하고 모험자본을 선점해 경쟁자를 견제하는 전략은 타당한가?</h2>
        <p>산업조직론의 ‘경쟁자 한계비용 인상(Raising Rivals' Costs)’ 관점에서 <b>유통시장 단순 물량 매점</b>과 <b>상위 GP·발행원천 생태계 선점</b>의 성패가 정반대로 갈립니다.</p>
      </div>
      <span class="badge amber">전략 타당성 진단</span>
    </div>
    <div class="grid2" id="vc-strategy-cards">
      ${vc.preemptiveStrategies.map((s, idx) => `<div class="strategy-card ${s.valid ? 'valid' : 'invalid'} ${explorerState.vcStrategyIdx === idx ? 'focused' : ''}" data-vc-strat="${idx}" tabindex="0" role="button" aria-pressed="${explorerState.vcStrategyIdx === idx}">
        <div class="panel-head" style="margin-bottom:10px">
          <h3>${s.valid ? '✅ ' : '❌ '}${s.type}</h3>
          <span class="badge ${s.valid ? 'green' : 'red'}">${s.verdictBadge}</span>
        </div>
        <p class="muted" style="margin-bottom:12px">${s.summary}</p>
        <ul class="mech-list">
          ${s.mechanisms.map(m => `<li>${m}</li>`).join('')}
        </ul>
      </div>`).join('')}
    </div>
    ${srcBox('중견·A급 30% 인정 상한(금융위 2025.04.09) 및 발행어음·IMA 위험액 산정 규정(별표 10)에 기반한 경제학적 전략 분석입니다.')}
  </section>

  <section class="panel" id="vc-addressable-market" style="scroll-margin-top:95px">
    <div class="panel-head">
      <div>
        <div class="eyebrow">ADDRESSABLE MARKET SIZE · 모험자본 수급 병목과 향후 잠재 시장규모</div>
        <h2>모험자본은 앞으로도 계속 부족할까? 인정 자산군별 현재 규모 vs 잠재 시장규모</h2>
        <p>유통시장 공모채·P-CBO만 보면 만성 부족이지만, VC·신기사 조합과 직접 사모신용(Private Credit)까지 넓히면 핵심은 ‘물량 부재’가 아니라 ‘오리지네이션 역량 격차’입니다.</p>
      </div>
      <div class="lens-switch" role="group" aria-label="인정 자산군 필터">
        <button type="button" class="lens-btn ${explorerState.vcPoolFilter === 'all' ? 'active' : ''}" data-pool-filter="all">전체 7대 인정 자산군</button>
        <button type="button" class="lens-btn ${explorerState.vcPoolFilter === 'market' ? 'active' : ''}" data-pool-filter="market">시장형 유통채권 (4)</button>
        <button type="button" class="lens-btn ${explorerState.vcPoolFilter === 'origination' ? 'active' : ''}" data-pool-filter="origination">조합 · 직접 사모신용 (3)</button>
      </div>
    </div>
    <div class="grid3" style="margin-bottom:18px">
      ${vc.addressableMarket.demandSchedule.map((d, i) => `<div class="metric ${i === 1 ? 'metric-highlight' : ''}">
        <small>${d.period}</small>
        <strong style="font-size:25px">${fmt(d.totalMandateTril, 1)} <small>조 원</small></strong>
        <p class="muted">${d.nonACapNetTril ? `A급 30%캡(${fmt(d.aCapTril)}조) 제외 <b>비A급 순수요 ${fmt(d.nonACapNetTril)}조</b>` : d.note}</p>
      </div>`).join('')}
    </div>
    <div class="table-wrap" id="vc-pool-table-wrap">
      ${renderVcPoolTable(D)}
    </div>
    <div class="callout" style="margin-bottom:0">
      <b>잠재 시장규모 종합 결론</b> · ${vc.addressableMarket.verdictSummary}
    </div>
    ${srcBox('금융위원회 종투사 운용규제 개편안(2025.04.09, 24.09 모험자본 12.8조) · 금융감독원 기업의 직접금융 조달실적(2025년 일반회사채 52.69조 중 A등급 13.46조·BBB이하 2.00조) · 중소벤처기업부 벤처투자·펀드결성 동향(2025년 14.3조) · 한국예탁결제원 메자닌 통계 · FISIS 일반은행 중소기업대출(202606 4대 은행 559.6조). 각 자산군을 클릭하면 세부 병목 해설이 펼쳐집니다.')}
  </section>`;
}

function renderVcLensBody(D) {
  const vc = D.ventureCapitalChain2027;
  const lens = vc.opportunityCostLenses.find(l => l.id === explorerState.vcLens) || vc.opportunityCostLenses[2];
  const isIma = explorerState.vcVehicle === 'ima';
  const rows = vc.assetRarocBenchmarks;
  const baseRow = rows[0];

  const headerCards = `<div class="grid3" style="margin:14px 0 18px">
    <div class="sub-lens-card">
      <span class="badge green">${lens.badge}</span>
      <h3 style="margin-top:8px">${lens.title}</h3>
      <code class="formula-pill">${lens.formula}</code>
    </div>
    <div class="sub-lens-card">
      <small class="muted">적합한 활용 목적</small>
      <p style="margin-top:6px;font-size:12px">${lens.bestFor}</p>
      <div style="margin-top:8px"><span class="badge blue">${lens.verdict}</span></div>
    </div>
    <div class="sub-lens-card warn">
      <small class="muted">단독 적용 시 왜곡 · 한계점</small>
      <p style="margin-top:6px;font-size:12px">${lens.distortion}</p>
    </div>
  </div>`;

  if (lens.id === 'bundled_pkg') {
    const is28 = explorerState.vcPkgYear === '2028';
    const wNorm = is28 ? 0.75 : 0.80;
    const wACap = is28 ? 0.075 : 0.06;
    const wNonA = is28 ? 0.175 : 0.14;

    const evaNorm = isIma ? baseRow.evaImaBp : baseRow.evaNoteBp;
    const evaACap = isIma ? rows[1].evaImaBp : rows[1].evaNoteBp;
    const evaBbbGood = isIma ? rows[3].evaImaBp : rows[3].evaNoteBp;
    const evaVcTop = isIma ? rows[4].evaImaBp : rows[4].evaNoteBp;
    const evaStress = isIma ? -95 : -150;

    const pkgGood = wNorm * evaNorm + wACap * evaACap + wNonA * ((evaBbbGood + evaVcTop) / 2);
    const pkgPcbo = wNorm * evaNorm + wACap * evaACap + wNonA * (isIma ? rows[2].evaImaBp : rows[2].evaNoteBp);
    const pkgStress = wNorm * evaNorm + wACap * evaACap + wNonA * evaStress;
    const shadowTaxGood = evaNorm - pkgGood;
    const shadowTaxStress = evaNorm - pkgStress;

    return `${headerCards}
      <div class="control-row" style="margin:6px 0 14px">
        <span style="font-size:12px;font-weight:600">의무비율 연도 선택:</span>
        <button type="button" class="chip ${!is28 ? 'active' : ''}" data-vc-pkgyear="2027">2027년 의무 20% (정상 80% + A급캡 6% + 비A급 14%)</button>
        <button type="button" class="chip ${is28 ? 'active' : ''}" data-vc-pkgyear="2028">2028년 의무 25% (정상 75% + A급캡 7.5% + 비A급 17.5%)</button>
      </div>
      <div class="grid3">
        <div class="metric">
          <small>시나리오 A · 우량 비A급(BBB·VC 혼합) 선별 시</small>
          <strong style="color:var(--teal)">+${fmt(pkgGood, 1)} <small>bp (연 +${fmt(pkgGood, 1)}억/조)</small></strong>
          <p class="muted">무규제(${evaNorm}bp) 대비 <b>규제 그림자 조세 −${fmt(shadowTaxGood, 1)}bp</b></p>
        </div>
        <div class="metric">
          <small>시나리오 B · 비A급 전액 무수익 P-CBO 충당 시</small>
          <strong>+${fmt(pkgPcbo, 1)} <small>bp (연 +${fmt(pkgPcbo, 1)}억/조)</small></strong>
          <p class="muted">무규제 대비 <b>규제 그림자 조세 −${fmt(evaNorm - pkgPcbo, 1)}bp</b></p>
        </div>
        <div class="metric">
          <small>시나리오 C · 비A급 심사 부진(역마진 ${evaStress}bp) 시</small>
          <strong style="color:#c26d27">+${fmt(pkgStress, 1)} <small>bp (연 +${fmt(pkgStress, 1)}억/조)</small></strong>
          <p class="muted">무규제 대비 <b>규제 그림자 조세 −${fmt(shadowTaxStress, 1)}bp</b> · 특판 조달 시 역마진 전환</p>
        </div>
      </div>
      <div class="callout" style="margin-bottom:0">
        <b>의사결정 핵심 함의 (${isIma ? 'IMA 분리계정 위험액 50%' : '발행어음 계정 위험액 100%'} 기준)</b> · 수신 1조 원을 늘릴 때 비A급 모험자본 자체 마진이 낮더라도 75~80%의 정상 기업금융 이익이 결합되므로 패키지 한계이익은 여전히 양수(+${fmt(pkgStress, 0)}~+${fmt(pkgGood, 0)}억 원/조)입니다. 단, 모험자본 의무가 수신 전체 마진을 <b>약 ${fmt(shadowTaxGood, 0)}~${fmt(shadowTaxStress, 0)}bp 깎아먹는 ‘규제 세금’</b>으로 작동하므로, 평시 대비 +40~60bp를 더 주는 무분별한 고금리 1년물 특판 조달은 순한계이익을 소멸시킵니다.
      </div>`;
  }

  return `${headerCards}
    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th scope="col">비교 자산군 (${vc.observedYieldDate} 기준)</th>
            <th scope="col">인정 한도</th>
            <th scope="col">대표 수익률</th>
            <th scope="col">조달차감 명목마진</th>
            <th scope="col">신용손실+원가</th>
            <th scope="col">${isIma ? 'IMA 자본비용 (RW 50%)' : '어음 자본비용 (RW 100%)'}</th>
            <th scope="col">선택 렌즈 순기여</th>
            <th scope="col">정상 IB 대비 기회비용</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((r, idx) => {
            const capCost = isIma ? r.capCostImaBp : r.capCostNoteBp;
            const netSelected = lens.id === 'nominal'
              ? r.grossSpreadBp
              : lens.id === 'el_adjusted'
                ? (r.grossSpreadBp - r.elCostBp)
                : (isIma ? r.evaImaBp : r.evaNoteBp);
            const baseSelected = lens.id === 'nominal'
              ? baseRow.grossSpreadBp
              : lens.id === 'el_adjusted'
                ? (baseRow.grossSpreadBp - baseRow.elCostBp)
                : (isIma ? baseRow.evaImaBp : baseRow.evaNoteBp);
            const oc = idx === 0 ? 0 : (baseSelected - netSelected);
            const illusion = lens.id === 'nominal' && oc < 0;

            return `<tr class="${idx === 1 ? 'selected' : ''}">
              <td title="${r.note}"><b>${r.asset}</b><br><small class="muted">${r.note}</small></td>
              <td><span class="badge ${idx === 1 ? 'amber' : idx === 0 ? '' : 'green'}">${r.capTag}</span></td>
              <td>${fmt(r.yieldPct)}%</td>
              <td>+${r.grossSpreadBp}bp</td>
              <td>${lens.id === 'nominal' ? '<span class="muted">미차감</span>' : `−${r.elCostBp}bp`}</td>
              <td>${lens.id === 'raroc_eva' ? `−${capCost}bp (RW ${r.ncrRwPct}%)` : '<span class="muted">미차감</span>'}</td>
              <td><b>${netSelected >= 0 ? '+' : ''}${netSelected}bp</b></td>
              <td>
                ${idx === 0
                  ? '<span class="muted">기준점 (0bp)</span>'
                  : illusion
                    ? `<b style="color:var(--red)">${oc}bp</b> <span class="badge red">명목착시!</span>`
                    : `<b style="color:${oc <= 15 ? 'var(--teal)' : '#192e3d'}">${oc > 0 ? '+' : ''}${oc}bp</b>${idx === 1 && lens.id === 'raroc_eva' ? ' <span class="badge green">최우선 소진</span>' : ''}`}
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
}

function renderVcPoolTable(D) {
  const pools = D.ventureCapitalChain2027.addressableMarket.pools.filter(p =>
    explorerState.vcPoolFilter === 'all' || p.group === explorerState.vcPoolFilter
  );

  return `<table class="data-table drill-table">
    <thead>
      <tr>
        <th scope="col">인정 모험자본 자산군 (클릭 시 세부 진단)</th>
        <th scope="col">규제 인정 한도</th>
        <th scope="col">현재 발행 · 잔액 규모</th>
        <th scope="col">종투사 실질 흡수 가능 풀</th>
        <th scope="col">2027~2028 잠재 시장규모</th>
        <th scope="col">수급 진단</th>
      </tr>
    </thead>
    <tbody>
      ${pools.map(p => {
        const open = explorerState.expandedPoolId === p.id;
        return `<tr class="drill-summary-row ${open ? 'selected' : ''}" data-pool-row="${p.id}" tabindex="0" role="button" aria-expanded="${open}">
          <td><span class="drill-chevron">${open ? '▾' : '▸'}</span> <b>${p.name}</b></td>
          <td>${p.capRule}</td>
          <td style="text-align:left">${p.currentScale}</td>
          <td style="text-align:left"><b>${p.ibAbsorbable}</b></td>
          <td style="text-align:left;color:var(--teal);font-weight:600">${p.potential2728}</td>
          <td><span class="badge ${p.statusTone}">${p.status}</span></td>
        </tr>${open ? `<tr class="drill-detail-row"><td colspan="6"><div class="pool-detail-box"><b>세부 수급 병목 및 전략 시사점</b> · ${p.detail}</div></td></tr>` : ''}`;
      }).join('')}
    </tbody>
  </table>`;
}

export function bindVentureDeepDive(D) {
  const labRoot = document.getElementById('vc-raroc-lab');
  if (!labRoot) return;

  const refreshLens = () => {
    document.getElementById('vc-lens-content').innerHTML = renderVcLensBody(D);
    labRoot.querySelectorAll('[data-vc-pkgyear]').forEach(btn => {
      btn.addEventListener('click', () => {
        explorerState.vcPkgYear = btn.dataset.vcPkgyear;
        refreshLens();
      });
    });
  };

  labRoot.querySelectorAll('[data-vc-lens]').forEach(btn => {
    btn.addEventListener('click', () => {
      explorerState.vcLens = btn.dataset.vcLens;
      labRoot.querySelectorAll('[data-vc-lens]').forEach(x => x.classList.toggle('active', x === btn));
      refreshLens();
    });
  });

  labRoot.querySelectorAll('[data-vc-vehicle]').forEach(btn => {
    btn.addEventListener('click', () => {
      explorerState.vcVehicle = btn.dataset.vcVehicle;
      labRoot.querySelectorAll('[data-vc-vehicle]').forEach(x => x.classList.toggle('active', x === btn));
      refreshLens();
    });
  });

  refreshLens();

  document.querySelectorAll('[data-vc-strat]').forEach(card => {
    const activate = () => {
      explorerState.vcStrategyIdx = Number(card.dataset.vcStrat);
      document.querySelectorAll('[data-vc-strat]').forEach((el, idx) => {
        el.classList.toggle('focused', idx === explorerState.vcStrategyIdx);
        el.setAttribute('aria-pressed', String(idx === explorerState.vcStrategyIdx));
      });
    };
    card.addEventListener('click', activate);
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        activate();
      }
    });
  });

  const marketRoot = document.getElementById('vc-addressable-market');
  const poolWrap = document.getElementById('vc-pool-table-wrap');
  const bindPoolRows = () => {
    poolWrap.querySelectorAll('[data-pool-row]').forEach(row => {
      const toggle = () => {
        const id = row.dataset.poolRow;
        explorerState.expandedPoolId = explorerState.expandedPoolId === id ? '' : id;
        poolWrap.innerHTML = renderVcPoolTable(D);
        bindPoolRows();
      };
      row.addEventListener('click', toggle);
      row.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggle();
        }
      });
    });
  };

  if (marketRoot && poolWrap) {
    marketRoot.querySelectorAll('[data-pool-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        explorerState.vcPoolFilter = btn.dataset.poolFilter;
        marketRoot.querySelectorAll('[data-pool-filter]').forEach(x => x.classList.toggle('active', x === btn));
        poolWrap.innerHTML = renderVcPoolTable(D);
        bindPoolRows();
      });
    });
    bindPoolRows();
  }
}
