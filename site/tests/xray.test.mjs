import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {computeNim} from '../public/nim.js';
import {resolveXraySpec} from '../public/xray.js';
const D = JSON.parse(fs.readFileSync(new URL('../public/data.json', import.meta.url), 'utf8'));
const rowsText = spec => spec.rows.map(row => row.join(' ')).join('\n');

test('company X-Ray uses the selected NIM scenario and distinguishes its income basis from the 2027 cost basis', () => {
  const scenario = computeNim(D, {period:'2027', companyBp:{meritz:250}, imaBp:180});
  const spec = resolveXraySpec('nim-firm:meritz', D, {nimScenario:scenario});
  assert(spec.formula.includes('수익시나리오(500억)'));
  assert(spec.formula.includes('2.00조 × 250bp'));
  assert(rowsText(spec).includes('메리츠 IR 평잔 목표 적용'));
  assert(rowsText(spec).includes('어음 잔액 4.00조'));
  assert(spec.caveat.includes('2027년 말 증가분·150bp'));
  assert(spec.caveat.includes('중복 차감하지 않습니다'));
});

test('2026 company X-Ray follows the actual snapshot and does not carry the later Meritz average target into income', () => {
  const scenario = computeNim(D, {period:'2026', companyBp:{meritz:250}});
  const spec = resolveXraySpec('nim-firm:meritz', D, {nimScenario:scenario});
  assert(spec.formula.includes('2026.2Q 제공 잔액 수익시나리오(0억)'));
  assert(spec.formula.includes('0.00조 × 250bp'));
  assert(rowsText(spec).includes('2026.2Q 잔액의 평잔 대용치'));
  assert(!rowsText(spec).includes('메리츠 IR 평잔 목표 적용'));
  assert(rowsText(spec).includes('2027E 연말 전망'));
});

test('all 9 company X-Rays match their calculator row under alternate common NIM and IMA rates', () => {
  const scenario = computeNim(D, {period:'2027', noteBp:200, imaBp:180});
  for (const row of scenario.rows) {
    const spec = resolveXraySpec('firm:'+row.key, D, {nimScenario:scenario});
    assert(spec);
    assert(spec.formula.includes('수익시나리오('+Number(row.total).toLocaleString('ko-KR', {maximumFractionDigits:0})+'억)'), row.key);
    assert(spec.formula.includes('200bp'), row.key);
    assert(spec.formula.includes('180bp'), row.key);
    assert(spec.actions.every(action => action.firmKey === row.key), row.key);
  }
});

test('initial company X-Ray preserves the 150bp and 120bp baseline while unknown keys remain absent', () => {
  const meritz = resolveXraySpec('nim-firm:meritz', D);
  assert(meritz.formula.includes('수익시나리오(300억)'));
  assert(meritz.formula.includes('150bp'));
  assert(meritz.formula.includes('120bp'));
  assert.equal(resolveXraySpec('nim-firm:unknown', D), null);
});


test('household financial X-Ray derives all category values and shares from the current dataset', () => {
  const custom = structuredClone(D);
  const categories = custom.householdWealthAndIntl2026.krFinCategories26Q2;
  const bonds = categories.find(category => category.id === 'bonds');
  const other = categories.find(category => category.id === 'other');
  bonds.amount26Q2Tril += 10;
  other.amount26Q2Tril -= 10;
  bonds.share26Q2Pct = 2.7;
  other.share26Q2Pct = 0.6;
  const spec = resolveXraySpec('kpi:hw-kr-fin', custom);
  const text = rowsText(spec);
  assert(spec.title.includes('6,930.21조'));
  assert(spec.formula.includes('188.94조'));
  assert(spec.formula.includes('39.08조'));
  assert(text.includes('188.94조') && text.includes('(2.7%)'));
  assert(text.includes('39.08조') && text.includes('(0.6%)'));
  assert(!spec.formula.includes('182.9') && !spec.formula.includes('45.1'));
  assert(Math.abs(categories.reduce((sum, category) => sum + category.amount26Q2Tril, 0) - 6930.21) < 1e-8);
});
