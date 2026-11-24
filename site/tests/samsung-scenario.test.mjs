import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {calcCost, renderFundingBreakdownPanel} from '../public/curiosity.js';
import {computeNim, getNimScenario, renderNim} from '../public/nim.js';
import {resolveXraySpec} from '../public/xray.js';

const D = JSON.parse(fs.readFileSync(new URL('../public/data.json', import.meta.url), 'utf8'));
const baseline = JSON.stringify(D);
const close = (actual, expected) => assert(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);

test('Samsung and Meritz use the same year-end and average balances with distinct provenance', () => {
  const result = getNimScenario(D);
  const samsung = result.rows.find(row => row.key === 'samsung');
  const meritz = result.rows.find(row => row.key === 'meritz');
  for (const row of [samsung, meritz]) {
    assert.equal(row.note, 4);
    assert.equal(row.noteIncomeBase, 2);
    assert.equal(row.noteIncome, 300);
  }
  assert.equal(samsung.noteIncomeBasis, 'average-assumption');
  assert.equal(meritz.noteIncomeBasis, 'average-target');
  close(result.totals.note, 84);
  close(result.totals.noteIncomeBase, 80);
  close(result.totals.note + result.totals.ima, 89);
  close(result.totals.total, 12600);
  assert.equal(JSON.stringify(D), baseline);
});

test('the fixed funding assumption reaches NIM and the X-Ray without Samsung selectors', () => {
  assert.doesNotMatch(renderNim(D) + renderFundingBreakdownPanel(D), /data-nim-ss|data-ss-preset|ss-custom|samsung-media-sim-box/);
  assert(!Object.hasOwn(D.fundingForecast2027.samsungMediaCheck2026, 'scenarioPresets'));
  const spec = resolveXraySpec('nim-firm:samsung', D);
  assert.match(spec.formula, /수익시나리오\(300억\)/);
  assert(spec.rows.some(([label,value]) => label.includes('연말 전망') && value.includes('0.24조 → 4.00조') && value.includes('+3.76조')));
  assert(spec.rows.some(([label,value]) => label.includes('수익 계산용') && value.includes('2.00조')));
  const market = resolveXraySpec('kpi:forecast-85', D);
  assert.match(market.formula, /84\.00조.*5\.00조.*89\.00조/);
});

test('Samsung forecast and NIM overrides preserve the first 2026 issuance', () => {
  const actual = computeNim(D, {period:'2026'});
  close(actual.totals.note, 57.24);
  close(actual.totals.total, 9078);
  assert.equal(actual.rows.find(row => row.key === 'samsung').note, .24);
  assert.equal(actual.rows.find(row => row.key === 'samsung').noteIncome, 36);
  const adjusted = computeNim(D, {noteBp:100, imaBp:0, companyBp:{samsung:250}});
  close(adjusted.rows.find(row => row.key === 'samsung').noteIncome, 500);
  close(adjusted.totals.total, 8300);
  assert.equal(JSON.stringify(D), baseline);
});

test('the 89T forecast reconciles the 9 company totals and 2026.3Q costs', () => {
  close(D.ib9FirmsCuriosityChain.reduce((sum,row) => sum + row.est27ModelNoteTril + row.est27ModelImaTril, 0), 89);
  close(D.opportunityCost2027.filter(row => row.key !== 'all').reduce((sum,row) => sum + row.q27Est, 0), 89);
  const samsung = calcCost(D.opportunityCost2027.find(row => row.key === 'samsung'));
  close(samsung.delta, 3.76);
  close(samsung.obligation, .776);
  close(samsung.cost, 116.4);
  const total = calcCost(D.opportunityCost2027.find(row => row.key === 'all'));
  close(total.base, 61.33);
  close(total.delta, 27.67);
  close(total.obligation, 11.667);
  close(total.cost, 1750.05);
  close(total.after, 1225.035);
});

test('2027 demand follows the 89T forecast and the 2028 scenario remains 98T', () => {
  const schedule = D.ventureCapitalChain2027.addressableMarket.demandSchedule;
  const y27 = schedule.find(row => row.period.startsWith('2027'));
  close(y27.totalFundingTril, 89);
  close(y27.totalMandateTril, 17.8);
  close(y27.aCapTril, 5.34);
  close(y27.nonACapNetTril, 12.46);
  const y28 = schedule.find(row => row.period.startsWith('2028'));
  close(y28.totalFundingTril, 98);
  close(y28.totalMandateTril, 24.5);
  close(y28.nonACapNetTril, 17.15);
});
