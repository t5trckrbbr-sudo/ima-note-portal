import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {renderRegulationLibrary} from '../public/regulations.js';

const book = JSON.parse(fs.readFileSync(new URL('../public/regulations.json', import.meta.url), 'utf8'));

test('the regulation library preserves dated parallel versions and title-only entries from the collection', () => {
  assert.equal(book.preparedOn, '2026-11-17');
  assert.equal(book.articles.length, 1155);
  assert.equal(book.areas.length, 11);
  for (const source of book.sources) {
    assert.equal(book.articles.filter(article => article.source === source.id).length, source.count);
    assert.equal(new URL(source.officialUrl).hostname, 'www.law.go.kr');
  }
  const otc = book.articles.filter(article => article.source === 'law' && article.number === '제166조');
  assert.equal(otc.length, 2);
  assert.equal(otc[1].effectiveOn, '2027-02-04');
  assert.notEqual(otc[0].text, otc[1].text);
  assert.deepEqual(book.articles.filter(article => !article.text).map(article => article.number), ['제4-100조','제4-101조']);
  assert.match(renderRegulationLibrary(), /<h1>규정모음집<\/h1>/);
});

test('comparison excerpts come from the cited articles and preserve the IMA combined limit', () => {
  assert.equal(book.comparison.length, 12);
  const canonical = text => text.replace(/\s+/g, ' ').trim();
  for (const topic of book.comparison) {
    for (const key of ['note','ima','common']) {
      const reference = topic[key];
      if (!reference) continue;
      const article = book.articles.find(article => article.source === reference.source && article.number === reference.number);
      assert(article, reference.citation);
      assert(canonical(article.text).includes(canonical(reference.excerpt)), reference.citation);
    }
  }
  const limit = book.comparison.find(theme => theme.title === '조달 한도');
  assert.match(limit.note.excerpt, /100분의 200 이내/);
  assert.match(limit.ima.excerpt, /제2항제1호에 따른 자금의 합계가 자기자본의 100분의 300 이내/);
  const liquidity = book.comparison.find(theme => theme.title === '단기 유동성');
  assert.equal(Array.from(liquidity.ima.excerpt.matchAll(/100분의 100이상/g)).length, 2);
  assert.doesNotMatch(liquidity.ima.excerpt, /손실충당금/);
});
