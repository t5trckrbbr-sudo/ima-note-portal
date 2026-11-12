import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {handleApi} from '../worker/api.js';
import {seedQuestions} from '../worker/seeds.js';
import {validateReviewLedger, fingerprintReviewInput} from '../worker/review-model.js';

const empty = {version: 1, runs: []};
const key = 'r'.repeat(64), other = 's'.repeat(64);
const source = {url: 'https://www.fsc.go.kr/', title: '검토한 원문', observedAt: '2020-01-01'};
const times = [3, 2, 1].map(seconds => new Date(Date.now() - seconds * 1000).toISOString());
function setup() {
  const sql = new DatabaseSync(':memory:');
  for (const filename of fs.readdirSync('drizzle').filter(name => name.endsWith('.sql')).sort()) sql.exec(fs.readFileSync('drizzle/' + filename, 'utf8'));
  const prepare = (query, parameters = []) => ({
    bind(...values) { return prepare(query, values); },
    async first() { return sql.prepare(query).get(...parameters) || null; },
    async all() { return {results: sql.prepare(query).all(...parameters)}; },
    async run() { return {meta: {changes: sql.prepare(query).run(...parameters).changes}}; },
  });
  const db = {prepare, async batch(statements) { sql.exec('BEGIN'); try { const results = []; for (const statement of statements) results.push(await statement.run()); sql.exec('COMMIT'); return results; } catch (error) { sql.exec('ROLLBACK'); throw error; } }};
  return {sql, db};
}
async function request(db, path, ledger = empty, method = 'GET', body, authorKey = key) {
  const response = await handleApi(new Request('https://example.org' + path, {
    method, headers: {'X-Author-Key': authorKey, Origin: 'https://example.org', ...(body ? {'Content-Type': 'application/json'} : {})},
    body: body ? JSON.stringify(body) : undefined,
  }), {DB: db}, ledger);
  return {status: response.status, body: response.status === 204 ? null : await response.json()};
}
function entry(detail, overrides = {}) {
  return {
    questionId: detail.question.id, outcome: 'answered', summary: '원문을 확인하고 답변을 기록했습니다.',
    body: '검토 대상의 적용 범위와 원문 근거를 확인한 답변입니다.', sources: [source], inputFingerprint: detail.inputFingerprint,
    ...(detail.reviewInput.baseAnswer ? {previousAnswer: structuredClone(detail.reviewInput.baseAnswer)} : {}), ...overrides,
  };
}
const run = (id, entries, reviewedAt = times[0]) => ({id, reviewedAt, questionIds: entries.map(value => value.questionId), entries});
const question = {title: '새 질문도 요청 시 연구 답변을 받을 수 있나요?', body: '검토 절차와 근거를 알고 싶습니다.', category: 'strategy', timeframe: 'timeless', author: '질문 작성자'};
const answer = {body: '이것은 사용자가 등록한 기존 의견 답변입니다.', author: '답변 작성자', kind: 'opinion'};
const snapshot = sql => JSON.stringify(['questions', 'answers', 'answer_revisions', 'write_limits'].map(table => sql.prepare('SELECT * FROM ' + table + ' ORDER BY id').all()));

test('empty ledger exposes a manual workflow without claiming existing guides were reviewed', async () => {
  const {db} = setup();
  const list = (await request(db, '/api/questions')).body;
  assert.deepEqual(list.reviewWorkflow, {mode: 'manual', lastRunAt: null, lastRunId: null});
  assert.equal(list.counts.reviewPending, 15);
  assert.equal(list.counts.reviewNeedsEvidence, 0);
  assert(list.questions.every(value => value.review === null));
  const detail = (await request(db, '/api/questions/' + seedQuestions[0].id)).body;
  assert.equal(detail.answers[0].kind, 'guide');
  assert.equal(detail.inputFingerprint, await fingerprintReviewInput(detail.reviewInput));
  const independent = (await request(db, '/api/questions/' + seedQuestions[0].id, empty, 'GET', undefined, other)).body;
  assert.equal(detail.inputFingerprint, independent.inputFingerprint);
  assert(!JSON.stringify(detail.reviewInput).includes('own'));
  assert(!JSON.stringify(detail).includes('key_hash'));
});

test('guide reviews keep one stable answer, frozen original sources, and confirmed-review history', async () => {
  const {db, sql} = setup(), id = seedQuestions[0].id;
  const original = (await request(db, '/api/questions/' + id)).body;
  const first = entry(original), ledger = {version: 1, runs: [run('first-review', [first])]};
  const before = snapshot(sql);
  let detail = (await request(db, '/api/questions/' + id, ledger)).body;
  assert.equal(detail.answers.length, 1);
  assert.equal(detail.answers[0].id, original.answers[0].id);
  assert.equal(detail.answers[0].kind, 'research');
  assert.equal(detail.answers[0].own, false);
  assert.equal(detail.answers[0].history[0].body, original.answers[0].body);
  assert.equal(detail.answers[0].history[0].sourceUrl, original.answers[0].sourceUrl);
  assert.equal(detail.question.answerCount, 1);
  assert.equal(detail.question.evidenceCount, 1);
  assert.equal(detail.inputFingerprint, original.inputFingerprint, 'publishing a review does not change its own input');
  const second = {...first, outcome: 'confirmed', summary: '기존 결론을 다시 확인했습니다.', sources: [{...source, title: '다시 확인한 원문'}]};
  delete second.previousAnswer;
  ledger.runs.push(run('second-review', [second], times[1]));
  detail = (await request(db, '/api/questions/' + id, ledger)).body;
  assert.equal(detail.answers[0].history.length, 2);
  assert.equal(detail.answers[0].history[1].sources[0].title, '검토한 원문');
  assert.equal(detail.answers[0].sources[0].title, '다시 확인한 원문');
  assert.equal(detail.question.review.outcome, 'confirmed');
  assert.equal(detail.answers[0].revision, 3);
  assert.equal(snapshot(sql), before, 'review publication is a read-only overlay on D1');
  const list = (await request(db, '/api/questions?status=review-pending', ledger)).body;
  assert.equal(list.total, 14);
  assert.equal(list.counts.reviewPending, 14);
  assert.equal(list.reviewWorkflow.lastRunAt, times[1]);
  assert.equal(list.reviewWorkflow.lastRunId, 'second-review');
  const alternate = structuredClone(ledger);
  alternate.runs.at(-1).id = 'different-review-same-time';
  const alternativeWorkflow = (await request(db, '/api/questions', alternate)).body.reviewWorkflow;
  assert.equal(alternativeWorkflow.lastRunAt, list.reviewWorkflow.lastRunAt);
  assert.notEqual(alternativeWorkflow.lastRunId, list.reviewWorkflow.lastRunId);
  assert.equal((await request(db, '/api/questions?status=evidence', ledger)).body.total, 1);
});

test('user questions get separate unforgeable research answers while community records remain intact', async () => {
  const {db, sql} = setup();
  const id = (await request(db, '/api/questions', empty, 'POST', question)).body.question.id;
  const aid = (await request(db, '/api/questions/' + id + '/answers', empty, 'POST', answer, other)).body.answer.id;
  const original = (await request(db, '/api/questions/' + id)).body;
  const guide = (await request(db, '/api/questions/' + seedQuestions[1].id)).body;
  const ledger = {version: 1, runs: [run('mixed-review', [entry(original), entry(guide, {outcome: 'needs-evidence', sources: [], body: '추가 원문 확인이 필요하여 확정할 수 없습니다.'})])]};
  const before = snapshot(sql);
  const detail = (await request(db, '/api/questions/' + id, ledger)).body;
  assert.equal(detail.answers.length, 2);
  assert.equal(detail.answers[0].id, 'research-answer-' + id);
  assert.equal(detail.answers[0].own, false);
  assert.equal(detail.answers[1].id, aid);
  assert.equal(detail.answers[1].body, answer.body);
  assert.equal(detail.question.answerCount, 2);
  assert.equal(detail.inputFingerprint, original.inputFingerprint);
  assert.equal(snapshot(sql), before);
  const list = (await request(db, '/api/questions?status=review-needs-evidence', ledger)).body;
  assert.equal(list.total, 1);
  assert.equal(list.counts.reviewNeedsEvidence, 1);
  assert.equal(list.counts.reviewPending, 14);
  assert.equal((await request(db, '/api/answers/' + detail.answers[0].id, ledger, 'PATCH', {...answer, expectedRevision: 1})).status, 404);
  assert.equal((await request(db, '/api/answers/' + detail.answers[0].id, ledger, 'DELETE')).status, 404);
  assert.equal((await request(db, '/api/questions/' + id + '/answers', ledger, 'POST', {...answer, kind: 'research'})).status, 400);
  assert.equal((await request(db, '/api/questions/' + id, ledger, 'DELETE')).status, 409);
});

test('deleted questions cannot be resurrected by review records', async () => {
  const {db} = setup();
  const id = (await request(db, '/api/questions', empty, 'POST', question)).body.question.id;
  const original = (await request(db, '/api/questions/' + id)).body;
  const ledger = {version: 1, runs: [run('deleted-thread-review', [entry(original)])]};
  assert.equal((await request(db, '/api/questions/' + id, empty, 'DELETE')).status, 204);
  assert.equal((await request(db, '/api/questions/' + id, ledger)).status, 404);
  assert.equal((await request(db, '/api/questions', ledger)).body.total, 15);
  assert.equal((await request(db, '/api/questions', ledger)).body.counts.reviewPending, 15);
});

test('review input fingerprints detect community edits, deletions and base-answer changes', async () => {
  const {db} = setup(), id = seedQuestions[0].id;
  const first = (await request(db, '/api/questions/' + id)).body;
  const aid = (await request(db, '/api/questions/' + id + '/answers', empty, 'POST', answer)).body.answer.id;
  const added = (await request(db, '/api/questions/' + id)).body;
  assert.notEqual(added.inputFingerprint, first.inputFingerprint);
  await request(db, '/api/answers/' + aid, empty, 'PATCH', {...answer, body: '사용자가 근거와 설명을 수정한 새로운 답변입니다.', expectedRevision: 1});
  const edited = (await request(db, '/api/questions/' + id)).body;
  assert.notEqual(edited.inputFingerprint, added.inputFingerprint);
  assert.equal(edited.reviewInput.communityAnswers[0].history.length, 1);
  await request(db, '/api/answers/' + aid, empty, 'DELETE');
  const deleted = (await request(db, '/api/questions/' + id)).body;
  assert.notEqual(deleted.inputFingerprint, edited.inputFingerprint);
  assert.equal(deleted.inputFingerprint, first.inputFingerprint, 'removed public discussion leaves the original public input');
  const changedBase = structuredClone(first.reviewInput);
  changedBase.baseAnswer.body += '\n새로 수정된 원문 설명';
  assert.notEqual(await fingerprintReviewInput(changedBase), first.inputFingerprint);
});

test('ledger validation rejects incomplete coverage, forged sources, missing snapshots and rewritten baseline history', async () => {
  const {db} = setup();
  const detail = (await request(db, '/api/questions/' + seedQuestions[0].id)).body;
  const good = {version: 1, runs: [run('valid-review', [entry(detail)])]};
  assert.doesNotThrow(() => validateReviewLedger(good, seedQuestions));
  const rejected = mutate => { const value = structuredClone(good); mutate(value); assert.throws(() => validateReviewLedger(value, seedQuestions), /Invalid review ledger/); };
  rejected(value => value.runs.push(structuredClone(value.runs[0])));
  rejected(value => value.runs[0].questionIds.push('missing-question'));
  rejected(value => { value.runs[0].questionIds = [123]; value.runs[0].entries[0].questionId = 123; });
  rejected(value => value.runs[0].entries.push(value.runs[0].entries[0]));
  rejected(value => value.runs[0].entries[0].sources[0].url = 'javascript:alert(1)');
  rejected(value => value.runs[0].entries[0].sources[0].url = 'https://user:password@example.org/');
  rejected(value => value.runs[0].entries[0].sources[0].observedAt = '2020-02-30');
  rejected(value => value.runs[0].entries[0].sources = []);
  rejected(value => delete value.runs[0].entries[0].previousAnswer);
  rejected(value => value.runs[0].entries[0].inputFingerprint = 'unverified');
  rejected(value => value.runs.push({...structuredClone(value.runs[0]), id: 'second-review', reviewedAt: times[1]}));
});
