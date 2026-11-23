import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  explorerState,
  getSamsungScenario,
  setSamsungScenario,
  setExplorerFirmByName,
  renderFundingBreakdownPanel,
  renderMoneyMoveSafetyPanel,
  renderIbSynchronizedExplorer,
  renderVentureDeepDive,
  renderHouseholdWealthPage,
  renderRegulatoryCompliancePanel
} from '../public/curiosity.js';
import {
  resolveXraySpec,
  recordTrailStep,
  getPreviousTrailStep,
  renderTrailHtml
} from '../public/xray.js';

const publicDataUrl = new URL('../public/data.json', import.meta.url);
const verifiedDataUrl = new URL('../../data/ib_portal_verified_data.json', import.meta.url);
const D = JSON.parse(fs.readFileSync(publicDataUrl, 'utf8'));

test('public/data.json reconciles 85T revised outlook (Meritz IR 4T year-end / 2T avg) and matches root verified dataset when present', () => {
  if (fs.existsSync(verifiedDataUrl)) {
    assert.deepEqual(D, JSON.parse(fs.readFileSync(verifiedDataUrl, 'utf8')));
  }
  assert.equal(D.ib9FirmsCuriosityChain.length, 9);

  const baseSum = D.ib9FirmsCuriosityChain.reduce((acc, x) => acc + x.base26Q2NoteTril + x.base26Q2ImaTril, 0);
  const estNoteSum = D.ib9FirmsCuriosityChain.reduce((acc, x) => acc + x.est27ModelNoteTril, 0);
  const estImaSum = D.ib9FirmsCuriosityChain.reduce((acc, x) => acc + x.est27ModelImaTril, 0);
  const estSum = estNoteSum + estImaSum;
  assert.equal(baseSum.toFixed(2), '58.54');
  assert.equal(estNoteSum.toFixed(2), '80.00');
  assert.equal(estImaSum.toFixed(2), '5.00');
  assert.equal(estSum.toFixed(2), '85.00');

  const samsung = D.ib9FirmsCuriosityChain.find(x => x.key === 'samsung');
  const meritz = D.ib9FirmsCuriosityChain.find(x => x.key === 'meritz');
  assert(samsung.noteLicense.includes('2026.09'));
  assert(meritz.noteLicense.includes('2026.09'));
  assert.equal(samsung.costKey, 'samsung');
  assert.equal(meritz.costKey, 'meritz');
  assert.equal(samsung.est27ModelNoteTril, 0);
  assert.equal(meritz.est27ModelNoteTril, 4);
  assert.equal(meritz.est27AverageNoteTril, 2);
  assert.equal(samsung.profitability.h126NoteIntEok, 0);
  assert.equal(meritz.profitability.h126NoteIntEok, 0);
});

test('curiosity-driven hybrid UX renders all 4 perspectives cleanly without NaN or undefined', () => {
  for (const item of D.ib9FirmsCuriosityChain) {
    setExplorerFirmByName(D, item.firm);
    assert.equal(explorerState.firmKey, item.key);

    const fundingHtml = renderFundingBreakdownPanel(D);
    assert(fundingHtml.includes(item.firm));
    assert(fundingHtml.includes('85조'));
    assert(!fundingHtml.includes('NaN'));
    assert(!fundingHtml.includes('undefined'));

    const ibHtml = renderIbSynchronizedExplorer(D);
    assert(ibHtml.includes(item.firm));
    assert(!ibHtml.includes('NaN'));
    assert(!ibHtml.includes('undefined'));
  }

  for (const lens of ['rates', 'credit']) {
    explorerState.safetyLens = lens;
    const mmHtml = renderMoneyMoveSafetyPanel(D);
    assert(mmHtml.length > 500);
    assert(mmHtml.includes('id="jump-household-wealth"'));
    assert(mmHtml.includes('href="#household-wealth"'));
    assert(mmHtml.includes('16,641.3조 원'));
    assert(mmHtml.indexOf('전체 가계자산') < mmHtml.indexOf('광의통화 M2'));
    assert(!mmHtml.includes('NaN'));
    assert(!mmHtml.includes('undefined'));
  }

  for (const lens of ['nominal', 'el_adjusted', 'raroc_eva', 'bundled_pkg']) {
    for (const vehicle of ['note', 'ima']) {
      explorerState.vcLens = lens;
      explorerState.vcVehicle = vehicle;
      explorerState.vcPkgYear = '2028';
      const vcHtml = renderVentureDeepDive(D);
      assert(vcHtml.includes('id="pcbo-benchmark-svg"'));
      assert(vcHtml.includes('id="vc-waterfall-svg"'));
      assert(vcHtml.includes('AAA 은행채 3년'));
      assert(!vcHtml.includes('data-pcbo-mode'));
      assert(vcHtml.includes('PD · LGD 산정 근거 공개'));
      assert(vcHtml.includes('모험자본 취득에 따른 기회비용'));
      assert(vcHtml.includes('선제적 확보를 통한 경쟁자 견제 타당성'));
      assert(vcHtml.includes('인정 자산군별 현재 규모 vs 잠재 시장규모'));
      assert(!vcHtml.includes('NaN'));
      assert(!vcHtml.includes('undefined'));
    }
  }

  for (const wf of ['bbb_private', 'vc_mezz', 'a_cap_debt']) {
    explorerState.vcWaterfallAsset = wf;
    const vcHtml = renderVentureDeepDive(D);
    assert(vcHtml.includes('id="vc-waterfall-svg"'));
    assert(!vcHtml.includes('NaN'));
  }
  explorerState.vcWaterfallAsset = 'bbb_private';

  // Samsung scenario presets & reset check
  setSamsungScenario('wm3');
  assert.equal(getSamsungScenario(D).yearEndTril, 3);
  assert.equal(getSamsungScenario(D).avgTril, 1.8);
  const ssHtml = renderFundingBreakdownPanel(D);
  assert(ssHtml.includes('88.00조 원'));
  setSamsungScenario('base0');
  assert.equal(getSamsungScenario(D).yearEndTril, 0);
  assert.equal(getSamsungScenario(D).isOverridden, false);

  // Refined 9 core statutory regulatory matrix check
  assert.equal(D.regulatoryComplianceMatrix2027.rules.length, 9);
  assert.equal(D.promNoteDart202609.length, 9);
  assert.equal(D.globalKpis.promNoteIma26Q3ExactTril, 61.33);
  assert.equal(D.globalKpis.ib9Equity26Q3ExactTril, 80.7);
  for (const cat of ['all', 'limit_alloc', 'liquidity_capital', 'credit_conduct']) {
    explorerState.regCategory = cat;
    const regHtml = renderRegulatoryCompliancePanel(D);
    assert(regHtml.includes('id="reg-compliance-matrix"'));
    assert(regHtml.includes('자본시장법'));
    assert(!regHtml.includes('NaN'));
    assert(!regHtml.includes('undefined'));
  }
  explorerState.regCategory = 'all';
});

test('household wealth & 5-country comparison module renders all categories, series modes, corporate S11, SHF quintiles, and 5 countries cleanly', () => {
  const hw = D.householdWealthAndIntl2026;
  assert.ok(hw);
  assert.equal(hw.headlineKpis.krTotalHouseholdAssets25Tril, 16641.34);
  assert.equal(hw.headlineKpis.krFinAssets26Q2Tril, 6930.21);
  assert.equal(hw.krFinCategories26Q2.length, 5);
  assert.equal(hw.intl5Countries.length, 6);

  for (const cat of ['deposits', 'equities', 'pensions', 'bonds', 'other']) {
    explorerState.hwCategory = cat;
    const html = renderHouseholdWealthPage(D);
    assert(html.includes('16,641.3'));
    assert(html.includes('6,930.2'));
    assert(html.includes('비금융법인(S11)'));
    assert(html.includes('순자산 5분위'));
    assert(!html.includes('NaN'));
    assert(!html.includes('undefined'));
  }

  for (const mode of ['quarterly_fin', 'quarterly_share', 'annual_total']) {
    explorerState.hwSeriesMode = mode;
    const html = renderHouseholdWealthPage(D);
    assert(html.includes('2025'));
    assert(!html.includes('NaN'));
    assert(!html.includes('undefined'));
  }

  for (const lens of ['composition', 'macro_gdp']) {
    for (const code of ['KR', 'US', 'UK', 'JP', 'CN', 'EA']) {
      explorerState.hwCountryLens = lens;
      explorerState.hwSelectedCountry = code;
      const html = renderHouseholdWealthPage(D);
      assert(html.includes('미국'));
      assert(html.includes('영국'));
      assert(html.includes('일본'));
      assert(html.includes('중국'));
      assert(!html.includes('NaN'));
      assert(!html.includes('undefined'));
    }
  }
});

test('household detail counts, residual reconciliation and corporate cash pool keep assets and reference balances distinct', () => {
  const previousCategory = explorerState.hwCategory;
  try {
    explorerState.hwCategory = 'other';
    const html = renderHouseholdWealthPage(D);
    assert(html.includes('17개 세부 자산 항목'));
    assert(html.includes('부채 참고 1개'));
    assert(!html.includes('15개 세부 금융상품'));
    assert(html.includes('세부표 미분류 차이 23.79조'));
    assert(html.includes('표시된 세부 자산 합계 <b>25.29조'));
    assert(html.includes('합산 현금·예금 3,824.0조'));
    assert(html.includes('법인 투자펀드(MMF 등) 274.7조는 위 합계에 포함하지 않고 별도로 표시'));
    const changed = structuredClone(D);
    changed.householdWealthAndIntl2026.krFinCategories26Q2.find(cat => cat.id === 'other').amount26Q2Tril += 1;
    changed.householdWealthAndIntl2026.corpLiquiditySeries.at(-1).fundsTril += 2;
    const changedHtml = renderHouseholdWealthPage(changed);
    assert(changedHtml.includes('세부표 미분류 차이 24.79조'));
    assert(changedHtml.includes('합산 현금·예금 3,824.0조'));
    assert(changedHtml.includes('법인 투자펀드(MMF 등) 276.7조는 위 합계에 포함하지 않고 별도로 표시'));
  } finally { explorerState.hwCategory = previousCategory; }
});

test('living numbers X-Ray specs & thought-trail breadcrumb resolve cleanly without NaN or undefined', () => {
  const staticKeys = [
    'kpi:actual-5854', 'kpi:forecast-85', 'kpi:growth-452', 'kpi:vc-mandate-20',
    'kpi:ib-debt-472', 'kpi:margin-150-200', 'kpi:bear-volume', 'kpi:bear-margin',
    'kpi:bear-spread-11bp', 'kpi:curve-slope-109bp', 'kpi:short-share-634',
    'kpi:demand-share-4550', 'kpi:mm-m2', 'kpi:mm-pension', 'kpi:mm-deposits',
    'kpi:hw-kr-total', 'kpi:hw-kr-fin', 'kpi:hw-corp-s11', 'kpi:hw-shf-top20',
    'kpi:reg-cap-300', 'kpi:ima-kis-260', 'kpi:kis-mirae-lev', 'kpi:mrmc-qstar',
    'kpi:pcbo-clean-bench'
  ];
  const dynamicKeys = [
    ...D.ib9FirmsCuriosityChain.flatMap(f => [`firm:${f.key}`, `firm:${f.firm}`, `nim-firm:${f.key}`]),
    ...D.promNoteImaTrend.map((_, i) => `trend:${i}`),
    ...D.householdWealthAndIntl2026.krQuarterlyFinSeries.map(r => `hw-q:${r.period}`),
    ...D.householdWealthAndIntl2026.krAnnualBalanceSheet.map(r => `hw-y:${r.year}`),
    ...D.shortYieldCurveAndMaturity.curves.map((_, i) => `curve:${i}`),
    ...D.ventureCapitalChain2027.assetRarocBenchmarks.map((_, i) => `vc-asset:${i}`),
    ...D.regulatoryComplianceMatrix2027.rules.map(r => `reg-rule:${r.idx}`)
  ];

  for (const key of [...staticKeys, ...dynamicKeys]) {
    const spec = resolveXraySpec(key, D);
    assert.ok(spec, `missing X-Ray spec for ${key}`);
    assert.ok(spec.title && !spec.title.includes('NaN') && !spec.title.includes('undefined'), `bad title for ${key}`);
    assert.ok(spec.formula && !spec.formula.includes('NaN') && !spec.formula.includes('undefined'), `bad formula for ${key}`);
    assert.ok(Array.isArray(spec.rows) && spec.rows.length >= 3, `missing rows for ${key}`);
    assert.ok(spec.source && spec.caveat, `missing source/caveat for ${key}`);
    assert.ok(Array.isArray(spec.actions) && spec.actions.length >= 1, `missing actions for ${key}`);
    const serialized = JSON.stringify(spec);
    assert(!serialized.includes('NaN'), `NaN in ${key}`);
    assert(!serialized.includes('undefined'), `undefined in ${key}`);
  }

  recordTrailStep({ id: 'map', label: '한눈에 보기', href: '#map' });
  const initialTrail = renderTrailHtml('map', '한눈에 보기', '');
  assert(initialTrail.includes('id="crumb"'));
  assert(initialTrail.includes('한눈에 보기'));

  recordTrailStep({ id: 'funding', label: '수신 · NIM · 2027 전망', firmName: '메리츠증권', href: '#funding' });
  recordTrailStep({ id: 'household-wealth', label: '가계자산 · 5개국 비교', firmName: '메리츠증권', href: '#household-wealth' });
  assert.equal(getPreviousTrailStep().id, 'funding');
  const multiTrail = renderTrailHtml('invest', '모험자본 · 비용 계산기', '메리츠증권');
  assert(multiTrail.includes('id="crumb"'));
  assert(multiTrail.includes('data-trail-back='));
  assert(multiTrail.includes('메리츠증권'));
});
