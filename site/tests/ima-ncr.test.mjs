import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {computeImaOldNcr,renderImaOldNcr,getImaNcrScenario} from '../public/ima-ncr.js';
import {renderDetail} from '../public/details.js';

const close = (a,b) => assert(Math.abs(a-b)<1e-9,`${a} != ${b}`);

test('old NCR compares the 5% numerator reduction and 50% asset-risk denominator reduction together', () => {
  const scenario = computeImaOldNcr();
  assert(scenario.valid);
  close(scenario.reserve,.05);
  close(scenario.riskSaved,.05);
  close(scenario.notePct,8/4.1*100);
  close(scenario.imaPct,7.95/4.05*100);
  close(scenario.imaFullRiskPct,7.95/4.1*100);
  close(scenario.differencePp,1.1743450767841);
  close(scenario.newNcrCapitalGain,0);
  assert.equal(scenario.reliefEligibility,'conditional');
});

test('old-NCR crossover depends on the portfolio and is not a universal 10% threshold', () => {
  const baseline = computeImaOldNcr();
  close(baseline.crossingPct,5.063291139240507);
  close(computeImaOldNcr({riskPct:baseline.crossingPct}).differencePp,0);
  assert(computeImaOldNcr({riskPct:2}).differencePp<0);
  const high = computeImaOldNcr({riskPct:20});
  close(high.newNcrCapitalGain*10000,500);
  close(high.notePct,190.47619047619048);
  close(high.imaPct,193.90243902439025);
  assert(high.differencePp>0);
  assert(computeImaOldNcr({existingRisk:6}).crossingPct>baseline.crossingPct);
  assert.notEqual(baseline.crossingPct,10);
});

test('zero asset risk leaves only the assumed numerator cost', () => {
  const scenario = computeImaOldNcr({riskPct:0});
  close(scenario.notePct,200);
  close(scenario.imaPct,198.75);
  close(scenario.riskSaved,0);
  close(scenario.newNcrCapitalGain,-.05);
  assert(scenario.differencePp<0);
});

test('zero acquisition is a valid unchanged portfolio without a fictional crossover', () => {
  const scenario = computeImaOldNcr({amount:0});
  close(scenario.notePct,200);
  close(scenario.imaPct,200);
  close(scenario.differencePp,0);
  close(scenario.newNcrCapitalGain,0);
  assert.equal(scenario.crossingPct,null);
});

test('portfolios with no positive crossover do not divide by zero or invent a positive benefit', () => {
  for (const amount of [10,12]) {
    const scenario = computeImaOldNcr({capital:1,existingRisk:1,amount,riskPct:40});
    assert(scenario.valid);
    assert.equal(scenario.crossingPct,null);
    assert(scenario.differencePp<0);
  }
});

test('150% is strict, with closed-IMA exceptions, no automatic eligibility approval and the equity cap explicit', () => {
  const scenario = computeImaOldNcr({capital:6.05,existingRisk:4,amount:1,riskPct:0});
  close(scenario.imaPct,150);
  assert.equal(scenario.above150,false);
  assert.equal(scenario.reliefEligibility,'conditional');
  const html = renderImaOldNcr({capital:6.05,existingRisk:4,amount:1,riskPct:0});
  assert(html.includes('유지 예외'));
  assert(html.includes('신규 납입 시 감경 요건'));
  assert(html.includes('5% 전액만큼 영업용순자본이 감소한다고 둔 보수적 비교'));
  assert(html.includes('이미 감소한 영업용순자본을 넣으면 중복 차감'));
  assert(html.includes('자기자본의 100%를 초과'));
  assert(html.includes('E로 한도 충족을 판정하지 않습니다'));
});

test('invalid inputs and an exhausted numerator return a clear error without infinite ratios', () => {
  for (const input of [{capital:0},{existingRisk:0},{amount:-1},{riskPct:-1},{capital:NaN},{capital:Infinity},{capital:.05,amount:1},{capital:1e308,existingRisk:1e-308}]) {
    const scenario = computeImaOldNcr(input);
    assert.equal(scenario.valid,false,JSON.stringify(input));
    assert(scenario.error);
    assert(!Object.values(scenario).some(value=>typeof value==='number'&&!Number.isFinite(value)));
  }
});

test('maturity view places the two old-NCR curves after the timeline with source and question links', () => {
  const data = JSON.parse(fs.readFileSync(new URL('../public/data.json',import.meta.url),'utf8'));
  const html = renderDetail('ima-maturity',data);
  assert(html.indexOf('초기 IMA 4개 회차 · 만기 타임라인')<html.indexOf('id="ima-old-ncr-panel"'));
  assert(html.indexOf('id="ima-old-ncr-panel"')<html.indexOf('발행어음과 IMA, 어떤 점이 다를까?'));
  assert(html.includes('?q=guide-ima-old-ncr-capital#questions'));
  assert(html.includes('data-xray="ima-old-ncr"'));
  assert(html.includes('aria-labelledby="ima-ncr-chart-title ima-ncr-chart-desc"'));
  assert(html.includes('구NCR에서도 위험액 50% 감경을 반영하는 비교'));
  assert(html.includes('https://www.fsc.go.kr/no010101/84322'));
  assert(!html.includes('구NCR 분모에는 위 50% 특례를 넣지 않았습니다'));
  assert(!html.includes('50% 감경은 신NCR의 특례입니다'));
  assert(!html.includes('type="checkbox"'));
  close(getImaNcrScenario().imaPct,computeImaOldNcr().imaPct);
});

test('current-input helper supplies the X-Ray with exactly the active numeric scenario', () => {
  const values = {capital:'10',existingRisk:'5',amount:'2',riskPct:'25'};
  const panel = {querySelectorAll:()=>Object.entries(values).map(([key,value])=>({dataset:{ncrInput:key},value}))};
  const root = {querySelector:()=>panel};
  const active = getImaNcrScenario(root);
  const expected = computeImaOldNcr({capital:10,existingRisk:5,amount:2,riskPct:25});
  close(active.imaPct,expected.imaPct);
  close(active.reserve,.1);
  close(active.newNcrCapitalGain,.15);
  close(active.crossingPct,5.1020408163265305);
  values.capital='';
  assert.equal(getImaNcrScenario(root).valid,false);
});
