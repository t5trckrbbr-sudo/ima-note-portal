import test, {afterEach} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {explorerState, getSamsungScenario, setSamsungScenario} from '../public/curiosity.js';
import {computeNim, getNimScenario} from '../public/nim.js';
import {resolveXraySpec} from '../public/xray.js';

const D = JSON.parse(fs.readFileSync(new URL('../public/data.json', import.meta.url), 'utf8'));
const original = JSON.stringify(D);
const presets = D.fundingForecast2027.samsungMediaCheck2026.scenarioPresets;
const samsung = scenario => scenario.rows.find(row => row.key === 'samsung');
const meritz = scenario => scenario.rows.find(row => row.key === 'meritz');
afterEach(() => {
  setSamsungScenario('base0');
  explorerState.samsungCustomNoteTril = 3;
  explorerState.samsungCustomAvgTril = 1.8;
  assert.equal(JSON.stringify(D), original, 'interactive assumptions must not rewrite the supplied baseline');
});

test('Samsung baseline remains an unallocated zero within the 85T forecast and the pure NIM contract', () => {
  setSamsungScenario('base0');
  assert.equal(D.globalKpis.promNoteIma27EstTril, 85);
  assert.equal(D.fundingForecast2027.companies.find(row => row.key === 'samsung').promNoteYearEndTril, 0);
  const base = computeNim(D);
  assert.equal(base.totals.note + base.totals.ima, 85);
  assert.equal(base.totals.total, 12300);
  assert.equal(samsung(base).note, 0);
  assert.equal(samsung(base).noteIncome, 0);
  assert.equal(meritz(base).note, 4);
  assert.equal(meritz(base).noteIncomeBase, 2);
  assert.equal(meritz(base).noteIncome, 300);
  setSamsungScenario('peer4');
  assert.deepEqual(computeNim(D), base, 'a shared interactive override must not alter the default pure computation');
});

test('all four Samsung presets distinguish end balance from average income and reach live X-Ray consistently', () => {
  assert.deepEqual(presets.map(p => p.yearEndTril), [0, 2, 3, 4]);
  for (const preset of presets) {
    setSamsungScenario(preset.id);
    const ss = getSamsungScenario(D), scenario = getNimScenario(D), row = samsung(scenario);
    assert.equal(ss.yearEndTril, preset.yearEndTril);
    assert.equal(ss.avgTril, preset.avgTril);
    assert.equal(row.note, preset.yearEndTril);
    assert.equal(row.noteIncomeBase, preset.avgTril);
    assert.equal(row.noteIncome, preset.avgTril * 150);
    assert.equal(scenario.totals.note + scenario.totals.ima, 85 + preset.yearEndTril);
    assert.equal(scenario.totals.total, 12300 + preset.avgTril * 150);
    const spec = resolveXraySpec('nim-firm:samsung', D);
    assert(spec.formula.includes(`수익시나리오(${Math.round(row.noteIncome)}억)`));
    assert(spec.rows.some(([label, value]) => label.includes('연말 전망') && value.includes(preset.yearEndTril.toFixed(2) + '조')));
    assert.equal(meritz(scenario).noteIncome, 300);
  }
});

test('custom Samsung balances are bounded by the license limit and the average cannot exceed the year-end assumption', () => {
  for (const [end, avg, expectedEnd, expectedAvg] of [[5, 2.7, 5, 2.7], [-2, -1, 0, 0], [100, 100, 16.32, 16.32], [3, 9, 3, 3], [2, null, 2, 1.2]]) {
    setSamsungScenario('custom', end, avg);
    const ss = getSamsungScenario(D), row = samsung(getNimScenario(D));
    assert.equal(ss.yearEndTril, expectedEnd);
    assert.equal(ss.avgTril, expectedAvg);
    assert.equal(row.note, expectedEnd);
    assert.equal(row.noteIncomeBase, expectedAvg);
    assert.equal(row.noteIncome, expectedAvg * 150);
  }
  setSamsungScenario('custom', Infinity, NaN);
  let ss = getSamsungScenario(D);
  assert(Number.isFinite(ss.yearEndTril));
  assert(Number.isFinite(ss.avgTril));
  assert(ss.avgTril >= 0 && ss.avgTril <= ss.yearEndTril);
  explorerState.samsungCustomNoteTril = NaN;
  explorerState.samsungCustomAvgTril = Infinity;
  ss = getSamsungScenario(D);
  assert.equal(ss.yearEndTril, 0);
  assert.equal(ss.avgTril, 0);
});

test('explicit X-Ray income scenarios preserve the shared Samsung forecast and cost assumption', () => {
  setSamsungScenario('peer4');
  const ss = getSamsungScenario(D);
  const income = computeNim(D, {period:'2027', samsungNoteTril:ss.yearEndTril, samsungAvgTril:ss.avgTril});
  const live = resolveXraySpec('nim-firm:samsung', D);
  const explicit = resolveXraySpec('nim-firm:samsung', D, {nimScenario:income});
  assert.deepEqual(explicit.rows, live.rows);
  assert.equal(explicit.formula, live.formula);
  assert(explicit.formula.includes('상한활용 84억'));
  const actual = computeNim(D, {period:'2026'});
  const historical = resolveXraySpec('nim-firm:samsung', D, {nimScenario:actual});
  assert(historical.formula.includes('2026.2Q 제공 잔액 수익시나리오(0억)'));
  assert(historical.formula.includes('2027E 기회비용(상한활용 84억)'));
  assert(historical.rows.some(([label, value]) => label.includes('연말 전망') && value.includes('4.00조')));
});

test('a 2027 Samsung override cannot leak into the 2026 snapshot and resetting returns to 85T', () => {
  setSamsungScenario('peer4');
  const ss = getSamsungScenario(D);
  const actual = computeNim(D, {period:'2026', samsungNoteTril:ss.yearEndTril, samsungAvgTril:ss.avgTril});
  assert.equal(actual.totals.note, 55.94);
  assert.equal(actual.totals.ima, 2.6);
  assert.equal(actual.totals.total, 8703);
  assert.equal(samsung(actual).noteIncome, 0);
  assert.equal(meritz(actual).noteIncome, 0);
  setSamsungScenario('base0');
  const reset = getNimScenario(D);
  assert.equal(reset.totals.note + reset.totals.ima, 85);
  assert.equal(reset.totals.total, 12300);
  assert.equal(samsung(reset).noteIncome, 0);
});
