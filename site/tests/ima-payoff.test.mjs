import test from 'node:test';
import assert from 'node:assert/strict';
import { computeImaPayoff, renderImaPayoffPanel } from '../public/ima-payoff.js';

const close = (a, b) => assert(Math.abs(a - b) < 1e-9, `${a} != ${b}`);

test('IMA payoff models below-hurdle, above-hurdle, and principal-guarantee short-put regimes accurately', () => {
  // 1. Principal loss regime (-2.0% gross): customer gets 0%, broker bears full gross loss (-2.0%)
  const loss = computeImaPayoff({ grossPct: -2.0, cohort: 'recent', principalEok: 3 });
  for (const r of loss.results) {
    assert.equal(r.regime, 'principal_guarantee');
    close(r.customerPreTaxPct, 0);
    close(r.perfFeePct, 0);
    close(r.brokerNetMarginPct, -2.0);
    close(r.lumpSumDividendMan, 0);
    assert.equal(r.exceedsComprehensiveThreshold, false);
  }

  // 2. Below-hurdle regime (+4.0% gross): low base fee (Mirae 0.22%) delivers higher customer yield than 0.60%
  const mid = computeImaPayoff({ grossPct: 4.0, cohort: 'recent', principalEok: 3 });
  const kisMid = mid.results.find(r => r.key === 'kis');
  const miraeMid = mid.results.find(r => r.key === 'mirae');
  assert.equal(kisMid.regime, 'below_hurdle');
  assert.equal(miraeMid.regime, 'below_hurdle');
  close(kisMid.customerPreTaxPct, 3.40);
  close(miraeMid.customerPreTaxPct, 3.78);
  close(kisMid.brokerNetMarginPct, 0.60);
  close(miraeMid.brokerNetMarginPct, 0.22);

  // 3. Above-hurdle regime (+7.6% gross): KIS afterBase=7.0%, excess=2.5%, perfFee=1.0%, customer=6.0%, broker=1.6%
  const high = computeImaPayoff({ grossPct: 7.6, cohort: 'recent', principalEok: 3 });
  const kisHigh = high.results.find(r => r.key === 'kis');
  const miraeHigh = high.results.find(r => r.key === 'mirae');
  assert.equal(kisHigh.regime, 'above_hurdle');
  close(kisHigh.perfFeePct, 1.0);
  close(kisHigh.customerPreTaxPct, 6.0);
  close(kisHigh.brokerNetMarginPct, 1.6);
  // 3억 * 6.0% * 2년 = 3,600만 원 > 2,000만 원 종합과세 기준선
  close(kisHigh.lumpSumDividendMan, 3600);
  assert.equal(kisHigh.exceedsComprehensiveThreshold, true);
  // Mirae 4호: afterBase=7.38%, excess=2.38%, perfFee=0.952%, customer=6.428%
  close(miraeHigh.perfFeePct, 2.38 * 0.4);
  close(miraeHigh.customerPreTaxPct, 5.0 + 2.38 * 0.6);
});

test('IMA payoff panel renders cleanly with zero checkboxes, NaN, or undefined across cohorts', () => {
  for (const cohort of ['recent', 'early']) {
    for (const grossPct of [-2.0, 3.0, 5.5, 8.0]) {
      const html = renderImaPayoffPanel({ cohort, grossPct, principalEok: 3 });
      assert(html.includes('id="ima-payoff-panel"'));
      assert(html.includes('한국투자증권'));
      assert(html.includes('미래에셋증권'));
      assert(html.includes('NH투자증권'));
      assert(html.includes('?q=제4-102조의9#regulations'));
      assert(!html.includes('type="checkbox"'));
      assert(!html.includes('NaN'));
      assert(!html.includes('undefined'));
    }
  }
});
