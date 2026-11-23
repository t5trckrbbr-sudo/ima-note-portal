import test, {afterEach} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {calcCost, explorerState, renderVentureDeepDive, renderRegulatoryCompliancePanel} from '../public/curiosity.js';
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

test('waterfall preserves loss, screening cost and vehicle-specific capital arithmetic for each selected asset', () => {
  const vc = D.ventureCapitalChain2027;
  const base = vc.assetRarocBenchmarks[0];
  for (const row of vc.assetRarocBenchmarks.filter(r => ['bbb_private', 'vc_mezz', 'a_cap_debt'].includes(r.id))) {
    assert.equal(Math.round(row.pdPct * row.lgdPct), row.pureElBp);
    assert.equal(row.pureElBp + row.opsCostBp, row.elCostBp);
    for (const vehicle of ['note', 'ima']) {
      const capital = vehicle === 'ima' ? row.capCostImaBp : row.capCostNoteBp;
      const eva = vehicle === 'ima' ? row.evaImaBp : row.evaNoteBp;
      const baseEva = vehicle === 'ima' ? base.evaImaBp : base.evaNoteBp;
      assert.equal(row.grossSpreadBp - row.elCostBp - capital, eva);
      explorerState.vcWaterfallAsset = row.id;
      explorerState.vcVehicle = vehicle;
      const html = renderVentureDeepDive(D);
      assert(html.includes(`명목마진 +${row.grossSpreadBp}bp에서 EL·원가 −${row.elCostBp}bp, 자본비용 −${capital}bp 차감 후 순EVA +${eva}bp`), row.id + '/' + vehicle);
      assert(html.includes(`실질 기회비용 ${baseEva - eva}bp`), row.id + '/' + vehicle);
      assert(html.includes(`순수EL ${row.pureElBp} + 원가 ${row.opsCostBp}`));
    }
  }
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

test('market costs always include the existing-balance step-up for each selectable baseline', () => {
  const total = D.opportunityCost2027.find(row => row.key === 'all');
  const scenarios = [
    ['dart26q3', 61.33, 23.67, 10.867, 1630.05, 1141.035],
    ['actual', 58.54, 26.46, 11.146, 1671.9, 1170.33],
    ['model', 57.26, 27.74, 11.274, 1691.1, 1183.77]
  ];
  for (const [basis, base, delta, obligation, cost, after] of scenarios) {
    const result = calcCost(total, {basis});
    for (const [key, expected] of Object.entries({base, delta, obligation, cost, after})) {
      assert(Math.abs(result[key] - expected) < 1e-8, basis + ' ' + key);
    }
    assert.deepEqual(calcCost(total, {basis, existing: false}), result);
  }
  for (const row of D.opportunityCost2027) {
    const result = calcCost(row);
    assert(Math.abs(result.obligation - row.vcTotalAddTril) < 1e-8, row.key);
    assert(Math.abs(result.cost - row.oppCostTotalAdd150bpEok) < 1e-8, row.key);
  }
});
