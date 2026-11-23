import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {explorerState, getSamsungScenario, setSamsungScenario} from '../public/curiosity.js';
import {computeNim, getNimScenario, renderNim} from '../public/nim.js';
import {resolveXraySpec} from '../public/xray.js';

const D = JSON.parse(fs.readFileSync(new URL('../public/data.json', import.meta.url), 'utf8'));
const baseline = JSON.stringify(D);
const close = (actual, expected) => assert(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);

test('the 85T forecast excludes a separate Samsung target and preserves the Meritz IR average', () => {
  const result = computeNim(D);
  const samsung = result.rows.find(row => row.key === 'samsung');
  const meritz = result.rows.find(row => row.key === 'meritz');
  assert.equal(samsung.note, 0);
  assert.equal(samsung.noteIncomeBase, 0);
  assert.equal(samsung.noteIncome, 0);
  assert.equal(meritz.note, 4);
  assert.equal(meritz.noteIncomeBase, 2);
  assert.equal(meritz.noteIncome, 300);
  close(result.totals.note, 80);
  close(result.totals.noteIncomeBase, 78);
  close(result.totals.note + result.totals.ima, 85);
  close(result.totals.total, 12300);
  assert.equal(JSON.stringify(D), baseline);
});

test('Samsung presets update NIM and X-Ray consistently without changing the saved baseline', () => {
  const base = computeNim(D);
  const presets = D.fundingForecast2027.samsungMediaCheck2026.scenarioPresets;
  assert.deepEqual(presets.map(preset => preset.yearEndTril), [0, 2, 3, 4]);
  try {
    for (const preset of presets) {
      setSamsungScenario(preset.id);
      const live = getNimScenario(D);
      const samsung = live.rows.find(row => row.key === 'samsung');
      assert.equal(samsung.note, preset.yearEndTril);
      assert.equal(samsung.noteIncomeBase, preset.avgTril);
      close(samsung.noteIncome, preset.avgTril * 150);
      close(live.totals.total, 12300 + preset.avgTril * 150);
      const spec = resolveXraySpec('nim-firm:samsung', D);
      assert(spec.formula.includes(`수익시나리오(${Math.round(samsung.noteIncome)}억)`));
      assert(renderNim(D).includes(`data-nim-ss="${preset.id}"`));
      assert.deepEqual(computeNim(D), base);
    }
    setSamsungScenario('custom', 100, 101);
    const custom = getSamsungScenario(D);
    assert.equal(custom.yearEndTril, 16.32);
    assert.equal(custom.avgTril, 16.32);
  } finally {
    setSamsungScenario('base0');
    explorerState.samsungCustomNoteTril = 3;
    explorerState.samsungCustomAvgTril = 1.8;
  }
  assert.deepEqual(getNimScenario(D), base);
  assert.equal(JSON.stringify(D), baseline);
});

test('the 2026.3Q snapshot includes Samsung’s first issuance and ignores 2027 scenario balances', () => {
  const historical = computeNim(D, {period:'2026', samsungNoteTril:4, samsungAvgTril:2});
  close(historical.totals.note, 57.24);
  close(historical.totals.ima, D.promNoteDart202609.reduce((sum,row) => sum + row.imaLiabTril, 0));
  close(historical.totals.total, 9078);
  assert.equal(historical.rows.find(row => row.key === 'samsung').noteIncome, 36);
  assert.equal(historical.rows.find(row => row.key === 'meritz').noteIncome, 0);
  const modified = computeNim(D, {noteBp:100, imaBp:0, companyBp:{samsung:250}, samsungNoteTril:4, samsungAvgTril:2});
  close(modified.rows.find(row => row.key === 'samsung').noteIncome, 500);
  close(modified.totals.total, 8300);
  assert.equal(JSON.stringify(D), baseline);
});

test('the nine-firm forecast and cost table reconcile the 2026.3Q market baseline and new funding', () => {
  close(D.ib9FirmsCuriosityChain.reduce((sum,row) => sum + row.est27ModelNoteTril + row.est27ModelImaTril, 0), 85);
  close(D.opportunityCost2027.filter(row => row.key !== 'all').reduce((sum,row) => sum + row.q27Est, 0), 85);
  const total = D.opportunityCost2027.find(row => row.key === 'all');
  close(total.q26Base, 61.33);
  close(total.q27Est - total.q26Base, 23.67);
  close(total.vcNew20Tril, 4.734);
  close(total.vcTotalAddTril, total.vcNew20Tril + total.q26Base * .1);
  close(total.oppCostNew150bpEok, 710.1);
  close(total.oppCostNewAfter30CapEok, 497.07);
});

test('2027 demand follows the 85T forecast and the 2028 scenario remains 98T', () => {
  const rows = D.ventureCapitalChain2027.addressableMarket.demandSchedule;
  const year27 = rows.find(row => row.period.startsWith('2027'));
  close(year27.totalFundingTril, 85);
  close(year27.totalMandateTril, 17);
  close(year27.aCapTril, 5.1);
  close(year27.nonACapNetTril, 11.9);
  const year28 = rows.find(row => row.period.startsWith('2028'));
  close(year28.totalFundingTril, 98);
  close(year28.totalMandateTril, 24.5);
  close(year28.nonACapNetTril, 17.15);
});
