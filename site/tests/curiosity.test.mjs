import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  explorerState,
  setExplorerFirmByName,
  renderFundingBreakdownPanel,
  renderMoneyMoveSafetyPanel,
  renderIbSynchronizedExplorer,
  renderVentureDeepDive
} from '../public/curiosity.js';

const publicDataUrl = new URL('../public/data.json', import.meta.url);
const verifiedDataUrl = new URL('../../data/ib_portal_verified_data.json', import.meta.url);
const D = JSON.parse(fs.readFileSync(publicDataUrl, 'utf8'));

test('public/data.json reconciles 83T outlook and matches root verified dataset when present', () => {
  if (fs.existsSync(verifiedDataUrl)) {
    assert.deepEqual(D, JSON.parse(fs.readFileSync(verifiedDataUrl, 'utf8')));
  }
  assert.equal(D.ib9FirmsCuriosityChain.length, 9);

  const baseSum = D.ib9FirmsCuriosityChain.reduce((acc, x) => acc + x.base26Q2NoteTril + x.base26Q2ImaTril, 0);
  const estSum = D.ib9FirmsCuriosityChain.reduce((acc, x) => acc + x.est27ModelNoteTril + x.est27ModelImaTril, 0);
  assert.equal(baseSum.toFixed(2), '58.54');
  assert.equal(estSum.toFixed(2), '83.00');

  const samsung = D.ib9FirmsCuriosityChain.find(x => x.key === 'samsung');
  const meritz = D.ib9FirmsCuriosityChain.find(x => x.key === 'meritz');
  assert(samsung.noteLicense.includes('2026.09'));
  assert(meritz.noteLicense.includes('2026.09'));
  assert.equal(samsung.profitability.h126NoteIntEok, 0);
  assert.equal(meritz.profitability.h126NoteIntEok, 0);
});

test('curiosity-driven hybrid UX renders all 4 perspectives cleanly without NaN or undefined', () => {
  for (const item of D.ib9FirmsCuriosityChain) {
    setExplorerFirmByName(D, item.firm);
    assert.equal(explorerState.firmKey, item.key);

    const fundingHtml = renderFundingBreakdownPanel(D);
    assert(fundingHtml.includes(item.firm));
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
