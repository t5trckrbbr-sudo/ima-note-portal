import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {computeNim, getNimScenario, renderNim} from '../public/nim.js';

const D = JSON.parse(fs.readFileSync(new URL('../public/data.json', import.meta.url), 'utf8'));
const baseline = JSON.stringify(D);
const close = (actual, expected) => assert(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);

test('Samsung uses the same fixed year-end and average balance as Meritz without treating it as a published company target', () => {
  const result = computeNim(D);
  for (const key of ['samsung','meritz']) {
    const row = result.rows.find(row => row.key === key);
    assert.equal(row.note, 4);
    assert.equal(row.noteIncomeBase, 2);
    assert.equal(row.noteIncome, 300);
  }
  assert.equal(result.rows.find(row => row.key === 'samsung').noteIncomeBasis, 'average-assumption');
  assert.equal(D.fundingForecast2027.samsungAssumption.companyPublishedTarget, false);
  assert.equal(D.fundingForecast2027.samsungMediaCheck2026.scenarioPresets, undefined);
  close(result.totals.note, 84);
  close(result.totals.noteIncomeBase, 80);
  close(result.totals.note + result.totals.ima, 89);
  close(result.totals.total, 12600);
  assert.equal(JSON.stringify(D), baseline);
});

test('retired Samsung override options cannot restore hidden presets or change the fixed forecast', () => {
  const result = computeNim(D);
  for (const [end, average] of [[0,0], [2,1.2], [4,2.2], [16.32,16.32], [-2,-1]]) {
    assert.deepEqual(computeNim(D, {samsungNoteTril:end, samsungAvgTril:average}), result);
  }
  assert.deepEqual(getNimScenario(D), result);
  const html = renderNim(D);
  assert(!html.includes('data-nim-ss'));
  assert(!html.includes('nim-ss-bar'));
  assert(html.includes('data-nim-note="samsung">4.00'));
  assert(html.includes('data-nim-base="samsung">2.00'));
  assert(html.includes('사용자 가정 평잔'));
});

test('2026 snapshots stay unchanged while fixed average balances follow company-specific NIM inputs', () => {
  const historical = computeNim(D, {period:'2026', samsungNoteTril:4, samsungAvgTril:2});
  close(historical.totals.note, 55.94);
  close(historical.totals.ima, 2.6);
  close(historical.totals.total, 8703);
  for (const key of ['samsung','meritz']) assert.equal(historical.rows.find(row => row.key === key).noteIncome, 0);
  const modified = computeNim(D, {noteBp:100, imaBp:0, companyBp:{samsung:250}});
  close(modified.rows.find(row => row.key === 'samsung').noteIncome, 500);
  close(modified.totals.total, 8300);
  assert.equal(JSON.stringify(D), baseline);
});

test('fixed forecast is reconciled across the nine-company chain and mandatory existing-balance cost fields', () => {
  close(D.ib9FirmsCuriosityChain.reduce((sum,row) => sum + row.est27ModelNoteTril + row.est27ModelImaTril, 0), 89);
  close(D.opportunityCost2027.filter(row => row.key !== 'all').reduce((sum,row) => sum + row.q27Est, 0), 89);
  for (const row of D.opportunityCost2027) {
    close(row.vcNew20Tril, (row.q27Est - row.q26Base) * .2);
    close(row.vcTotalAddTril, row.vcNew20Tril + row.q26Base * .1);
    close(row.oppCostTotalAdd150bpEok, row.vcTotalAddTril * 150);
    close(row.oppCostTotalAddAfter30CapEok, row.oppCostTotalAdd150bpEok * .7);
  }
  const total = D.opportunityCost2027.find(row => row.key === 'all');
  close(total.vcTotalAddTril, 12.074);
  close(total.oppCostTotalAdd150bpEok, 1811.1);
  close(total.oppCostTotalAddAfter30CapEok, 1267.77);
  assert.equal(D.opportunityCostAssumptions.includeExistingBalanceStepUp, true);
});

test('2027 demand follows the new 89T baseline while the separate 2028 forecast remains 98T', () => {
  const rows = D.ventureCapitalChain2027.addressableMarket.demandSchedule;
  const year27 = rows.find(row => row.period.startsWith('2027'));
  close(year27.totalFundingTril, 89);
  close(year27.totalMandateTril, 17.8);
  close(year27.aCapTril, 5.34);
  close(year27.nonACapNetTril, 12.46);
  const year28 = rows.find(row => row.period.startsWith('2028'));
  close(year28.totalFundingTril, 98);
  close(year28.totalMandateTril, 24.5);
  close(year28.nonACapNetTril, 17.15);
});
