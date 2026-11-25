import { calcCost, getOpportunityCostDefaults } from './curiosity.js';
import { computeNim, getNimScenario } from './nim.js';
import { getImaNcrScenario } from './ima-ncr.js';
const fmt = (n, d = 2) => Number(n).toLocaleString('ko-KR', { minimumFractionDigits: d, maximumFractionDigits: d });

const QA_DIGEST = {
  'guide-2027-funding-outlook-bear-flattening': {
    title: '2027년 수신환경(3대 악화 vs 3대 강화)과 ‘베어 플랫’ 종합 전망·대응 전략은?',
    summary: '89조 원은 2027년 기본 전망입니다. 한국투자증권은 조달 비용과 자산 만기를 맞추고, 단기 조달비용·고객 잔액·적격 투자처가 확인될 때 수신 확대를 검토합니다.'
  },
  'guide-yield-curve-short-funding': {
    title: '발행어음 수익률곡선은 왜 가파르며, 3개월 이하(63.4%)·수시물 비중은 어느 정도인가요?',
    summary: '발행어음 1Y−수시 기울기(+109bp)는 국고·회사채의 약 1.9배입니다. 3개월 이하 비중(63.4%)을 인위적으로 낮추면 조달단가가 +46~66bp 급등하므로 단기 어음과 중장기 폐쇄형 IMA 투트랙 분업이 필수입니다.'
  },
  'guide-demand-note-cash-buffer': {
    title: '발행어음 수시성 수신 10% 현금성자산 보유 의무, 타사·은행권 대비 낮출 논리가 있을까요?',
    summary: '수시물 순수 현금 10%는 법정 일률 규제가 아닌 사내 버퍼입니다(법정은 1·3개월 유동성비율 ≥100%). 소매 CMA 차등화(5~7%)와 국공채(HQLA)·커미티드라인 인정 확대로 역마진을 줄일 수 있습니다.'
  },
  'guide-real-estate-concentration': {
    title: '2027년 부동산 운용 한도 10% 축소와 소규모 IMA 회차의 단일 딜 집중위험은?',
    summary: '부동산 상한 축소(30%→15%→10%)로 기업금융·모험자본 전환 부담이 커지며, 3,000~4,000억 규모 IMA 회차는 단일 딜 부실만으로 5% 고유충당금이 소진될 수 있어 회차당 단일 딜 캡(5~10%)이 필요합니다.'
  },
  'guide-pension-self-product-ban': {
    title: '퇴직연금 ‘자사 상품 편입 제한’이란 무엇이며, 왜 501.4조 연금이 핵심 변수인가요?',
    summary: '퇴직연금감독규정 제9조제3항에 따라 사업자는 자사 원리금보장상품을 편입할 수 없습니다. 원리금보장 378.1조 시장에 어음·IMA 편입이 허용되면 전 업권 교차판매로 대규모 머니무브가 가능합니다.'
  },
  'guide-latest-rate': {
    title: '실제 판매되는 발행어음 금리와 IMA 조건(수익구조·만기·중도해지)은 어떻게 다른가요?',
    summary: '발행어음은 1년 이내 확정 약정금리(이자소득)이며 중도해지 시 원금은 보전됩니다. IMA는 2년 이상 폐쇄형 실적배당(배당소득·초과수익 성과보수 차감)으로 만기 보유 시에만 원금지급 약정이 작동합니다.'
  },
  'guide-pension-eligibility': {
    title: '발행어음과 IMA의 퇴직연금(DC·IRP) 편입 가능 여부는 어디서 확인하나요?',
    summary: '현행 퇴직연금감독규정 제9조 열거 목록에는 아직 미포함 상태이며 규정 개정과 전산 탑재를 확인해야 합니다. 저축은행 연금예금 상한은 2025.09.01 예금자보호 상향에 연동해 기관당 1억 원입니다.'
  },
  'guide-product-difference': {
    title: '발행어음과 IMA는 인가 요건·한도·신NCR 위험액에서 어떤 점이 다른가요?',
    summary: '발행어음은 자본 4조 이상·한도 200%·신NCR 위험액 100% 반영인 반면, IMA는 자본 8조 이상·어음 합산 300%·기업금융 70% 의무·5% 고유충당금 조건 하 위험액 50% 감경이 적용됩니다.'
  },
  'guide-principal-protection': {
    title: 'IMA의 원금지급 약정은 예금자보호(1억 원)와 같은 뜻인가요?',
    summary: '예금보험공사 공적 보호 대상이 아니며 오직 발행 종투사(AA급) 자체 신용에 의존합니다. 또한 만기 보유 시에만 원금지급 의무가 성립하며 중도해지 시에는 평가손실·수수료로 원금 손실이 가능합니다.'
  },
  'guide-nim-income': {
    title: 'NIM과 순이자수익, 전사 순영업수익은 어떻게 구분해 읽어야 하나요?',
    summary: '기본 합산 12,600억 원은 판관비·충당금 차감 전 상품 단위 수익 시나리오입니다. 삼성과 메리츠에는 각각 평잔 2조 원, 다른 회사에는 연말 잔액 대용치를 적용합니다.'
  },
  'guide-growth-baseline': {
    title: '2027년 수신 전망은 왜 89조로 바뀌었고, 기준선에 따라 증가율이 다른가요?',
    summary: '삼성·메리츠 각사에 연말 4조 원을 적용해 합산 89조 원으로 전망합니다. 기본 기준선은 2026.3Q OpenDART 61.33조 원입니다.'
  },
  'guide-pcbo-assumption': {
    title: '기회비용 계산기의 비교 스프레드 96.3bp는 어떻게 산출하나요?',
    summary: 'AAA 은행채 3년 4.113%(2026.11.13)에서 조달원가 3.15%를 뺀 96.3bp를 비교용으로 씁니다. 정상 기업금융 가정 150bp와의 차이는 53.7bp입니다.'
  },
  'guide-ima-old-ncr-capital': {
    title: 'IMA의 5% 충당금 차감을 고려해도 위험액 50% 감경은 구NCR에 유리한가요?',
    summary: '구NCR에서도 위험액 50% 감경을 반영하고 5% 영업용순자본 감소 부담을 함께 비교합니다. E=8조·R=4조·신규 A=1조의 보수적 예시에서는 위험률 약 5.06%부터 IMA 비율이 더 높습니다. 분기점은 회사의 기존 자본·위험액과 신규 규모에 따라 달라집니다.'
  },
  'guide-ima-maturity': {
    title: '2027.12~2028.04 IMA 만기 집중(2.60조)은 전체 시장을 뜻하나요?',
    summary: '전체 IMA 시장이 아닌 1호 사업자 한국투자증권의 초기 1~4호(총 2.60조, 1호 1.10조가 2027.12 도래) 설정분입니다. 폐쇄형 만기 일시 상환·차환 구조이므로 기초자산 현금회수 일정 대조가 중요합니다.'
  },
  'guide-mirae-note-growth': {
    title: '미래에셋증권은 왜 발행어음 확대에 상대적으로 신중한가요?',
    summary: '미래에셋은 단기자금을 RP로, 장기자금을 회사채로 조달해 온 기반이 있습니다. 기존 거래망과 차환 구조를 활용할 수 있어 발행어음 한도를 한투만큼 채울 유인이 작았던 것으로 보입니다.'
  },
  'guide-kis-mirae-comparison': {
    title: '한국투자와 미래에셋의 순이자 차이(+5,299억 vs −1,405억)가 어음 수익성을 입증하나요?',
    summary: '단일 상품 마진이 아닌 자산배분 전략 차이입니다. 한투는 IB 기업여신 이자캐리에 집중한 반면, 미래에셋은 차입이자는 SF321에 잡히고 수익은 해외출자·지분·배당(비이자 계정)으로 회수하는 구조입니다.'
  },
  'guide-account-separation': {
    title: '전사 차입부채(472.75조), 발행어음(55.94조), 고객예수금(158.50조)은 왜 분리하나요?',
    summary: '고객예수금(SF324, 158.50조)은 자본시장법 제74조상 증권금융에 별도 예치되어 기업금융 운용에 전용할 수 없습니다. 472.65조 재합산과 472.75조 총계의 0.10조 차이는 FISIS 원단위 반올림 단수차입니다.'
  },
  'guide-sizing-growth': {
    title: '모험자본 조달 병목과 자본효율: 2027년 수신을 어디까지 늘려야 하나요(Q*)?',
    summary: '2027년 수신 89조 가정의 모험자본 의무는 17.8조 원입니다. 중견·A급을 상한까지 채워도 다른 인정자산이 12.46조 원 필요합니다. VC·신기사 소싱과 함께 성장기업에 신규 자금을 공급하는 인정자산의 확대를 건의할 필요가 있습니다.'
  }
};

function makeQaItems(ids) {
  return (ids || []).map(id => QA_DIGEST[id] ? { id, ...QA_DIGEST[id] } : null).filter(Boolean);
}

export function resolveXraySpec(specKey, D, context = {}) {
  if (!specKey || !D) return null;
  const [kind, ...rest] = String(specKey).split(':');
  const id = rest.join(':');
  const g = D.globalKpis || {};
  const hw = D.householdWealthAndIntl2026;
  const sc = D.shortYieldCurveAndMaturity;
  const bf = D.fundingOutlook2027BearFlattening;
  const vc = D.ventureCapitalChain2027;
  const marketCostRow = D.opportunityCost2027?.find(row => row.key === 'all');
  const costDefaults = getOpportunityCostDefaults(D);
  const baseGapBp = fmt(costDefaults.spread - costDefaults.pcbo, 1);
  const marketCost = marketCostRow ? calcCost(marketCostRow, costDefaults) : null;

  if (specKey === 'ima-old-ncr') {
    const n = context.ncrScenario || getImaNcrScenario();
    return {
      eyebrow: 'OLD NCR · 분자와 분모를 함께 비교',
      title: '5% 영업용순자본 감소와 위험액 50% 감경의 순효과',
      badge: '보수적 가정 · 조건부 비교',
      formula: '어음 E/(R+A×r) · IMA (E−0.05×A)/(R+0.5×A×r) · r*=0.05×R/(0.5×E−0.05×A)',
      rows: n.valid ? [
        ['현재 입력값 · 설명용', `E ${fmt(n.capital)}조 / R ${fmt(n.existingRisk)}조 / A ${fmt(n.amount)}조 / 취득 자산 위험률 ${fmt(n.riskPct,1)}%`],
        ['분자 감소 가정', `${fmt(n.reserve*10000,0)}억 원 (신규 운용액의 5% 전액 감소 가정)`],
        ['위험액 절감 가정', `${fmt(n.riskSaved*10000,0)}억 원 (감경 자격·자기자본 한도 내 신규액 가정)`],
        ['구NCR 비교 · 위험액 감경 반영', `어음 ${fmt(n.notePct)}% / IMA ${fmt(n.imaPct)}% · 차이 ${fmt(n.differencePp)}%p`],
        ['두 곡선의 교차 위험률', n.amount===0?'신규 운용액 0 · 두 방식 동일':n.crossingPct===null?'양의 교차점 없음':`${fmt(n.crossingPct,3)}% · 회사의 자본·위험액·신규 규모에 따라 달라짐`]
      ] : [['입력 확인', n.error]],
      source: '<a href="https://www.fsc.go.kr/no010101/84322" target="_blank" rel="noopener noreferrer">금융위 2025.04.09 제도 설명 · 영업용순자본비율 산출 시 IMA 운용자산 50% 반영</a> · <a href="https://www.law.go.kr/LSW/admRulLsInfoR.do?admRulSeq=2100000285020" target="_blank" rel="noopener noreferrer">금융투자업규정 제3-6조·제3-24조의4④·제4-99조</a> · <a href="https://www.law.go.kr/LSW/flDownload.do?flSeq=166876081" target="_blank" rel="noopener noreferrer">시행세칙 제3-20조의6, 9쪽</a>',
      caveat: '구NCR에서도 위험액 50% 감경을 반영하는 비교입니다. 손실충당금과 손실준비금의 회계처리는 다르며 5% 전액 감소는 보수적 가정입니다. 이미 차감한 금액이나 별도 시딩 부담을 중복 차감하지 않습니다. 자기자본 100% 초과 수탁금 원본의 감경 제외와 연결 E/R 150% 초과 등 요건, 폐쇄형 IMA의 유지 예외는 별도로 확인합니다. E는 영업용순자본으로 자기자본과 다릅니다.',
      qas: makeQaItems(['guide-ima-old-ncr-capital','guide-ima-maturity']),
      actions: [
        {label:'위험률별 그래프로 돌아가기 →',tab:'ima-maturity',scrollTo:'ima-old-ncr-panel',primary:true},
        {label:'관련 질문·답변 전문 →',qa:'guide-ima-old-ncr-capital'}
      ]
    };
  }

  if (kind === 'firm' || kind === 'nim-firm') {
    const chain = (D.ib9FirmsCuriosityChain || []).find(x => x.key === id || x.firm === id);
    if (!chain) return null;
    const fRow = D.ib9FirmsFunding202606[chain.fundingIdx];
    const opp = (D.opportunityCost2027 || []).find(x => x.key === (chain.costKey || chain.key));
    const p = chain.profitability || {};
    const er = fRow?.effRates26H1 || {};
    const base26 = (chain.base26Q3NoteTril ?? chain.base26Q2NoteTril) + (chain.base26Q3ImaTril ?? chain.base26Q2ImaTril);
    const estNote = chain.est27ModelNoteTril;
    const est27 = estNote + chain.est27ModelImaTril;
    const increase = est27 - base26;
    const scenario = context.nimScenario || getNimScenario(D);
    const nimRow = scenario.rows.find(row => row.key === chain.key);
    if (!nimRow) return null;
    const periodLabel = scenario.period === '2026' ? '2026.3Q 확정 잔액' : '2027E';
    const incomeBasisLabel = nimRow.noteIncomeBasis === 'average-target' ? '메리츠 IR 평잔 목표 적용' : nimRow.noteIncomeBasis === 'average-assumption' ? '삼성 대시보드 가정 평잔' : nimRow.noteIncomeBasis === 'snapshot-proxy' ? '2026.3Q 잔액의 평잔 대용치' : '연말 잔액 대용치';
    const cost = opp ? calcCost(opp, costDefaults) : null;
    const oppAfterCapEok = cost?.after ?? 0;
    const eqDisplay = chain.equity26Q3Tril ?? fRow.equity;

    return {
      eyebrow: `COMPANY X-RAY · ${fRow.strategyGroup}`,
      title: `${chain.firm} · 수신·조달원가·기회비용·ROE 통합 검증`,
      badge: `${chain.creditRating} · ${chain.statusBadge}`,
      formula: `${periodLabel} 수익시나리오(${fmt(nimRow.total, 0)}억) = 어음 ${fmt(nimRow.noteIncomeBase)}조 × ${fmt(nimRow.noteBp, 0)}bp + IMA ${fmt(nimRow.ima)}조 × ${fmt(nimRow.imaBp, 0)}bp · 2027E 기회비용(상한활용 ${fmt(oppAfterCapEok, 0)}억)`,
      rows: [
        ['인가 비히클 현황', `어음(${chain.noteLicense}) / IMA(${chain.imaLicense})`],
        ['별도 자기자본(\'26.3Q) · 법정한도(200%)', `${fmt(eqDisplay)}조 원 / 어음한도 ${fmt(eqDisplay * 2)}조 원`],
        ['2026.3Q 확정 → 2027E 연말 전망', `${fmt(base26)}조 → ${fmt(est27)}조 (순증 ${increase >= 0 ? '+' : ''}${fmt(increase)}조)`],
        ['선택한 NIM 시나리오 기준', `${periodLabel} · 어음 잔액 ${fmt(nimRow.note)}조 / IMA ${fmt(nimRow.ima)}조`],
        ['NIM 수익 계산용 어음 잔액', `${fmt(nimRow.noteIncomeBase)}조 원 (${incomeBasisLabel})`],
        ['회사별 NIM · IMA 기여율 가정', `어음 ${fmt(nimRow.noteBp, 0)}bp / IMA ${fmt(nimRow.imaBp, 0)}bp`],
        ['시나리오 수익 기여', `어음 ${fmt(nimRow.noteIncome, 0)}억 + IMA ${fmt(nimRow.imaIncome, 0)}억 = 합계 ${fmt(nimRow.total, 0)}억`],
        ['\'26.1H 실효금리 (FISIS: 어음/RP/사채)', `${er.promNote != null ? fmt(er.promNote) + '%' : '26.09 인가'} / ${fmt(er.rp)}% / ${fmt(er.bonds)}%`],
        [`모험자본 추가 의무 · 기회비용 (26.3Q 기본, ${baseGapBp}bp)`, cost ? `신규 ${fmt(cost.delta)}조 × 20% + 기존 ${fmt(cost.base)}조 × 10%p = ${fmt(cost.obligation, 3)}조 · 연 ${fmt(cost.cost, 0)}억 (30% 상한 활용 ${fmt(cost.after, 0)}억)` : '—'],
        ...(chain.key === 'samsung' ? [['26.3Q 첫 발행 & 언론 보도 확인', '26.3Q 0.24조(2,403억) 첫 발행 확정 · 연말 단일 목표 미공개 · \'28년까지 모험자본 5조 공급 발표']] : []),
        ['\'26.3Q 실적 · 연결 NCR (OpenDART)', `${chain.q3_26NetIncEok != null ? `3Q 별도순익 ${fmt(chain.q3_26NetIncEok, 0)}억 · 9M 연결지배 ${fmt(chain.m9_26CfsCtrlNetIncEok, 0)}억` : '—'}${chain.consolNcr26Q3Pct ? ` · 연결 NCR ${fmt(chain.consolNcr26Q3Pct, 1)}%` : ''}`]
      ],
      source: 'OpenDART 2026.3Q 분기보고서(자본·발행어음·IMA·3Q/9M 손익·연결 NCR) 및 FISIS 202606(SF321 실효금리·SF325 전사 조달)',
      caveat: `${chain.growthPremise} 선택한 ${periodLabel} NIM 시나리오(${fmt(nimRow.total, 0)}억)는 계산기의 현재 회사별 마진 가정을 적용한 판관비·충당금 차감 전 추정치입니다. 기회비용(${fmt(oppAfterCapEok, 0)}억)은 신규 증가분과 기존 잔액 의무비율 상승분을 포함한 ${baseGapBp}bp 연환산 시나리오입니다. 이미 NIM에 반영했다면 중복 차감하지 않습니다.`,
      qas: makeQaItems(['guide-nim-income', 'guide-2027-funding-outlook-bear-flattening']),
      actions: [
        { label: `${chain.firm} 9사 조달·ROE 상세 비교 →`, tab: 'ib-funding', firmKey: chain.key, primary: true },
        { label: `${chain.firm} 모험자본 기회비용 계산기 →`, tab: 'invest', firmKey: chain.key },
        { label: '수신 전망 9사 분해표 보기 →', tab: 'funding', scrollTo: 'firm-growth-chain', firmKey: chain.key }
      ]
    };
  }

  if (kind === 'trend') {
    const idx = Number(id);
    const pt = D.promNoteImaTrend?.[idx];
    if (!pt) return null;
    const prev = idx > 0 ? D.promNoteImaTrend[idx - 1] : null;
    const diff = prev ? pt.total - prev.total : null;
    const pct = prev ? ((pt.total / prev.total) - 1) * 100 : null;
    return {
      eyebrow: `MARKET TRAJECTORY · 시계열 포인트 분해`,
      title: `${pt.period} 합산 수신 ${fmt(pt.total)}조 원`,
      badge: `인가 ${pt.firms}개사 체제`,
      formula: `발행어음 ${fmt(pt.promNote)}조 + IMA ${fmt(pt.ima)}조 = 합계 ${fmt(pt.total)}조 원`,
      rows: [
        ['시점 · 참여 인가사 수', `${pt.period} · 발행어음 인가 ${pt.firms}개사`],
        ['발행어음 잔액 / IMA 수탁고', `${fmt(pt.promNote)}조 원 / ${fmt(pt.ima)}조 원`],
        ['직전 시점 대비 증감', prev ? `+${fmt(diff)}조 원 (+${fmt(pct, 1)}%)` : '시계열 기점 (선발 4사 체제 완성)'],
        ['핵심 시장 이벤트', pt.note]
      ],
      source: 'OpenDART 2026.3Q 분기보고서(9대 종투사) · 금감원 FISIS SF325 · 2027E는 메리츠 IR 목표와 삼성 동일 가정을 반영',
      caveat: idx === D.promNoteImaTrend.length - 1
        ? D.fundingForecast2027.assumptionNote
        : '2021~2025년은 연말 잔액이며, 2026.2Q(59.44조)·2026.3Q(61.33조)는 분기보고서 확정 기준입니다.',
      qas: makeQaItems(idx >= 5 ? ['guide-growth-baseline', 'guide-2027-funding-outlook-bear-flattening'] : ['guide-product-difference', 'guide-account-separation']),
      actions: [
        { label: '9사별 2027E 성장 분해표 확인 →', tab: 'funding', scrollTo: 'firm-growth-chain', primary: true },
        { label: '7사 발행어음 법정한도 소진율 →', tab: 'pnl' },
        { label: '초기 IMA 1~4호 만기 타임라인 →', tab: 'ima-maturity' }
      ]
    };
  }

  if (kind === 'hw-q' && hw) {
    const qRow = hw.krQuarterlyFinSeries.find(x => x.period === id);
    if (!qRow) return null;
    const q0 = hw.krQuarterlyFinSeries[0];
    return {
      eyebrow: 'ECOS 281Y002 · 분기별 가계 금융자산 X-RAY',
      title: `${qRow.period} 가계 및 비영리단체(S14) 금융자산 ${fmt(qRow.totalFinTril, 1)}조 원`,
      badge: `자산/부채 ${fmt(qRow.assetLiabRatioX, 2)}배`,
      formula: `금융자산 ${fmt(qRow.totalFinTril, 1)}조 − 금융부채 ${fmt(qRow.finLiabTril, 1)}조 = 순금융자산 ${fmt(qRow.netFinTril, 1)}조`,
      rows: [
        ['① 현금 및 예금 잔액 (비중)', `${fmt(qRow.depositsTril, 1)}조 원 (${fmt(qRow.sharesPct.deposits, 1)}%)`],
        ['② 지분증권 및 투자펀드 (비중)', `${fmt(qRow.equitiesFundsTril, 1)}조 원 (${fmt(qRow.sharesPct.equitiesFunds, 1)}%)`],
        ['③ 보험 및 연금준비금 (비중)', `${fmt(qRow.insPensionTril, 1)}조 원 (${fmt(qRow.sharesPct.insPension, 1)}%)`],
        ['④ 채권 · 파생결합증권 (비중)', `${fmt(qRow.bondsTril, 1)}조 원 (${fmt(qRow.sharesPct.bonds, 1)}%)`],
        ['\'19.4Q 대비 금융자산 누적 순증', `+${fmt(qRow.totalFinTril - q0.totalFinTril, 1)}조 원 (예금비중 ${fmt(qRow.sharesPct.deposits - q0.sharesPct.deposits, 1)}%p)`]
      ],
      source: '한국은행 경제통계시스템 ECOS 281Y002 (자금순환 금융자산·부채 잔액표, S14 가계 및 비영리단체)',
      caveat: '자금순환 통계는 상장주식·펀드의 분기 말 시가평가 변동이 반영되므로, 지분증권 비중 상승에는 신규 자금 유입과 주가 상승 효과가 함께 포함되어 있습니다.',
      qas: makeQaItems(['guide-2027-funding-outlook-bear-flattening', 'guide-pension-self-product-ban']),
      actions: [
        { label: '세부 금융상품·부채 참고 표 보기 ↓', tab: 'household-wealth', scrollTo: 'hw-korea-tree', primary: true },
        { label: '머니무브 수신금리 사다리(#funding) →', tab: 'funding', scrollTo: 'money-move-safety' }
      ]
    };
  }

  if (kind === 'hw-y' && hw) {
    const yRow = hw.krAnnualBalanceSheet.find(x => String(x.year) === String(id));
    if (!yRow) return null;
    return {
      eyebrow: 'ECOS 291Y505 · 국민대차대조표 연간 X-RAY',
      title: `${yRow.year}년 말 한국 가계 총자산 ${fmt(yRow.totalAssetsTril, 1)}조 원`,
      badge: `명목 GDP의 ${fmt(yRow.totalAssetsToGdpX, 2)}배`,
      formula: `비금융(실물) ${fmt(yRow.nonFinAssetsTril, 1)}조 + 금융 ${fmt(yRow.finAssetsTril, 1)}조 = 총자산 ${fmt(yRow.totalAssetsTril, 1)}조`,
      rows: [
        ['명목 GDP (ECOS 200Y113)', `${fmt(yRow.nominalGdpTril, 1)}조 원`],
        ['비금융(실물)자산 [토지 / 건물]', `${fmt(yRow.nonFinAssetsTril, 1)}조 (${fmt(yRow.nonFinShareOfGrossPct, 1)}%) · [토지 ${fmt(yRow.landTril, 1)}조 / 건물 ${fmt(yRow.buildingsTril, 1)}조]`],
        ['금융자산 (총자산 내 비중)', `${fmt(yRow.finAssetsTril, 1)}조 원 (${fmt(yRow.finShareOfGrossPct, 1)}%)`],
        ['금융부채 차감 순자산 (Net Worth)', `${fmt(yRow.netWorthTril, 1)}조 원 (GDP 대비 ${fmt(yRow.netWorthToGdpX, 2)}배)`]
      ],
      source: '한국은행·국가데이터처 국민대차대조표(ECOS 291Y505, 연말 잔액) 및 국민계정 명목 GDP(ECOS 200Y113)',
      caveat: '토지·주택 등 비금융 실물자산이 포함된 가계 총자산은 연 1회(국민대차대조표) 공표되며, 2026년 중 최신 금융자산 흐름은 분기별 자금순환(ECOS 281Y002)으로 연결해 확인합니다.',
      qas: makeQaItems(['guide-2027-funding-outlook-bear-flattening', 'guide-pension-eligibility']),
      actions: [
        { label: '한·미·영·일·중 5개국 GDP 배율 대조 ↓', tab: 'household-wealth', scrollTo: 'hw-intl-5country', primary: true },
        { label: '분기 금융자산 최신 추이 보기 ↑', tab: 'household-wealth', scrollTo: 'hw-timeseries' }
      ]
    };
  }

  if (kind === 'curve' && sc) {
    const c = sc.curves[Number(id)];
    if (!c) return null;
    const noteCurve = sc.curves[0];
    return {
      eyebrow: `SHORT YIELD CURVE · ${sc.observedDate} 관측`,
      title: `${c.label} 단기 수익률곡선 분해`,
      badge: `1Y−3M +${fmt(c.slope1y3mBp, 1)}bp`,
      formula: `1D(${fmt(c.d1)}%) → 3M(${fmt(c.m3)}%) → 6M(${fmt(c.m6)}%) → 1Y(${fmt(c.y1)}%)`,
      rows: [
        ['수시·콜(1D) 금리', `${fmt(c.d1)}% (한은 기준금리 ${fmt(sc.bokBasePct)}%)`],
        ['3개월 / 6개월 수익률', `${fmt(c.m3)}% / ${fmt(c.m6)}%`],
        ['9개월 / 1년 수익률', `${fmt(c.m9)}% / ${fmt(c.y1)}%`],
        ['1Y − 3M 기간 스프레드', `+${fmt(c.slope1y3mBp, 1)}bp (발행어음 평균 +${fmt(noteCurve.slope1y3mBp, 1)}bp)`],
        ['후반부(6M → 1Y) 추가 기울기', `+${fmt((c.y1 - c.m6) * 100, 1)}bp`]
      ],
      source: '금융투자협회(KOFIA) 채권정보센터 최종호가·민평수익률(2026-11-13) 및 인가 증권사 고시금리 평균',
      caveat: '시장성 채권(국고·금융채·회사채)은 6개월 이후 기울기가 완만해지지만, 발행어음은 유동성비율(1·3개월 ≥100%) 분모 제외 혜택과 중도해지 페널티 구조로 1년물까지 가파르게 상승합니다.',
      qas: makeQaItems(['guide-yield-curve-short-funding', 'guide-demand-note-cash-buffer']),
      actions: [
        { label: 'Q&A · 단기 커브 스티프닝 실증 전문 →', qa: 'guide-yield-curve-short-funding', primary: true },
        { label: 'IMA 만기 매칭 구조 비교 →', tab: 'ima-maturity' }
      ]
    };
  }

  if (kind === 'reg-rule' && D.regulatoryComplianceMatrix2027) {
    const r = D.regulatoryComplianceMatrix2027.rules.find(x => String(x.idx) === String(id));
    if (!r) return null;
    return {
      eyebrow: `STATUTORY COMPLIANCE · ${r.categoryBadge}`,
      title: r.title,
      badge: '법령 · 감독규정 근거',
      formula: r.statute,
      rows: [
        ['발행어음 (단기금융업) 규제', r.promNoteRule],
        ['IMA (종합투자계좌) 규제', r.imaRule],
        ['금감원 보고 · 점검 주기', r.reportingCycle],
        ['위반 시 복구(유예 · 시정) 기간', r.curePeriod],
        ['법적 페널티 및 제재 조항', r.penalty]
      ],
      source: r.statute,
      caveat: '발행어음·IMA 고유 건전성·운용 규제는 사전 자동 유예기간이 없으며(부동산 15%→10%·모험자본 10%→25%의 연도별 단계적 경과조치만 존재), 유동성·NCR 미달 시 즉시 금감원장 사유·시정계획 보고 대상이고 불건전 자전거래·불완전판매는 적발 즉시 제재가 개시됩니다.',
      qas: makeQaItems(['guide-product-difference', 'guide-demand-note-cash-buffer']),
      actions: [
        { label: '9대 고유 규제·페널티 총람표 보기 →', tab: 'pnl', scrollTo: 'reg-compliance-matrix', primary: true },
        { label: '법령 포털 및 통계 코드(#sources) →', tab: 'sources' }
      ]
    };
  }

  const forecast = g.promNoteIma27EstTril;
  const bases = [
    ['OpenDART 2026.3Q 확정', g.promNoteIma26Q3ExactTril],
    ['FISIS 2026.2Q 제공', g.promNoteIma26Q2ExactTril],
    ['기존 2026.2Q 모형', g.promNoteIma26Q2SimBaseTril]
  ];
  const growth = base => (forecast / base - 1) * 100;
  const companies = D.fundingForecast2027?.companies ?? [];
  const sumForecast = keys => companies.filter(firm => keys.includes(firm.key))
    .reduce((sum, firm) => sum + firm.promNoteYearEndTril + firm.imaYearEndTril, 0);
  const staticSpecs = {
    'kpi:pcbo-clean-bench': (() => {
      const pb = vc?.pcboCleanBenchmark;
      const fsc = pb?.fscEmpirical26Q2;
      return {
        eyebrow: 'COMPARISON BENCHMARK · AAA 은행채 3년',
        title: 'AAA 은행채 3년 금리를 비교 기준으로 쓰면?',
        badge: '시장 평가수익률 · 모형 비교',
        formula: (() => { const m = pb?.modes?.[0]; return m ? `정상 IB 가정 ${fmt(m.normalYieldPct)}% − AAA 은행채 3년 ${fmt(m.pcboYieldPct, 3)}% = ${fmt((m.normalYieldPct-m.pcboYieldPct)*100, 1)}bp` : 'AAA 은행채 3년 평가수익률과 정상 IB 가정을 비교'; })(),
        rows: [
          ['금융위 종투사 모험자본 실증 (\'26.2Q)', fsc ? `총 ${fmt(fsc.totalVcTril, 1)}조 원 중 P-CBO ${fmt(fsc.pcboTril, 1)}조 원 (${fmt(fsc.pcboSharePct, 1)}%) — 단일 편입 수단 1위` : '11.6조 중 3.4조(29.3%)'],
          ['금리의 정의와 기준일', `${pb?.observedDate || '2026-11-13'} · KIS자산평가 AAA 은행채 3년 평가수익률 (P-CBO 실제 발행금리 아님)`],
          ['상단 계산기의 기본 순스프레드', `AAA 은행채 금리 − 조달원가 = ${fmt(costDefaults.pcbo, 1)}bp. 정상 기업금융 ${fmt(costDefaults.spread, 0)}bp 적용 시 차이는 ${baseGapBp}bp입니다.`],
          ['모험자본 인정과의 구분', 'AAA 은행채 자체를 모험자본 인정자산으로 가정하지 않습니다. P-CBO 편입 비중과 대체 비교금리는 별개입니다.'],
          ['수신 1조 원 한계 단위의 조건부 계산', (() => { const m=pb?.modes?.[0]; const bp=m?(m.normalYieldPct-m.pcboYieldPct)*100:0; return `의무 20% × 비A급 가정 70% × ${fmt(bp, 1)}bp = 연 ${fmt(bp*.14, 3)}억 원`; })()]
        ],
        source: '<a href="https://www.bond.co.kr/post/dawn/37184" target="_blank" rel="noopener noreferrer">KIS WEEKLY 1212호 (2026.11.13), 13·57쪽</a> · KIS-NET/KIS자산평가. KOFIA 평가사 평균과 구분합니다.',
        caveat: '정상 IB 4.85%와 조달원가 3.15%는 기존 설명용 모형 가정입니다. 같은 날짜의 은행채 평가수익률을 비교 기준으로 대입한 조건부 시산이며, 투자자별 실현수익이나 P-CBO 기회비용의 실측치가 아닙니다. AAA 등급은 무위험 보장을 뜻하지 않습니다.',
        qas: makeQaItems(['guide-pcbo-assumption', 'guide-sizing-growth']),
        actions: [
          { label: 'AAA 은행채 비교 도해 보기 →', tab: 'invest', scrollTo: 'vc-raroc-lab', primary: true },
          { label: '인정자산별 시장규모 보기 ↓', tab: 'invest', scrollTo: 'vc-market-sizes' }
        ]
      };
    })(),
    'kpi:actual-5854': {
      eyebrow: 'BASELINE VERIFICATION · 2026.3Q 확정 기준선',
      title: '2026.3Q 어음 + IMA 합산 잔액 61.33조 원 (OpenDART)',
      badge: '3분기 분기보고서 확정',
      formula: '발행어음 57.24조(8개 발행사) + IMA 부채 4.09조(3사) = 61.33조 원',
      rows: [
        ['8개 발행사 발행어음 합계 (26.3Q DART)', '57.24조 원 (한투 24.47 · KB 10.59 · 미래 10.36 · NH 7.76 · 키움 2.18 · 하나 1.19 · 신한 0.45 · 삼성 0.24)'],
        ['3사 IMA 수탁부채 합계 (26.3Q DART)', '4.09조 원 (한투 3.08 · NH 0.64 · 미래에셋 0.38 · 5% 손실준비금 2,104.8억)'],
        ['직전 2026.2Q FISIS 기준선 대조', '58.54조 원 (어음 55.94 + 한투 IMA 2.60) / 모형 기준선 57.26조 원'],
        ['9대 종투사 별도 자기자본 합계 (26.3Q)', '80.70조 원 (어음 200% 법정한도 161.39조 · 발행잔액 보유 8사 자본 72.23조)']
      ],
      source: 'OpenDART 2026.3Q 분기보고서(9대 종투사 별도) 및 금감원 FISIS 202606 비교 병기',
      caveat: `기본 기준선은 OpenDART 2026.3Q 확정치(${fmt(bases[0][1])}조 → ${fmt(forecast, 0)}조, +${fmt(growth(bases[0][1]), 1)}%)입니다. 기회비용 계산기에서 2026.2Q 기준선도 함께 볼 수 있습니다.`,
      qas: makeQaItems(['guide-growth-baseline', 'guide-account-separation']),
      actions: [
        { label: '9사별 26.3Q·27E 분해표 보기 →', tab: 'funding', scrollTo: 'firm-growth-chain', primary: true },
        { label: '9사 발행어음 한도 소진율(#pnl) →', tab: 'pnl' }
      ]
    },
    'kpi:forecast-85': {
      eyebrow: '2027E REVISED OUTLOOK · 수정 전망 산식',
      title: `2027년 말 수신 시장 전망 ${fmt(forecast)}조 원`,
      badge: '메리츠 IR · 삼성 동일 가정',
      formula: `발행어음 ${fmt(g.promNote27EstTril)}조 + IMA ${fmt(g.ima27EstTril)}조 = ${fmt(forecast)}조 원`,
      rows: [
        ['선발 4사 · 한투·미래·NH·KB', `${fmt(sumForecast(['kis','mirae','nh','kb']))}조 원`],
        ['키움·하나·신한', `${fmt(sumForecast(['kiwoom','hana','shinhan']))}조 원`],
        ['삼성·메리츠', '각 연말 4조·평잔 2조 원 · 메리츠 IR 목표와 삼성 동일 가정'],
        ['OpenDART 2026.3Q 대비 증가', `+${fmt(forecast - bases[0][1])}조 원 · +${fmt(growth(bases[0][1]), 1)}%`]
      ],
      source: 'OpenDART 2026.3Q · 기존 전망 모형 · 사용자 전달 메리츠 IR 목표 및 삼성 동일 가정',
      caveat: `삼성·메리츠에는 수익 계산용 평잔을 각각 2조 원으로 적용합니다. 기본 2027년 발행어음 수익 계산 잔액은 ${fmt(D.fundingForecast2027 ? computeNim(D).totals.noteIncomeBase : 0, 0)}조 원입니다.`,
      qas: makeQaItems(['guide-growth-baseline', 'guide-2027-funding-outlook-bear-flattening']),
      actions: [
        { label: '회사별 성장 전제 드릴다운 보기 →', tab: 'funding', scrollTo: 'firm-growth-chain', primary: true },
        { label: 'NIM 수익 계산기(#nim-lab) 시뮬레이션 →', tab: 'funding', scrollTo: 'nim-lab' }
      ]
    },
    'kpi:growth-452': {
      eyebrow: 'GROWTH RATE BASIS · 순증 및 증가율 기준',
      title: `2026.3Q 대비 +${fmt(forecast - bases[0][1])}조 원 (+${fmt(growth(bases[0][1]), 1)}%)`,
      badge: '약 15개월 누적',
      formula: `(${fmt(forecast)}조 ÷ ${fmt(bases[0][1])}조 − 1) × 100 = +${fmt(growth(bases[0][1]))}%`,
      rows: [
        ...bases.map(([label, base]) => [label, `${fmt(base)}조 → ${fmt(forecast, 0)}조 원 · 순증 +${fmt(forecast - base)}조 · +${fmt(growth(base), 1)}%`]),
        ['기본 비교 기간', '2026년 9월 말 ~ 2027년 12월 말 (15개월)']
      ],
      source: 'OpenDART 2026.3Q 확정 공시 · FISIS 202606 및 대시보드 수정 전망 산식',
      caveat: '1년 연간 성장률이 아닌 5개 분기(15개월) 누적 성장률이며, 모험자본 기회비용 계산기(#invest)에서 세 기준선을 직접 전환해 비교할 수 있습니다.',
      qas: makeQaItems(['guide-growth-baseline', 'guide-sizing-growth']),
      actions: [
        { label: '모험자본 기회비용 기준선 비교(#invest) →', tab: 'invest', primary: true },
        { label: '2027년 수신환경 베어 플랫 전망 ↓', tab: 'funding', scrollTo: 'funding-outlook-2027' }
      ]
    },
    'kpi:vc-mandate-20': {
      eyebrow: 'CROSS-CUTTING REGULATION · 모험자본 공급 의무',
      title: '2027년 모험자본 의무비율 20% (중견·A급 상한 30%)',
      badge: '2028년 25% 상향',
      formula: '총운용자산의 20% = 중견·A급 최대 6%(20%×30%) + 비A급 순수 모험자본 최소 14%',
      rows: [
        ['연도별 의무비율 로드맵', '2026년 10% → 2027년 20% → 2028년 이후 25%'],
        ['중견기업 · A급 채권 인정 상한', '모험자본 의무액의 최대 30% (2027년 총자산의 6%, 2028년 7.5%)'],
        ['2027년 업권 총의무액', `${fmt(forecast * .2)}조 원 · 중견·A급 최대 ${fmt(forecast * .06)}조 원 · 기타 인정자산 최소 ${fmt(forecast * .14)}조 원`],
        ...(marketCost ? [['기본 전망의 추가 의무와 연간 기회비용', `신규 ${fmt(marketCost.delta)}조 × 20% + 기존 ${fmt(marketCost.base)}조 × 10%p = ${fmt(marketCost.obligation, 3)}조. ${baseGapBp}bp 적용 ${fmt(marketCost.cost, 0)}억 원, 상한 30% 활용 시 ${fmt(marketCost.after, 0)}억 원`]] : []),
        ['규제 적용 구조', '기업금융(50/70%)·부동산(≤10%)·기타 합계 100% 안에서의 별도 교차 요건']
      ],
      source: '금융위원회 『종투사 기업금융 경쟁력 제고방안』(2025.04.09) 및 금융투자업규정 제4-102조의5 개정안',
      caveat: '자산배분 100%에 추가로 20%를 더하는 것이 아니라 운용자산 내 적격 모험자본 인정분을 별도 집계합니다.',
      qas: makeQaItems(['guide-sizing-growth', 'guide-pcbo-assumption']),
      actions: [
        { label: '모험자본 4대 기회비용·잠재시장 심층 분석 →', tab: 'invest', scrollTo: 'vc-raroc-lab', primary: true },
        { label: '발행어음·IMA 운용규제 상세(#pnl) →', tab: 'pnl' }
      ]
    },
    'kpi:ib-debt-472': {
      eyebrow: 'FISIS SF325 · 9대 종투사 전사 차입부채',
      title: '9대 증권사 차입부채 합계 472.75조 원',
      badge: '고객예수금 158.50조 별도',
      formula: 'RP(146.32) + 단기차입(112.87) + ELS(83.61) + 어음(55.94) + 사채(38.45) + 기타(31.41) + 후순위(4.05)',
      rows: [
        ['1위 조달원 · RP매도', '146.32조 원 (31.0%) — 국공채·크레딧 레버리지 핵심'],
        ['2·3위 · 단기차입금 / 매도파생결합증권', '112.87조 원 (23.9%) / 83.61조 원 (17.7%)'],
        ['4위 · 발행어음 (SF325:A13)', '55.94조 원 (11.8%) — 무담보 기업금융 전용 재원'],
        ['별도 분리 · 고객예수금 (SF324)', '158.50조 원 — 자본시장법 제74조 증금 별도예치 (차입 미포함)'],
        ['재합산(472.65조)과의 0.10조 차이', '63개 세부 셀 소수점 둘째 자리 반올림에 따른 정상 원장 단수차']
      ],
      source: '금융감독원 FISIS 202606 (SF325 차입부채 · SF324 예수부채)',
      caveat: '전사 차입부채로 조달한 트레이딩·헤지 손익과 발행어음 구분계정의 손익은 직접 합산·치환할 수 없습니다.',
      qas: makeQaItems(['guide-account-separation', 'guide-kis-mirae-comparison']),
      actions: [
        { label: '9대 증권사 조달·실효금리·ROE 동기화 탐색 →', tab: 'ib-funding', primary: true },
        { label: '한국투자 vs 미래에셋 레버리지 대조 →', tab: 'kis-mirae' }
      ]
    },
    'kpi:margin-150-200': {
      eyebrow: 'SPREAD BENCHMARK · 수단별 순운용마진 가정',
      title: '발행어음 추정 순운용마진 150~200bp vs RP 10~30bp',
      badge: '시뮬레이션 가정 범위',
      formula: '어음 운용수익률(기업여신·크레딧 4.5~5.2%) − 어음 조달원가(평시 ~3.15%) ≈ 150~200bp',
      rows: [
        ['발행어음 추정 순마진', '150~200bp (기업신용위험·모험자본 의무·신NCR 100% 자본비용 수반)'],
        ['IMA 증권사 귀속 기여율', '120~180bp (기본보수 ~60bp + 기준수익률 초과분 성과보수 40% 구조)'],
        ['RP(환매조건부채권) 추정 마진', '10~30bp (국공채·우량채 담보 저위험 단기 캐리)'],
        ['ELS·DLS / CP·전단채 추정 마진', '30~70bp / 30~80bp']
      ],
      source: '원문 리서치 모형(Module E-3) 추정 범위 및 대시보드 NIM 시뮬레이터 기본값(150bp / 120bp)',
      caveat: '감사된 회계상 상품별 확정 마진이 아니며, 신용손실(EL)·판관비·신NCR 자기자본비용 차감 전 기준이므로 무위험 차익처럼 단순 비교하지 않습니다.',
      qas: makeQaItems(['guide-nim-income', 'guide-2027-funding-outlook-bear-flattening']),
      actions: [
        { label: '회사별 NIM 시뮬레이터(#nim-lab) 직접 조정 →', tab: 'funding', scrollTo: 'nim-lab', primary: true },
        { label: '모험자본 기회비용 비교(#invest) →', tab: 'invest', scrollTo: 'vc-raroc-lab' }
      ]
    },
    'kpi:bear-volume': {
      eyebrow: '2027 VOLUME VERDICT · 수신 외형 판정',
      title: `2027년 수신 외형 · ${fmt(bases[0][1])}조 원 → ${fmt(forecast, 0)}조 원 전망`,
      badge: '3대 강화 > 3대 악화',
      formula: '강화(9사 체제 완성 + 단기 파킹 머니무브 + 연금·ISA 기대) > 악화(특판 경합 + 금리인상)',
      rows: [
        ['핵심 확장 동력 1 · 공급 인가사 확대', '2년차 3사 미소진 한도 35.9조 + 26.09 삼성·메리츠 신규 인가(한도 +33조)'],
        ['핵심 확장 동력 2 · 베어 플랫 역설', '채권 3년물 금리 메리트 약화 → 3%대 초중반 단기 발행어음·CMA 파킹 집중'],
        ['공급 측 속도조절(Self-Brake)', '모험자본 20% 의무·부동산 10% 상한이 무분별한 출혈 수신 확대를 자체 제어']
      ],
      source: 'KOFIA 민평수익률(2026-11-13) · FISIS(202606) · 통합연금포털 기반 시나리오 분석',
      caveat: '수신 잔액이 잘 모이는 것(외형 확장)과 순이자마진이 개선되는 것(수익성)은 베어 플랫 국면에서 비대칭적으로 움직입니다.',
      qas: makeQaItems(['guide-2027-funding-outlook-bear-flattening', 'guide-growth-baseline']),
      actions: [
        { label: 'Q&A · 2027 수신환경·베어 플랫 전문 해설 →', qa: 'guide-2027-funding-outlook-bear-flattening', primary: true },
        { label: '시중 대기자금 머니무브 금리 사다리 ↓', tab: 'funding', scrollTo: 'money-move-safety' }
      ]
    },
    'kpi:bear-margin': {
      eyebrow: '2027 MARGIN PATH · 조달원가 및 NIM 경로',
      title: '단기 조달원가와 NIM은 어떤 조건에서 완화될까?',
      badge: '1년물 Lock-in 경계',
      formula: '업권 발행어음의 63.4%가 3개월 이하 → 단기금리 상승과 하락이 조달원가에 빠르게 반영될 수 있음',
      rows: [
        ['상반기(1H27) 마진 압박 요인', '기준금리 3.25~3.50% 도달 가정 시 1~3개월 내 조달원가 +35~55bp 즉각 반영'],
        ['피해야 할 함정 (Cost Lock-in)', '고점 4.3~4.5%대 1년물 특판 과다 조달 시 2028년 상반기까지 역마진 고착(KB 4.53% 사례)'],
        ['하반기(2H27) 반전 메커니즘', '금리 안정 진입 시 63.4% 초단기 부채가 가장 빠른 원가 하락 수단으로 작동']
      ],
      source: '금감원 발행어음 만기분포(2026.1Q) · FISIS SF321 실효금리 · KOFIA 채권 커브 실증',
      caveat: '1년물 조달의 필요액을 먼저 정하고, 긴 자산에는 만기를 맞춘 조달비용·회수 일정·유동성 여력을 대조합니다. 하반기 완화는 단기금리 하락을 전제로 합니다.',
      qas: makeQaItems(['guide-2027-funding-outlook-bear-flattening', 'guide-yield-curve-short-funding']),
      actions: [
        { label: '한국투자증권의 조달·운용·만기 전략 →', tab: 'funding', scrollTo: 'funding-bear-strategy', primary: true },
        { label: '단기 수익률곡선 패널 바로 보기 ↓', tab: 'funding', scrollTo: 'short-curve-panel' }
      ]
    },
    'kpi:bear-spread-11bp': {
      eyebrow: 'KOFIA OBSERVED SPREAD · 베어 플랫 실증 지표',
      title: '국고채 3Y − 1Y 기간 스프레드 +11.1bp로 급축소',
      badge: '2026-11-13 민평 기준',
      formula: '국고 3년(3.750%) − 국고 1년(3.639%) = +11.1bp (2026.2Q +50.2bp 대비 −39.1bp)',
      rows: [
        ['2026.2Q 평균 (기준금리 2.50%)', '국고 1Y 3.120% / 3Y 3.622% → 3Y−1Y +50.2bp'],
        ['2026-11-13 (기준금리 3.00%)', '국고 1Y 3.639% (+51.9bp 급등) / 3Y 3.750% (+12.8bp) → +11.1bp'],
        ['금융채 AA0 · 회사채 AA- (3Y−1Y)', '금융채 AA0 +22.1bp (4.362%−4.141%) · 회사채 AA- +17.2bp (4.417%−4.245%)'],
        ['과거 금리 고점기(2023.02~2024.10) 대조', '기준금리 3.50% 당시 국고 3Y−1Y 평균 −0.2bp (장단기 역전)']
      ],
      source: '금융투자협회(KOFIA) 채권정보센터 최종호가·시가평가 수익률 일별 원장(2018.01~2026.11.13)',
      caveat: '단기금리가 더 빠르게 오르며 만기 연장에서 얻는 추가 금리가 줄었습니다. 회사의 마진은 실제 조달비용과 운용수익률을 비교해 판단합니다.',
      qas: makeQaItems(['guide-2027-funding-outlook-bear-flattening', 'guide-yield-curve-short-funding']),
      actions: [
        { label: '기간스프레드와 당사 대응 전략 →', tab: 'funding', scrollTo: 'funding-bear-strategy', primary: true },
        { label: 'Q&A · 베어 플랫 역학 상세 읽기 →', qa: 'guide-2027-funding-outlook-bear-flattening' }
      ]
    },
    'kpi:curve-slope-109bp': {
      eyebrow: 'STEEPENING ASYMMETRY · 발행어음 단기 커브 기울기',
      title: '발행어음 1Y − 수시(1D) 기울기 +109.0bp',
      badge: '국고채의 1.9배 경사',
      formula: '7사 평균 1년물(3.96%) − 수시물(2.87%) = +109.0bp (선발 4사 평균 +120.0bp)',
      rows: [
        ['발행어음 7사 평균 커브 (2026-11-13)', '수시 2.87% → 3M 3.17% → 6M 3.55% → 1Y 3.96% (1Y−3M +79.0bp)'],
        ['동일 만기 국고채 커브', '콜 3.055% → 3M 3.210% → 1Y 3.639% (1Y−콜 +58.4bp · 1Y−3M +42.9bp)'],
        ['동일 만기 금융채 AA0 · 회사채 AA-', '1Y−3M 각각 +48.5bp / +43.6bp (6M→1Y 구간은 +8~16bp로 평탄화)'],
        ['급경사 유지의 3대 구조적 원인', '① CMA 결제편의 할인 ② 중도해지 페널티 ③ 6M~1Y물 유동성비율 분모 제외(FTP 우대)']
      ],
      source: '7개 인가 증권사 고시약정금리 및 KOFIA 민평수익률(2026-11-13)',
      caveat: '1년물 발행어음을 과도하게 늘리면 자체 공모 금융채 AA0 발행(1년 4.14%) 대비 조달원가 우위가 사라집니다.',
      qas: makeQaItems(['guide-yield-curve-short-funding', 'guide-2027-funding-outlook-bear-flattening']),
      actions: [
        { label: 'Q&A · 왜 발행어음 커브만 가파를까? →', qa: 'guide-yield-curve-short-funding', primary: true },
        { label: '9사별 실제 상반기 실효금리 비교 →', tab: 'ib-funding' }
      ]
    },
    'kpi:short-share-634': {
      eyebrow: 'FSS PARLIAMENTARY DATA · 업권 만기 구조 실증',
      title: '만기 3개월 이하 초단기 수신 비중 63.4% (34.50조 원)',
      badge: '2026.1Q · 54.43조 기준',
      formula: '(1개월 이하 29.25조 + 1~3개월 5.25조) ÷ 전체 54.43조 = 63.38% → 63.4%',
      rows: [
        ['만기 1개월 이하 (수시 + 30일 이내)', '29조 2,495억 원 (53.7%) — 대응 1개월 이하 운용자산도 27.75조(50.5%)'],
        ['만기 1개월 초과 ~ 3개월 이하', '5조 2,490억 원 (9.6%) → 3개월 이하 소계 34조 4,985억 원 (63.4%)'],
        ['만기 3~6개월 / 6개월~1년 이하', '9조 660억 원 (16.7%) / 10조 8,628억 원 (20.0%)'],
        ['만기 장기화 시 원가 충격 시산', '3M 이하를 20%로 축소 시 가중평균 조달단가 즉시 +46~66bp(연 +2,580~3,670억) 급등']
      ],
      source: '금융감독원 국회 정무위원회 제출 발행어음 만기별 조달·운용 명세(2026.1Q 말, 54조 4,273억 원)',
      caveat: '초단기 수신 집중은 단순 미스매치가 아니라 급경사 수익률곡선 하에서 NIM 150~200bp를 방어하기 위한 경제적 필연입니다.',
      qas: makeQaItems(['guide-yield-curve-short-funding', 'guide-demand-note-cash-buffer']),
      actions: [
        { label: 'Q&A · 63.4% 초단기 수신 실증 해설 →', qa: 'guide-yield-curve-short-funding', primary: true },
        { label: '중장기 대체 비히클 IMA 비교(#ima-maturity) →', tab: 'ima-maturity' }
      ]
    },
    'kpi:demand-share-4550': {
      eyebrow: 'KOFIA CMA & DEMAND SWEEP · 실질 수시물 비중',
      title: '업권 실질 수시입출금형 발행어음 비중 45~50% 추산',
      badge: '발행어음형 CMA 38~44%',
      formula: '확정 발행어음형 CMA(21.0~24.5조) + 위탁·법인 일반 수시물(3~5조 추산) ÷ 전체 어음',
      rows: [
        ['KOFIA 확정 발행어음형 CMA 잔고', '약 21.0~24.5조 원 (전체 CMA 103~106조 중 · 전체 어음의 38~44%)'],
        ['일반 위탁계좌·법인 수시물 추산', '약 3.0~5.0조 원 → 합산 실질 수시물 45~50%'],
        ['선발사 vs 후발사 조달단가 격차 증거', '선발 3사(수시 풍부) 실효금리 2.61~2.75% vs 하나증권(초기 기간형 90%) 3.42%'],
        ['유동성 관리 기준', '법정 1·3개월 유동성비율 ≥100% + 사내 현금성·HQLA 버퍼(5~15%)']
      ],
      source: '금융투자협회(KOFIA) 종합통계포털 CMA 일별·월별 통계 및 FISIS SF321 교차검증',
      caveat: '법인·일반 수시물 합산치(45~50%)는 확정 공시된 발행어음형 CMA(38~44%)에 기간물 구성을 대조해 도출한 추산 범위입니다.',
      qas: makeQaItems(['guide-demand-note-cash-buffer', 'guide-yield-curve-short-funding']),
      actions: [
        { label: 'Q&A · 수시물 10% 현금버퍼 개선 논리 →', qa: 'guide-demand-note-cash-buffer', primary: true },
        { label: '9사 유동성비율·실효금리 확인(#ib-funding) →', tab: 'ib-funding' }
      ]
    },
    'kpi:mm-m2': {
      eyebrow: 'MACRO LIQUIDITY · 한국은행 통화지표',
      title: '광의통화 M2 평잔 4,278.8조 원',
      badge: '2026.09 한국은행 ECOS',
      formula: '현금통화 + 요구불예금 + 수시입출식 저축성예금(M1) + 2년 미만 정기예적금·MMF·CMA·수익증권 등',
      rows: [
        ['광의통화 M2 규모 (2026.09)', '4,278.8조 원 — 국내 단기·준결제성 유동성 총량 지표'],
        ['발행어음+IMA의 M2 대비 규모', `2026.3Q ${fmt(bases[0][1] / 4278.8 * 100)}% · 2027년 전망 ${fmt(forecast / 4278.8 * 100)}% (2026.09 M2 기준)`],
        ['상반기 베어 플랫기 머니무브 경로', '은행 저원가 요구불예금(0.1~0.5%) → 증권 발행어음형 CMA(2.8~3.2%) 스윕 유입']
      ],
      source: '한국은행 경제통계시스템(ECOS) 통화 및 유동성 통계(2026.09 평잔 기준)',
      caveat: 'M2에는 가계뿐 아니라 기업·기타금융기관 보유 단기 통화성 상품이 함께 포함됩니다. 순수 가계 보유분은 가계자산 탭(#household-wealth)에서 확인하세요.',
      qas: makeQaItems(['guide-2027-funding-outlook-bear-flattening', 'guide-latest-rate']),
      actions: [
        { label: '가계·법인 세부 자산 브레이크다운(#household-wealth) →', tab: 'household-wealth', primary: true },
        { label: '수신금리 매력도 사다리 표 보기 ↓', tab: 'funding', scrollTo: 'money-move-safety' }
      ]
    },
    'kpi:mm-pension': {
      eyebrow: 'PENSION MONEY MOVE · 금융감독원 통합연금포털',
      title: '퇴직연금 원리금보장형 대기 자금 378.1조 원',
      badge: '총적립금 501.4조의 75.4%',
      formula: '퇴직연금 총적립금 501.4조 × 원리금보장형 비중 75.4% = 378.1조 원',
      rows: [
        ['퇴직연금 총적립금 / 원리금보장형', '501.4조 원 / 378.1조 원 (시중은행 저금리 예금 2.60~2.85% 편중)'],
        ['저축은행 연금예금 편입 상한', '기관당 1억 원 (2025.09.01 예금자보호 한도 상향 연동)'],
        ['자사상품 편입 금지(감독규정 제9조제3항)', '향후 어음·IMA 허용 시 시중은행·타 증권사 채널 교차판매 가능'],
        ['유입 민감도 시산', '원리금보장형의 3~5%만 유입되어도 약 11.3~18.9조 원 신규 수신 창출']
      ],
      source: '금융감독원 통합연금포털 퇴직연금 적립금 통계 및 퇴직연금감독규정 제9조·제15조의4',
      caveat: '현행 규정상 DC·IRP에 발행어음·IMA는 아직 직접 편입 전이며, 감독규정 개정 고시 및 사업자 전산 탑재가 선결 조건입니다.',
      qas: makeQaItems(['guide-pension-self-product-ban', 'guide-pension-eligibility']),
      actions: [
        { label: 'Q&A · 자사상품 금지와 501.4조 연금 효과 →', qa: 'guide-pension-self-product-ban', primary: true },
        { label: 'Q&A · 퇴직연금 편입 조건·확인 경로 →', qa: 'guide-pension-eligibility' }
      ]
    },
    'kpi:mm-deposits': {
      eyebrow: 'FISIS SF324 · 증권사 대기자금 풀',
      title: '9대 증권사 별도 고객예수금 158.50조 원',
      badge: '증금 별도예치 · CMA 전환 풀',
      formula: '위탁자예수금 등 고객 대기자금 합계 158.50조 원 (한국투자 26.05조 · 키움 25.49조 등)',
      rows: [
        ['법적 성격 (자본시장법 제74조)', '한국증권금융 별도 예치·신탁 의무 → 증권사 고유 기업금융 운용 전용 불가'],
        ['고객 입장에서의 금리 격차', '일반 예탁금 이용료율(연 0.1~1.0%대) vs 수시형 발행어음·CMA(연 2.8~3.2%)'],
        ['증권사 입장에서의 전환 효과', '고객이 예탁금을 발행어음형 CMA로 스윕(동의 전환)하면 즉시 IB 운용재원으로 편입']
      ],
      source: '금융감독원 FISIS 202606 예수부채(SF324) 및 자본시장법 제74조',
      caveat: '특히 리테일 고객예수금이 25.49조에 달하는 키움증권과 WM 기반이 큰 삼성·미래·한투에서 내부 계좌 스윕 잠재력이 큽니다.',
      qas: makeQaItems(['guide-account-separation', 'guide-2027-funding-outlook-bear-flattening']),
      actions: [
        { label: '9사별 고객예수금·차입 구성 비교(#ib-funding) →', tab: 'ib-funding', primary: true },
        { label: '가계 금융자산 내 예금·증권 구조(#household-wealth) →', tab: 'household-wealth' }
      ]
    },
    'kpi:hw-kr-total': (() => {
      const nbs25 = hw?.krAnnualBalanceSheet?.at(-1);
      const hk = hw?.headlineKpis;
      return {
        eyebrow: 'ECOS 291Y505 · 한국 가계 대차대조표 총괄',
        title: `한국 전체 가계자산 ${nbs25 ? fmt(nbs25.totalAssetsTril, 1) : '16,641.3'}조 원 ('25말 국민대차대조표)`,
        badge: `명목 GDP의 ${nbs25 ? fmt(nbs25.totalAssetsToGdpX, 2) : '6.22'}배`,
        formula: nbs25
          ? `비금융(실물) ${fmt(nbs25.nonFinAssetsTril, 1)}조(${fmt(nbs25.nonFinShareOfGrossPct, 1)}%) + 금융자산 ${fmt(nbs25.finAssetsTril, 1)}조(${fmt(nbs25.finShareOfGrossPct, 1)}%) = ${fmt(nbs25.totalAssetsTril, 1)}조 원`
          : '비금융(실물) 10,433.7조(62.7%) + 금융자산 6,207.6조(37.3%) = 16,641.3조 원',
        rows: [
          ['비금융(실물)자산 세부', nbs25 ? `토지자산 ${fmt(nbs25.landTril, 1)}조 + 건물(주택 등) ${fmt(nbs25.buildingsTril, 1)}조 + 기타 ${fmt(nbs25.otherNonFinTril, 1)}조` : '토지 7,418.6조 + 건물 2,833.0조 + 기타 182.2조'],
          ['금융자산 (\'25말 → \'26.2Q 자금순환)', hk ? `${fmt(hk.krFinAssets25Tril, 1)}조 원 → '26.2Q ${fmt(hk.krFinAssets26Q2Tril, 1)}조 원으로 반기 만에 +${fmt(hk.krFinAssets26Q2Tril - hk.krFinAssets25Tril, 1)}조 증가` : '6,207.6조 → 6,930.2조 원'],
          ['금융부채 차감 가계 순자산', nbs25 ? `${fmt(nbs25.netWorthTril, 1)}조 원 (명목 GDP ${fmt(nbs25.nominalGdpTril, 1)}조 원 대비 ${fmt(nbs25.netWorthToGdpX, 2)}배)` : '14,200.5조 원'],
          ['국제 비교 포지션', '실물자산 편중도(62.7%)가 미(30.9%)·일(38.1%)·영(52.0%) 대비 높으나 금융 비중(37.3%)도 상승 추세']
        ],
        source: '한국은행·국가데이터처 『2025년 국민대차대조표(잠정)』(ECOS 291Y505, S14 가계 및 비영리단체)',
        caveat: '가계 총자산의 62.7%가 부동산에 묶여 있으나, 금융자산(6,930.2조) 내에서도 정기예금(1,474조)과 연금(1,633조)의 중수익 전환 여력이 막대합니다.',
        qas: makeQaItems(['guide-2027-funding-outlook-bear-flattening', 'guide-pension-self-product-ban']),
        actions: [
          { label: '세부 금융상품·부채 참고 표 보기 ↓', tab: 'household-wealth', scrollTo: 'hw-korea-tree', primary: true },
          { label: '한·미·영·일·중 5개국 비교 바로가기 ↓', tab: 'household-wealth', scrollTo: 'hw-intl-5country' }
        ]
      };
    })(),
    'kpi:hw-kr-fin': (() => {
      const hk = hw?.headlineKpis;
      const qLat = hw?.krQuarterlyFinSeries?.at(-1);
      const categories = hw?.krFinCategories26Q2 || [];
      const totalFin = hk?.krFinAssets26Q2Tril ?? qLat?.totalFinTril ?? categories.reduce((sum, category) => sum + category.amount26Q2Tril, 0);
      const bonds = categories.find(category => category.id === 'bonds');
      return {
        eyebrow: 'ECOS 281Y002 · 최신 분기 가계 금융자산',
        title: `2026.2Q 가계 금융자산 ${fmt(totalFin, 2)}조 원`,
        badge: `순금융자산 ${hk ? fmt(hk.krNetFin26Q2Tril, 1) : '4,435.2'}조`,
        formula: `${categories.map(category => `${category.label}(${fmt(category.amount26Q2Tril, 2)}조)`).join(' + ')} = ${fmt(totalFin, 2)}조 원`,
        rows: [
          ...categories.map(category => [`${category.label} (${fmt(category.share26Q2Pct, 1)}%)`, `${fmt(category.amount26Q2Tril, 2)}조 원`]),
          ['금융부채 및 건전성 배율', hk ? `금융부채 ${fmt(hk.krFinLiab26Q2Tril, 1)}조 원 · 금융자산/부채 배율 ${qLat ? fmt(qLat.assetLiabRatioX, 2) : '2.78'}배` : '—']
        ],
        source: '한국은행 『2026년 2분기 자금순환(잠정)』(ECOS 281Y002, S14 가계 및 비영리단체)',
        caveat: bonds ? `가계 금융자산 중 ${bonds.label}은 ${fmt(bonds.share26Q2Pct, 1)}%(${fmt(bonds.amount26Q2Tril, 2)}조)입니다. 자산별 위험·만기·원금보호 조건을 구분하고, 발행어음·IMA를 예금과 동일한 보호 구조로 해석하지 않습니다.` : '세부 금융상품의 잔액·위험·만기·원금보호 조건을 함께 확인합니다.',
        qas: makeQaItems(['guide-latest-rate', 'guide-product-difference']),
        actions: [
          { label: '분기별 금융자산 시계열 차트 보기 ↓', tab: 'household-wealth', scrollTo: 'hw-timeseries', primary: true },
          { label: '2027 수신 전망 & NIM 계산기(#funding) →', tab: 'funding' }
        ]
      };
    })(),
    'kpi:hw-corp-s11': {
      eyebrow: 'ECOS 281Y002 (S11) · 법인 도매 수신 기반',
      title: '비금융법인(S11) 현금·예금 1,135.9조 원 (+펀드·채권 396.6조)',
      badge: '법인 발행어음 원천',
      formula: '법인 현금·예금 1,135.9조 + 투자펀드(MMF 등) 274.7조 + 채권 121.9조 = 단기·금융운용 1,532.5조',
      rows: [
        ['비금융법인 현금 및 예금 (\'26.2Q)', '1,135.9조 원 (\'19.4Q 728.6조 대비 +407.3조 확대)'],
        ['비금융법인 투자펀드(MMF 포함) · 채권', '펀드 274.7조 원 · 채권(CP·단기사채·장기채) 121.9조 원'],
        ['발행어음 시장에서의 역할', '기업 자금부의 MMF·정기예금 대체 수시형/3개월물 발행어음 도매 수요 형성'],
        ['리스크 관리 연결점', '법인 수시물은 분기·연말 결산기 일시 인출 변동성이 있어 소매 CMA와 분산 필수']
      ],
      source: '한국은행 자금순환(ECOS 281Y002, S11 비금융법인기업 부문)',
      caveat: '가계가 발행어음·IMA의 안정적 리테일 코어 부채라면, 비금융법인 유동성은 규모를 빠르게 키우는 도매 자금원입니다.',
      qas: makeQaItems(['guide-yield-curve-short-funding', 'guide-demand-note-cash-buffer']),
      actions: [
        { label: '법인 유동성 & 가계 5분위 비교 섹션 ↓', tab: 'household-wealth', scrollTo: 'hw-aux-pools', primary: true },
        { label: 'Q&A · 발행어음 초단기 수신 구조 →', qa: 'guide-yield-curve-short-funding' }
      ]
    },
    'kpi:hw-shf-top20': {
      eyebrow: 'ECOS 903Y212 · 가계금융복지조사 분위별 집중도',
      title: '순자산 상위 20%(5분위) 가구 평균 총자산 17.46억 · 금융 3.46억',
      badge: '전체 순자산의 62% 보유',
      formula: '5분위 평균 자산 17.46억(실물 14.00억 + 금융 3.46억) − 부채 1.62억 = 순자산 15.84억 원',
      rows: [
        ['전체 가구 평균 vs 순자산 5분위 평균', '총자산 5.66억 vs 17.46억 (3.1배) · 금융자산 1.40억 vs 3.46억'],
        ['5분위 가구 금융자산 세부 구성', '예치식 저축 1.46억 · 적립식·기타 1.49억 · 전월세보증금 0.51억'],
        ['발행어음 · IMA 타깃 시사점', '예금자보호(1억 원) 한도를 초과하는 거액 예치금을 보유해 AA급 종투사 어음·IMA 핵심 수요층']
      ],
      source: '국가데이터처·금융감독원·한국은행 『2025년 가계금융복지조사』(ECOS 903Y212, 2025년 3월 말 기준)',
      caveat: '표본 가구 설문·행정자료 조사이므로 초고액자산가 꼬리 분포는 거시 자금순환(ECOS 281Y002) 총량보다 과소 포착되는 특성이 있습니다.',
      qas: makeQaItems(['guide-principal-protection', 'guide-latest-rate']),
      actions: [
        { label: '순자산 1~5분위 전체 비교표 보기 ↓', tab: 'household-wealth', scrollTo: 'hw-aux-pools', primary: true },
        { label: '9사 신용등급·원금보호 구조(#funding) →', tab: 'funding', scrollTo: 'money-move-safety' }
      ]
    },
    'kpi:reg-cap-300': {
      eyebrow: 'STATUTORY LIMIT · 자본시장법 시행령 제77조의6',
      title: '발행어음 단독 200% · 발행어음 + IMA 통합 300% 한도',
      badge: '별도 자기자본 기준',
      formula: '발행어음 ≤ 별도자본 × 200% / (발행어음 + IMA) ≤ 별도자본 × 300%',
      rows: [
        ['4조 원 이상 종투사 (9개사 전원)', '발행어음 단독 별도 자기자본의 200% 이내 발행 가능'],
        ['8조 원 이상 IMA 인가사 (한투·미래·NH)', '발행어음 + IMA 합산 별도 자기자본의 300% 이내 조달 가능'],
        ['규제 레버리지(1,100%) 산정 특례', '발행어음·IMA 구분계정 운용자산은 전사 레버리지비율 산정 시 차감 특례 적용']
      ],
      source: '자본시장법 제77조의3 · 시행령 제77조의6 · 금융투자업규정 별표 10',
      caveat: '통합 300% 한도가 있다고 해서 발행어음만으로 300%를 채울 수는 없으며, 200% 초과 구간은 반드시 IMA로 조달해야 합니다.',
      qas: makeQaItems(['guide-product-difference', 'guide-sizing-growth']),
      actions: [
        { label: '9대 고유 규제·보고주기·페널티 총람(#pnl) →', tab: 'pnl', scrollTo: 'reg-compliance-matrix', primary: true },
        { label: '발행어음 vs IMA 제도 비교(#ima-maturity) →', tab: 'ima-maturity' }
      ]
    },
    'kpi:ima-kis-260': {
      eyebrow: 'MATURITY WALL · 초기 폐쇄형 IMA 만기 구조',
      title: '한국투자증권 초기 IMA 1~4호 2.60조 원 (5개월 내 만기 집중)',
      badge: '2027.12 ~ 2028.04',
      formula: '1호 1.10조(27.12) + 3호 0.40조(28.02) + 4호 0.30조(28.03) + 2호 0.80조(28.04) = 2.60조 원',
      rows: [
        ['최대 단일 만기 · 1호 (2027년 12월)', '1.10조 원 (초기 4개 회차의 42.3%) — 연말 북클로징 시기와 중첩'],
        ['소규모 회차 · 3호(0.40조) / 4호(0.30조)', '단일 대형 기업금융 딜 편입 시 회차 내 집중위험(5% 충당금 소진) 관리 필요'],
        ['차환(Rollover) 핵심 체크포인트', '편입 기업여신·사모사채 현금 회수일과 만기 원리금 지급일의 1~2분기 선제 매칭']
      ],
      source: '저장소 제공 한국투자증권 초기 IMA 1~4호 설정·만기 타임라인(imaTranchesKis)',
      caveat: '전체 IMA 시장(2027E 5.00조 전망)의 만기 분포가 아니라 공시·파악된 한국투자 초기 4개 회차의 집중도입니다.',
      qas: makeQaItems(['guide-ima-maturity', 'guide-real-estate-concentration']),
      actions: [
        { label: 'Q&A · IMA 만기 집중 리스크 해설 →', qa: 'guide-ima-maturity', primary: true },
        { label: '위험률별 구NCR 비교 그래프 →', tab: 'ima-maturity', scrollTo: 'ima-old-ncr-panel' },
        { label: '리스크점검 체크리스트(#pension-risk) →', tab: 'pension-risk' }
      ]
    },
    'kpi:kis-mirae-lev': {
      eyebrow: 'LEVERAGE & CAPITAL ACCOUNTING · 한국투자 vs 미래에셋',
      title: '순수 회계 레버리지(10.5배 / 13.6배) vs 규제 레버리지(902% / 790%)',
      badge: '2026.2Q 별도·연결 대조',
      formula: '회계 배수 = 별도 총자산 ÷ 별도 자기자본 / 규제 레버리지 = 조정자산 ÷ 조정자기자본 (한도 1,100%)',
      rows: [
        ['한국투자증권 (별도 자산 138.0조 / 자본 13.19조)', '순수 회계 10.46배 · 규제 레버리지 902.2% · 연결 순자본/위험액 286.4%'],
        ['미래에셋증권 (별도 자산 143.9조 / 자본 10.57조)', '순수 회계 13.61배 · 규제 레버리지 790.1% · 개별 자본차감 5.92조(해외출자 등)'],
        ['왜 순위가 뒤바뀌는가?', '미래에셋은 RP·종금형·파생 등 규제 레버리지 차감 자산 비중이 크고, 한투는 발행어음 기업여신 익스포저가 크기 때문']
      ],
      source: '금융감독원 FISIS 202606 (SF304 재무상태표 · SF331 레버리지비율 · SF408/SF308 NCR)',
      caveat: '전사 이자손익(한투 +5,299억 vs 미래 −1,405억, 리테일 차감 후) 역시 자산배분(국내 기업여신 vs 해외출자·배당) 차이이며 발행어음 단독 마진이 아닙니다.',
      qas: makeQaItems(['guide-kis-mirae-comparison', 'guide-mirae-note-growth', 'guide-account-separation']),
      actions: [
        { label: 'Q&A · 한투 vs 미래 이자손익 해석 전문 →', qa: 'guide-kis-mirae-comparison', primary: true },
        { label: '9대 증권사 전체 수익성 매트릭스(#ib-funding) →', tab: 'ib-funding', scrollTo: 'ib-profitability-matrix' }
      ]
    },
    'kpi:mrmc-qstar': {
      eyebrow: 'MARGINAL ECONOMICS · 최적 수신 규모 Q*',
      title: '한계수익(MR) = 한계비용(MC) 균형과 어음·IMA 분업',
      badge: '경제학적 의사결정 모형',
      formula: '추가 운용수익과 추가 조달·운용 비용을 비교',
      rows: [
        ['운용', '추가 수신을 집행할 수 있는 적격 딜과 해당 딜의 수익·회수 일정 확인'],
        ['조달', '특판 등 추가 조달의 실효금리와 만기, 유동성 여력 점검'],
        ['규모', '추가 운용수익이 조달·운용 비용을 보상하는 범위에서 수신 규모 결정']
      ],
      source: '원문 Module C 한계수익과 한계비용 개념 모형',
      caveat: '그래프 좌표는 설명용입니다. 회사별 딜 조건과 조달원가를 확인한 뒤 실제 수신 규모를 판단합니다.',
      qas: makeQaItems(['guide-sizing-growth', 'guide-2027-funding-outlook-bear-flattening']),
      actions: [
        { label: '수신 1조 패키지 한계이익 렌즈 열기 ↑', tab: 'invest', scrollTo: 'vc-raroc-lab', primary: true },
        { label: 'Q&A · 모험자본 병목과 적정 성장 규모 →', qa: 'guide-sizing-growth' }
      ]
    }
  };

  if (staticSpecs[specKey]) return staticSpecs[specKey];

  return null;
}

/* ==========================================================================
   Thought-Trail Breadcrumb Engine (최근 탐색 맥락 보존 및 1클릭 복귀)
   ========================================================================== */
const trailHistory = [];
const MAX_TRAIL = 5;

export function recordTrailStep({ id, label, firmName = '', href = '' }) {
  if (!id || !label) return;
  const cleanHref = href || ('#' + id);
  const last = trailHistory.at(-1);
  if (last && last.id === id) {
    last.label = label;
    last.firmName = firmName;
    last.href = cleanHref;
    return;
  }
  const existingIdx = trailHistory.findIndex(x => x.id === id);
  if (existingIdx !== -1 && existingIdx === trailHistory.length - 2) {
    trailHistory.pop();
    const cur = trailHistory.at(-1);
    cur.firmName = firmName;
    cur.href = cleanHref;
    return;
  }
  trailHistory.push({ id, label, firmName, href: cleanHref });
  if (trailHistory.length > MAX_TRAIL) trailHistory.shift();
}

export function getPreviousTrailStep() {
  return trailHistory.length >= 2 ? trailHistory[trailHistory.length - 2] : null;
}

export function renderTrailHtml(currentId, currentLabel, firmName = '') {
  const prevSteps = trailHistory.slice(0, -1).slice(-3);
  const firmChip = firmName && ['funding', 'ib-funding', 'invest', 'pnl', 'kis-mirae'].includes(currentId)
    ? `<span class="trail-firm-pill" title="현재 연동된 증권사">${firmName}</span>`
    : '';

  if (!prevSteps.length) {
    return `<span class="trail-root">리서치 대시보드</span><span>/</span><b id="crumb">${currentLabel}</b>${firmChip}`;
  }

  const prevLinks = prevSteps.map(s =>
    `<a href="${s.href}" class="trail-link" data-trail-jump="${s.href}">${s.label}</a><span class="trail-sep" aria-hidden="true">▸</span>`
  ).join('');

  const prev = prevSteps.at(-1);
  return `${prevLinks}<b id="crumb">${currentLabel}</b>${firmChip}<button type="button" class="trail-back-btn" data-trail-back="${prev.href}" title="${prev.label} 화면으로 돌아가기">↩ 이전 맥락</button>`;
}

/* ==========================================================================
   DOM Inspector Drawer Mounting & Delegated Event Wiring
   ========================================================================== */
let drawerEl = null;
let backdropEl = null;
let lastTriggerEl = null;
let getDataFn = () => null;
let onActionFn = () => {};
const drawerStack = [];
const backgroundInertState = new Map();
const focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function focusableDrawerItems() {
  return [...drawerEl.querySelectorAll(focusableSelector)].filter(el => !el.hidden && !el.closest('[hidden]') && !el.inert);
}

function setBackgroundInert(locked) {
  if (locked) {
    for (const el of document.body.children) {
      if (el === drawerEl || el === backdropEl || backgroundInertState.has(el)) continue;
      backgroundInertState.set(el, { inert: !!el.inert, attribute: el.hasAttribute('inert') });
      el.inert = true;
      el.setAttribute('inert', '');
    }
  } else {
    for (const [el, saved] of backgroundInertState) {
      el.inert = saved.inert;
      if (saved.attribute) el.setAttribute('inert', '');
      else el.removeAttribute('inert');
    }
    backgroundInertState.clear();
  }
}

function focusDrawerStart() {
  const target = drawerEl.querySelector('#xray-close-btn') || focusableDrawerItems()[0] || drawerEl;
  target.focus({ preventScroll: true });
}

function ensureDrawerDom() {
  if (drawerEl) return;
  backdropEl = document.createElement('div');
  backdropEl.id = 'xray-backdrop';
  backdropEl.className = 'xray-backdrop';
  backdropEl.hidden = true;

  drawerEl = document.createElement('aside');
  drawerEl.id = 'xray-drawer';
  drawerEl.className = 'xray-drawer';
  drawerEl.setAttribute('aria-hidden', 'true');
  drawerEl.setAttribute('role', 'dialog');
  drawerEl.setAttribute('aria-modal', 'true');
  drawerEl.setAttribute('tabindex', '-1');
  drawerEl.inert = true;
  drawerEl.setAttribute('inert', '');
  drawerEl.setAttribute('aria-label', '데이터 근거 및 연관 질문 인스펙터');

  document.body.appendChild(backdropEl);
  document.body.appendChild(drawerEl);

  backdropEl.addEventListener('click', closeXray);
  document.addEventListener('keydown', e => {
    if (!drawerEl || !drawerEl.classList.contains('open')) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      closeXray();
      return;
    }
    if (e.key === 'Tab') {
      const items = focusableDrawerItems();
      const first = items[0] || drawerEl, last = items.at(-1) || drawerEl;
      if (!drawerEl.contains(document.activeElement) || !items.length || (e.shiftKey && document.activeElement === first) || (!e.shiftKey && document.activeElement === last)) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus({ preventScroll: true });
      }
    }
  });
  document.addEventListener('focusin', e => {
    if (drawerEl.classList.contains('open') && !drawerEl.contains(e.target)) focusDrawerStart();
  });
}

export function closeXray() {
  if (!drawerEl) return;
  drawerEl.classList.remove('open');
  drawerEl.setAttribute('aria-hidden', 'true');
  drawerEl.inert = true;
  drawerEl.setAttribute('inert', '');
  setBackgroundInert(false);
  if (backdropEl) backdropEl.hidden = true;
  drawerStack.length = 0;
  if (lastTriggerEl && typeof lastTriggerEl.focus === 'function') {
    try { lastTriggerEl.focus({ preventScroll: true }); } catch {}
  }
  lastTriggerEl = null;
}

export function openXray(specKey, triggerEl = null, pushStack = false) {
  const D = getDataFn();
  const spec = resolveXraySpec(specKey, D);
  if (!spec) return false;
  ensureDrawerDom();

  if (triggerEl) lastTriggerEl = triggerEl;
  if (pushStack && drawerEl.dataset.currentKey && drawerEl.dataset.currentKey !== specKey) {
    drawerStack.push(drawerEl.dataset.currentKey);
  } else if (!pushStack) {
    drawerStack.length = 0;
  }
  drawerEl.dataset.currentKey = specKey;

  drawerEl.innerHTML = `
    <div class="xray-head">
      <div>
        <div class="eyebrow" style="margin-bottom:4px">${spec.eyebrow}</div>
        <div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap">
          ${drawerStack.length ? `<button type="button" class="xray-back-chip" id="xray-step-back">← 이전 항목</button>` : ''}
          ${spec.badge ? `<span class="badge green">${spec.badge}</span>` : ''}
        </div>
        <h2 class="xray-title">${spec.title}</h2>
      </div>
      <button type="button" class="xray-close" id="xray-close-btn" aria-label="인스펙터 닫기">✕</button>
    </div>
    <div class="xray-body">
      <section class="xray-sec">
        <div class="xray-sec-label">01 · 산식 및 세부 데이터 분해</div>
        <code class="formula-pill" style="margin-top:0;margin-bottom:10px">${spec.formula}</code>
        <div class="xray-kv-list">
          ${(spec.rows || []).map(([k, v]) => `<div class="drill-kv"><span>${k}</span><b>${v}</b></div>`).join('')}
        </div>
      </section>

      <section class="xray-sec">
        <div class="xray-sec-label">02 · 원천 통계 및 해석 주의점</div>
        <div class="xray-source-box">
          <b>원천 기준</b> · ${spec.source}
          <p>${spec.caveat}</p>
        </div>
      </section>

      ${spec.qas && spec.qas.length ? `<section class="xray-sec">
        <div class="xray-sec-label">03 · 이어지는 핵심 질문 · 검증 요약</div>
        <div class="xray-qa-list">
          ${spec.qas.map(qa => `<div class="xray-qa-card">
            <b>Q. ${qa.title}</b>
            <p>${qa.summary}</p>
            <a class="xray-qa-link" href="?q=${qa.id}#questions" data-qa-jump="${qa.id}" data-xray-dismiss>질문·답변 전문 보기 →</a>
          </div>`).join('')}
        </div>
      </section>` : ''}

      <section class="xray-sec">
        <div class="xray-sec-label">04 · 의식의 흐름 다음 연결</div>
        <div class="xray-actions">
          ${(spec.actions || []).map((act, idx) => act.qa
            ? `<a class="btn ${act.primary ? 'primary' : ''}" href="?q=${act.qa}#questions" data-qa-jump="${act.qa}" data-xray-dismiss>${act.label}</a>`
            : `<button type="button" class="btn ${act.primary ? 'primary' : ''}" data-xray-act="${idx}">${act.label}</button>`
          ).join('')}
          <a class="btn" href="#sources" data-xray-dismiss>전체 출처·통계표 코드 ↗</a>
        </div>
      </section>
    </div>
  `;

  drawerEl.querySelector('#xray-close-btn')?.addEventListener('click', closeXray);
  drawerEl.querySelector('#xray-step-back')?.addEventListener('click', () => {
    const prevKey = drawerStack.pop();
    if (prevKey) openXray(prevKey, null, false);
  });

  drawerEl.querySelectorAll('[data-xray-dismiss]').forEach(el => {
    el.addEventListener('click', closeXray);
  });

  drawerEl.querySelectorAll('[data-xray-act]').forEach(btn => {
    btn.addEventListener('click', () => {
      const act = spec.actions[Number(btn.dataset.xrayAct)];
      if (!act) return;
      closeXray();
      onActionFn(act);
    });
  });

  backdropEl.hidden = false;
  drawerEl.classList.add('open');
  drawerEl.setAttribute('aria-hidden', 'false');
  drawerEl.inert = false;
  drawerEl.removeAttribute('inert');
  setBackgroundInert(true);
  focusDrawerStart();
  return true;
}

export function initXraySystem({ getData, onAction }) {
  getDataFn = getData;
  onActionFn = onAction;
  ensureDrawerDom();

  document.addEventListener('click', e => {
    const trailBack = e.target.closest('[data-trail-back]');
    if (trailBack) {
      e.preventDefault();
      onActionFn({ href: trailBack.dataset.trailBack });
      return;
    }
    const trailJump = e.target.closest('[data-trail-jump]');
    if (trailJump && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey && e.button === 0) {
      e.preventDefault();
      onActionFn({ href: trailJump.dataset.trailJump });
      return;
    }

    const trigger = e.target.closest('[data-xray]');
    if (!trigger) return;
    // Do not hijack nested form inputs or dedicated navigation buttons/links inside a container
    if (e.target.closest('input, select, textarea, a[href], button[data-jump-ib], button[data-jump-invest], button[data-focus-jump-invest]')) {
      if (e.target.closest('[data-xray]') !== e.target && e.target.closest('a[href]')) return;
    }
    e.preventDefault();
    e.stopPropagation();
    openXray(trigger.dataset.xray, trigger);
  });

  document.addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const trigger = e.target.closest('[data-xray]');
    if (!trigger || ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON', 'A'].includes(trigger.tagName)) return;
    e.preventDefault();
    openXray(trigger.dataset.xray, trigger);
  });
}
