import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {computeNim, renderNim} from '../public/nim.js';

const data = JSON.parse(fs.readFileSync(new URL('../public/data.json', import.meta.url), 'utf8'));
const close = (actual, expected) => assert(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);

test('Meritz IR average funds income while year-end target funds the market forecast', () => {
  const result = computeNim(data);
  const meritz = result.rows.find(row => row.key === 'meritz');
  assert.equal(meritz.note, 4);
  assert.equal(meritz.noteIncomeBase, 2);
  assert.equal(meritz.noteIncomeBasis, 'average-target');
  assert.equal(meritz.noteIncome, 300);
  assert.equal(result.rows.length, 9);
  assert(!result.rows.some(row => row.key === 'potential'));
  assert.equal(result.rows.find(row => row.key === 'samsung').note, 4);
  close(result.totals.note, 84);
  close(result.totals.noteIncomeBase, 80);
  close(result.totals.ima, 5);
  close(result.totals.noteIncome, 12000);
  close(result.totals.imaIncome, 600);
  close(result.totals.total, 12600);
});

test('2026.3Q OpenDART snapshots remain distinct and do not inherit the 2027 Meritz average target', () => {
  const result = computeNim(data, {period:'2026'});
  close(result.totals.note, 57.24);
  close(result.totals.noteIncomeBase, 57.24);
  close(result.totals.ima, 4.10);
  close(result.totals.total, 9078);
  const meritz = result.rows.find(row => row.key === 'meritz');
  assert.equal(meritz.note, 0);
  assert.equal(meritz.noteIncomeBase, 0);
  assert.equal(meritz.noteIncome, 0);
  assert.equal(meritz.noteIncomeBasis, 'snapshot-proxy');
});

test('company NIM overrides keep average and year-end balances distinct', () => {
  const baseline = computeNim(data, {noteBp:100, imaBp:0});
  close(baseline.totals.total, 8000);
  const changed = computeNim(data, {noteBp:100, imaBp:0, companyBp:{meritz:250}});
  close(changed.rows.find(row => row.key === 'meritz').noteIncome, 500);
  close(changed.totals.total, 8300);
  close(changed.totals.note, 84);
  close(changed.totals.noteIncomeBase, 80);
  const altered = structuredClone(data);
  altered.fundingForecast2027.companies.find(row => row.key === 'meritz').promNoteAverageTril = 1.5;
  close(computeNim(altered, {noteBp:100, imaBp:0}).rows.find(row => row.key === 'meritz').noteIncome, 150);
});

test('forecast and opportunity-cost assumptions replace the old combined allocation once', () => {
  const rows = data.opportunityCost2027;
  assert(!rows.some(row => row.key === 'potential'));
  close(rows.filter(row => row.key !== 'all').reduce((sum,row) => sum + row.q27Est, 0), 89);
  const meritz = rows.find(row => row.key === 'meritz');
  close(meritz.q27Est, 4);
  close(meritz.q27AveragePromNoteTril, 2);
  close(meritz.vcNew20Tril, .8);
  close(meritz.oppCostNew150bpEok, 120);
  const total = rows.find(row => row.key === 'all');
  close(total.q27Est - total.q26Base, 27.67);
  close(total.q27Est - total.fisis2606Exact, 30.46);
  close(total.q27Est - total.model26Q2Legacy, 31.74);
  close(total.oppCostNew150bpEok, 830.1);
  close(total.oppCostNewAfter30CapEok, 581.07);
  close(data.globalKpis.promNoteIma27EstTril, 89);
  close(data.promNoteImaTrend.at(-1).total, 89);
  assert.equal(data.fundingForecast2027.originalModel.totalTril, 83);
  assert.equal(data.fundingForecast2027.source.url, null);
});

test('NIM presentation identifies the income basis and the source limitation', () => {
  const html = renderNim(data);
  assert(html.includes('어음 수익 계산잔액'));
  assert(html.includes('data-nim-base="meritz">2.00'));
  assert(html.includes('data-nim-note="meritz">4.00'));
  assert(html.includes('IR 평잔 목표'));
  assert(html.includes('IR 원문 링크는 별도 확인 전'));
  assert(html.includes('메리츠와 같게 둔 가정입니다'));
});
