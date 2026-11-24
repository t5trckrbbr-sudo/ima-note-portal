import {computeNim} from './nim.js';

const number = (value, digits) => Number(value).toLocaleString('ko-KR', {
  minimumFractionDigits: digits,
  maximumFractionDigits: digits
});

function figure(title, basis, content, url, link) {
  return `<figure class="qa-visual">
    <figcaption><strong>${title}</strong><span>${basis}</span></figcaption>
    ${content}
    <a class="qa-visual-link" href="${url}">${link} →</a>
  </figure>`;
}

function bars(rows, {unit, digits = 0, signed = false, maximum} = {}) {
  const scale = maximum ?? Math.max(1, ...rows.map(([, value]) => Math.abs(value)));
  return `<ul class="qa-visual-bars${signed ? ' is-signed' : ''}">
    ${rows.map(([label, value, accent = 'note']) => {
      const width = Math.abs(value) / scale * (signed ? 50 : 100);
      const prefix = value < 0 ? '−' : signed && value > 0 ? '+' : '';
      const side = value < 0 ? ' is-negative' : '';
      return `<li>
        <span>${label}</span><b>${prefix}${number(Math.abs(value), digits)}${unit}</b>
        <span class="qa-visual-track" aria-hidden="true"><i class="qa-visual-fill is-${accent}${side}" style="width:${width}%"></i></span>
      </li>`;
    }).join('')}
  </ul>`;
}

function fundingScale(D) {
  const k = D.globalKpis;
  const rows = [
    ['2026.3Q 확정', k.promNote26Q3ExactTril, k.ima26Q3ExactTril],
    ['2027년 말 전망', k.promNote27EstTril, k.ima27EstTril]
  ];
  const maximum = Math.max(...rows.map(([, note, ima]) => note + ima));
  return figure('발행어음·IMA 합산 잔액', 'OpenDART 2026.3Q 확정과 2027년 말 전망 · 조 원', `
    <ul class="qa-visual-bars">
      ${rows.map(([label, note, ima]) => `<li>
        <span>${label}</span><b>${number(note + ima, 2)}조</b>
        <span class="qa-visual-track qa-visual-stacked" aria-hidden="true">
          <i class="qa-visual-fill is-note" style="width:${note / maximum * 100}%"></i>
          <i class="qa-visual-fill is-ima" style="width:${ima / maximum * 100}%"></i>
        </span>
        <span class="qa-visual-breakdown"><span>발행어음 ${number(note, 2)}조</span><span>IMA ${number(ima, 2)}조</span></span>
      </li>`).join('')}
    </ul>`, '#funding', '수신 전망과 회사별 내역 보기');
}

export function renderQaVisual(id, D) {
  if (!D) return '';
  switch (id) {
    case 'guide-product-difference':
      return figure('발행어음과 IMA의 조달 구조', '자본시장법 시행령 제77조의6 · 기본 한도', `
        <div class="qa-visual-products">
          <div><b>발행어음</b><strong>자기자본의 200% 이내</strong><span>최대 1년, 약정금리</span></div>
          <div><b>IMA</b><strong>발행어음과 합산 300% 이내</strong><span>실적배당, 만기 보유 시 원금지급 약정</span></div>
        </div>`, '#regulations', '규정모음집에서 세부 조건 보기');
    case 'guide-growth-baseline':
      return fundingScale(D);
    case 'guide-nim-income': {
      const {totals} = computeNim(D);
      return figure(`기본 가정의 연간 수익 기여 ${number(totals.total, 0)}억 원`, '2027년 전망 · 발행어음 NIM 150bp · IMA 수익 기여율 120bp',
        bars([['발행어음 순이자수익', totals.noteIncome], ['IMA 수익 기여', totals.imaIncome, 'ima']], {unit:'억 원'}),
        '#funding', '회사별 NIM 계산기 보기');
    }
    case 'guide-yield-curve-short-funding': {
      const maturity = D.shortYieldCurveAndMaturity.maturityBuckets26Q1;
      const labels = ['1개월 이하', '1~3개월', '3~6개월', '6개월~1년'];
      return figure(`3개월 이하 조달이 ${number(maturity.under3mSharePct, 1)}%`, '2026년 3월 말 업권 발행어음 잔액 · 합계는 반올림 전 금액 기준',
        bars(maturity.buckets.map((row, i) => [labels[i], row.sharePct, i < 2 ? 'note' : 'muted']), {unit:'%',digits:1,maximum:100}),
        '#funding', '만기 구간과 조달금리 보기');
    }
    case 'guide-ima-maturity': {
      const tranches = D.imaTranchesKis;
      const total = tranches.reduce((sum, row) => sum + row.amountTril, 0);
      return figure(`한국투자 초기 IMA 1~4호 · 만기 ${number(total, 2)}조 원`, '회차별 만기 도래액 · 2027년 12월~2028년 4월',
        bars(tranches.map(row => [`${row.maturity.replace('-', '.')} · ${row.tranche}`, row.amountTril, 'ima']), {unit:'조',digits:2}),
        '#ima-maturity', '만기 타임라인과 회차별 조건 보기');
    }
    case 'guide-2027-funding-outlook-bear-flattening': {
      const [, q2, current] = D.fundingOutlook2027BearFlattening.bearFlatteningRegimes;
      return figure('국고채 3년물과 1년물의 금리차 축소', '2026년 2분기 평균과 11월 13일 관측치 비교',
        bars([['2026.2Q 평균', q2.ktbSpreadBp], ['2026.11.13', current.ktbSpreadBp]], {unit:'bp',digits:1}),
        '#funding', '베어 플랫 전망과 대응 전략 보기');
    }
    case 'guide-mirae-note-growth': {
      const {periodLabel, balancesKrwThousands} = D.promNoteExpansionComparison;
      const delta = (firm, instrument) => {
        const {start,end} = balancesKrwThousands[firm][instrument];
        return (end - start) / 1e9;
      };
      return figure('발행어음과 RP를 얼마나 늘렸을까?', `${periodLabel} · 양사 별도 공시 잔액 증감`,
        bars([
          ['한국투자 · 발행어음', delta('kis','promNote')],
          ['미래에셋 · 발행어음', delta('mirae','promNote'), 'ima'],
          ['한국투자 · RP', delta('kis','rp')],
          ['미래에셋 · RP', delta('mirae','rp'), 'ima']
        ], {unit:'조',digits:2,signed:true}),
        '#kis-mirae', '두 회사의 조달 확대 비교 보기');
    }
    case 'guide-kis-mirae-comparison': {
      const {kis,mirae} = D.kisVsMiraeComparison.nimLedgerSf321Eok['2025_FY'];
      return figure('전사 순이자손익에서 리테일 신용이자를 뺀 잔여액', '2025년 연간 · FISIS SF321 전사 계정',
        bars([['한국투자증권', kis.netIntExRetail], ['미래에셋증권', mirae.netIntExRetail, 'ima']], {unit:'억 원',signed:true}),
        '#kis-mirae', '이자손익 원장과 산식 보기');
    }
    case 'guide-sizing-growth': {
      const demand = D.ventureCapitalChain2027.addressableMarket.demandSchedule[1];
      return figure(`2027년 모험자본 필요액 ${number(demand.totalMandateTril, 1)}조 원`, `수신 전망 ${number(demand.totalFundingTril, 0)}조 원 × 의무비율 ${demand.mandatePct}%`,
        bars([['중견·A급 최대', demand.aCapTril, 'muted'], ['그 외 인정자산 최소', demand.nonACapNetTril]], {unit:'조',digits:2,maximum:demand.totalMandateTril}),
        '#invest', '인정자산별 시장규모와 기회비용 보기');
    }
    default:
      return '';
  }
}
