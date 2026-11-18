import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  explorerState,
  setExplorerFirmByName,
  renderFundingBreakdownPanel,
  renderMoneyMoveSafetyPanel,
  renderIbSynchronizedExplorer,
  renderVentureDeepDive,
  renderHouseholdWealthPage
} from '../public/curiosity.js';

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
      assert(vcHtml.includes('모험자본 취득에 따른 기회비용'));
      assert(vcHtml.includes('선제적 확보를 통한 경쟁자 견제 타당성'));
      assert(vcHtml.includes('인정 자산군별 현재 규모 vs 잠재 시장규모'));
      assert(!vcHtml.includes('NaN'));
      assert(!vcHtml.includes('undefined'));
    }
  }
});

test('household wealth & 5-country comparison module renders all categories, series modes, corporate S11, SHF quintiles, and 5 countries cleanly', () => {
  const hw = D.householdWealthAndIntl2026;
  assert.ok(hw);
  assert.equal(hw.headlineKpis.krTotalHouseholdAssets25Tril, 16641.3);
  assert.equal(hw.headlineKpis.krFinAssets26Q2Tril, 6930.2);
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
