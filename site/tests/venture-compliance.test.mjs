import test, {afterEach} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {calcCost, getOpportunityCostDefaults, explorerState, renderVentureDeepDive, renderRegulatoryCompliancePanel} from '../public/curiosity.js';
import {renderBearFlatStrategy} from '../public/funding-strategy.js';
import {resolveXraySpec} from '../public/xray.js';

const D = JSON.parse(fs.readFileSync(new URL('../public/data.json', import.meta.url), 'utf8'));
const initial = {...explorerState};
afterEach(() => Object.assign(explorerState, initial));
const compact = html => html.replace(/\s+/g, ' ');
const text = spec => [spec.title, spec.formula, ...(spec.rows || []).flat(), spec.source, spec.caveat].join(' ');

test('single AAA bank 3Y benchmark reconciles the nominal gap with the conditional 14% funding basket', () => {
  const benchmark = D.ventureCapitalChain2027.pcboCleanBenchmark;
  assert.equal(Math.round(benchmark.fscEmpirical26Q2.pcboTril / benchmark.fscEmpirical26Q2.totalVcTril * 1000) / 10, 29.3);
  assert.equal(benchmark.modes.length, 1);
  const mode = benchmark.modes[0];
  const gap = Math.round((mode.normalYieldPct - mode.pcboYieldPct) * 1000) / 10;
  const tax = Math.round(gap * .14 * 1000) / 1000;
  assert.equal(gap,73.7);
  assert.equal(gap,mode.forgoneSpreadBp);
  assert.equal(tax,10.318);
  assert.equal(tax,mode.shadowTax27Bp);
  assert.equal(tax,mode.shadowTax27EokPerTril);
  const html = compact(renderVentureDeepDive(D));
  assert(html.includes('id="pcbo-benchmark-svg"'));
  assert(html.includes('AAA 금융채 3년 · 명목 금리차 비교'));
  assert(html.includes('AAA 은행채 3년'));
  assert(html.includes('4.113%'));
  assert(html.includes(`${gap.toFixed(1)}bp`));
  assert(html.includes(`1,400억 × 0.737%p = ${tax.toFixed(3)}억 / 년`));
  assert(html.includes(`수신 1조당 연 ${tax.toFixed(1)}억 원 차이`));
  assert(!html.includes('data-pcbo-mode'));
  assert(!/NaN|undefined/.test(html));
});

test('venture supply combines labeled observations and scenario demand without publishing model inputs', () => {
  const vc = D.ventureCapitalChain2027;
  for (const field of ['assetRarocBenchmarks', 'targetCoePct', 'opportunityCostLenses', 'preemptiveStrategies']) {
    assert(!Object.hasOwn(vc, field), field);
  }
  assert(!Object.hasOwn(vc.addressableMarket, 'pools'));
  assert.equal(vc.addressableMarket.assetMarketSizes.length, 7);
  assert(resolveXraySpec('kpi:pcbo-clean-bench', D).actions.some(action => action.scrollTo === 'vc-market-sizes'));
  assert.equal(resolveXraySpec('vc-asset:2', D), null);
  const html = compact(renderVentureDeepDive(D));
  for (const part of ['의무가 늘수록', '17.8조 원', '나머지 12.46조', '24.5조 원', '나머지 17.15조',
    '11.6조 원', '신기사·VC 2.3조', '12.62조 원', '분기말 잔액', '누적액', '인정 대상도 넓혀야',
    'https://www.fsc.go.kr/no010101/87831', 'bcIdx=1072576']) {
    assert(html.includes(part), part);
  }
  const table = html.split('<table class="vc-market-table"')[1].split('</table>')[0];
  assert.equal((table.match(/scope="row"/g) || []).length, 7);
  for (const asset of vc.addressableMarket.assetMarketSizes) {
    for (const field of ['name', 'recent', 'recentBasis', 'outlook', 'outlookBasis']) {
      assert(table.includes(asset[field]), asset.name + ' ' + field);
    }
  }
  assert(html.includes('2027~28년 추정'));
  assert(!/신NCR|워터폴|LGD|RAROC|NaN|undefined/.test(html));
  const archivedPath = new URL('../../data/venture_capital_model_inputs.json', import.meta.url);
  if (fs.existsSync(archivedPath)) {
    const archived = JSON.parse(fs.readFileSync(archivedPath, 'utf8'));
    const row = archived.assetRarocBenchmarks.find(asset => asset.id === 'bbb_private');
    assert.equal(Math.round(row.pdPct * row.lgdPct), row.pureElBp);
    assert.equal(row.pureElBp + row.opsCostBp, row.elCostBp);
  }
});

test('bear flattening strategy shows dated spread compression, KIS constraints and conditional choices', () => {
  const html = compact(renderBearFlatStrategy(D));
  for (const part of ['id="funding-bear-strategy"', '+50.2bp', '+11.1bp', '−39.1bp', '2026.2Q 평균',
    '2026-11-13', '업권 발행어음 3개월 이하 비중', '63.4%', '90.3%', '1.10조', '2027.12',
    '단기 조달비용 하락', '고객 잔액 유지', '집행 가능한 적격 자산 확보', '근거 자료와 해석',
    'data-qa-jump="guide-2027-funding-outlook-bear-flattening"']) {
    assert(html.includes(part), part);
  }
  assert.equal(html.match(/class="bf-choice"/g)?.length, 3);
  assert(!/NaN|undefined/.test(html));
  assert(resolveXraySpec('kpi:bear-spread-11bp', D).actions.some(action => action.scrollTo === 'funding-bear-strategy'));
});

test('nominal comparison recalculates fractional bp and annual cost from changed rates rather than stored default labels', () => {
  const changed = structuredClone(D);
  const mode = changed.ventureCapitalChain2027.pcboCleanBenchmark.modes[0];
  mode.normalYieldPct = 5.00;
  // Keep the stored default gap deliberately stale; the diagram derives its values from rates.
  assert.equal(mode.forgoneSpreadBp,73.7);
  assert.equal(mode.shadowTax27EokPerTril,10.318);
  const html = renderVentureDeepDive(changed);
  assert(html.includes('정상 IB 가정 5.00%와 AAA 은행채 3년 4.113%의 명목 금리차 88.7bp'));
  assert(html.includes('1,400억 × 0.887%p = 12.418억 / 년'));
  assert(html.includes('수신 1조당 연 12.4억 원 차이'));
  assert(!html.includes('수신 1조당 연 10.3억 원 차이'));
});

test('all nine compliance rules keep matching inspector evidence and category filters retain their complete partition', () => {
  const reg = D.regulatoryComplianceMatrix2027;
  assert.deepEqual(reg.rules.map(r => r.idx).sort((a,b) => a-b), Array.from({length:9}, (_,i) => i));
  assert.equal(resolveXraySpec('reg-rule:9', D), null);
  for (const row of reg.rules) {
    for (const field of ['promNoteRule', 'imaRule', 'reportingCycle', 'curePeriod', 'penalty', 'statute']) {
      assert.equal(typeof row[field], 'string');
      assert(row[field].trim().length > 5, row.idx + ':' + field);
    }
    const spec = resolveXraySpec('reg-rule:' + row.idx, D);
    assert(spec.title.includes(row.title), row.idx);
    const inspect = text(spec);
    for (const field of ['reportingCycle', 'curePeriod', 'penalty', 'statute']) assert(inspect.includes(row[field]), row.idx + ':' + field);
  }
  for (const category of reg.categories) {
    explorerState.regCategory = category.id;
    const expected = reg.rules.filter(row => category.id === 'all' || row.category === category.id).map(row => row.idx);
    const html = renderRegulatoryCompliancePanel(D);
    const actual = [...html.matchAll(/<tr data-xray="reg-rule:(\d+)"/g)].map(m => Number(m[1]));
    assert.deepEqual(actual, expected, category.id);
  }
  explorerState.regCategory = 'all';
  const html = renderRegulatoryCompliancePanel(D);
  assert(/외화[^<]{0,30}80%/.test(html));
  const liquidity = text(resolveXraySpec('reg-rule:4', D));
  assert(liquidity.includes('80%'));
  assert(liquidity.includes('100%'));
});

test('market costs always include the existing-balance step-up at the AAA bank default and other spreads', () => {
  const total = D.opportunityCost2027.find(row => row.key === 'all');
  const defaults = getOpportunityCostDefaults(D);
  assert.deepEqual(defaults, {basis: 'dart26q3', spread: 150, pcbo: 96.3, cap: 30});
  assert.equal(defaults.spread - defaults.pcbo, D.opportunityCostAssumptions.nominalGapAssumptionBp);
  const scenarios = [
    ['dart26q3', 61.33, 27.67, 11.667, 626.5179, 438.56253],
    ['actual', 58.54, 30.46, 11.946, 641.5002, 449.05014],
    ['model', 57.26, 31.74, 12.074, 648.3738, 453.86166]
  ];
  for (const [basis, base, delta, obligation, cost, after] of scenarios) {
    const result = calcCost(total, {...defaults, basis});
    for (const [key, expected] of Object.entries({base, delta, obligation, cost, after})) {
      assert(Math.abs(result[key] - expected) < 1e-8, basis + ' ' + key);
    }
    assert.deepEqual(calcCost(total, {...defaults, basis, existing: false}), result);
  }
  for (const row of D.opportunityCost2027) {
    const result = calcCost(row, {...defaults, pcbo: 0});
    assert(Math.abs(result.obligation - row.vcTotalAddTril) < 1e-8, row.key);
    assert(Math.abs(result.cost - row.oppCostTotalAdd150bpEok) < 1e-8, row.key);
  }
});
