import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {collectReviewSnapshot, assertSameReviewInputs, createReviewDraft, appendReviewedRun} from '../scripts/review-queue.mjs';
import {makeReviewInput, fingerprintReviewInput, indexReviewLedger, projectResearchAnswer} from '../worker/review-model.js';
import {seedQuestions} from '../worker/seeds.js';

const siteUrl = 'https://example.org';
const emptyLedger = () => ({version:1, runs:[]});
const clone = value => structuredClone(value);
const hashLedger = value => 'sha256:' + createHash('sha256').update(JSON.stringify(value)).digest('hex');
const recent = milliseconds => new Date(Date.now() - milliseconds).toISOString();

async function detailFor(question, baseAnswer = null, communityAnswers = []) {
  const reviewInput = makeReviewInput(question, baseAnswer, communityAnswers);
  return {question:{...question, review:null, answerCount:(baseAnswer ? 1 : 0) + communityAnswers.length, evidenceCount:communityAnswers.filter(a => a.kind === 'evidence').length}, answers:[...(baseAnswer ? [baseAnswer] : []), ...communityAnswers], reviewInput, inputFingerprint:await fingerprintReviewInput(reviewInput)};
}

async function fixtures({includeUser = true} = {}) {
  const details = await Promise.all(seedQuestions.map(({answer, ...question}) => detailFor(question, answer)));
  const first = details[0];
  const communityAnswer = {id:'existing-community-answer', questionId:first.question.id, body:'사용자가 남긴 답변과 원문 출처는 그대로 보존합니다.', author:'참여자', kind:'evidence', sourceUrl:'https://www.fsc.go.kr/', sourceTitle:'사용자 확인 자료', observedAt:recent(120000).slice(0, 10), revision:2, createdAt:recent(180000), updatedAt:recent(120000), own:false, history:[{body:'수정 전 사용자 답변도 보존합니다.', revision:1, sourceUrl:'https://www.bok.or.kr/', sourceTitle:'이전 자료'}]};
  details[0] = await detailFor(first.question, first.reviewInput.baseAnswer, [communityAnswer]);
  if (includeUser) details.push(await detailFor({id:'user-new-question', title:'새 질문을 전체 검토에 포함할 수 있나요?', body:'기존 질문도 함께 검토해 주세요.', category:'strategy', timeframe:'2027', author:'익명', createdAt:recent(120000), seed:false}));
  return details;
}

function fixtureFetch(details, transform = value => value, workflow = {mode:'manual', lastRunAt:null, lastRunId:null}) {
  const calls = [];
  let listReads = 0;
  const fetchImpl = async (url, options) => {
    const u = new URL(url);
    calls.push({url:u.href, options});
    let body;
    if (u.pathname === '/api/questions') {
      listReads++;
      const page = Number(u.searchParams.get('page') || 1);
      body = {questions:details.slice((page - 1) * 12, page * 12).map(d => d.question), total:details.length, page, pages:Math.max(1, Math.ceil(details.length / 12)), reviewWorkflow:workflow};
      body = transform(clone(body), {listReads, page, url:u});
    } else {
      const id = decodeURIComponent(u.pathname.split('/').at(-1));
      body = clone(details.find(d => d.question.id === id));
      if (!body) return new Response('{}', {status:404});
      body = transform(body, {listReads, id, url:u});
    }
    return new Response(JSON.stringify(body), {headers:{'Content-Type':'application/json'}});
  };
  return {fetchImpl, calls};
}

function snapshotFor(details, ledger = emptyLedger()) {
  return {version:1, siteUrl, startedAt:recent(60000), collectedAt:recent(59000), reviewWorkflow:{mode:'manual', lastRunAt:ledger.runs.at(-1)?.reviewedAt || null, lastRunId:ledger.runs.at(-1)?.id || null}, ledgerFingerprint:hashLedger(ledger), questions:clone(details)};
}

function completeDraft(snapshot, ledger = emptyLedger(), {id = 'whole-board-review-1', reviewedAt = recent(1000)} = {}) {
  const draft = createReviewDraft(snapshot, ledger);
  draft.id = id;
  draft.reviewedAt = reviewedAt;
  for (const entry of draft.entries) {
    entry.outcome = entry.body ? 'confirmed' : 'answered';
    entry.body ||= '새 질문에 대해 확인한 근거와 적용 범위를 설명합니다.';
    entry.summary = '출처와 적용 범위를 확인했으며 변경 여부를 기록했습니다.';
    entry.sources = [{url:'https://www.fsc.go.kr/', title:'검토용 공식 자료', observedAt:reviewedAt.slice(0, 10)}];
  }
  return draft;
}

test('prepare collects every page and detail, including an unanswered user question, using only public reads', async () => {
  const details = await fixtures();
  const fake = fixtureFetch(details);
  const snapshot = await collectReviewSnapshot(siteUrl + '/?q=ignored#questions', fake.fetchImpl);
  assert.equal(snapshot.siteUrl, siteUrl);
  assert.equal(snapshot.questions.length, seedQuestions.length + 1);
  assert(snapshot.questions.some(d => d.question.id === 'user-new-question' && d.answers.length === 0));
  assert.equal(fake.calls.filter(c => new URL(c.url).pathname === '/api/questions').length, 4, 'both initial and final lists include page2');
  assert.equal(fake.calls.filter(c => new URL(c.url).pathname.startsWith('/api/questions/')).length, details.length);
  assert(fake.calls.every(c => !c.options.method || c.options.method === 'GET'));
  assert(fake.calls.every(c => !Object.hasOwn(c.options.headers, 'X-Author-Key')));
});

test('prepare rejects changing pagination, a replaced question, a concurrent review and invalid detail fingerprints', async () => {
  const details = await fixtures();
  for (const scenario of [
    {name:'count changes on page2', change:(body, ctx) => {if (ctx.listReads === 2) body.total++; return body;}, message:/changed during collection/},
    {name:'duplicate page boundary', change:(body, ctx) => {if (ctx.listReads === 2) body.questions[0] = details[0].question; return body;}, message:/changed during pagination/},
    {name:'new question replaces a removed one', change:(body, ctx) => {if (ctx.listReads === 3) body.questions[0].id = 'replacement-question'; return body;}, message:/Questions or review version changed/},
    {name:'answer edit changes the row timestamp with the same IDs', change:(body, ctx) => {if (ctx.listReads === 3) body.questions[0].updatedAt = recent(1000); return body;}, message:/Questions or review version changed/},
    {name:'answer deletion changes the row count with the same IDs', change:(body, ctx) => {if (ctx.listReads === 3) body.questions[0].answerCount--; return body;}, message:/Questions or review version changed/},
    {name:'another review is published', change:(body, ctx) => {if (ctx.listReads === 3) body.reviewWorkflow.lastRunAt = recent(1000); return body;}, message:/Questions or review version changed/},
    {name:'untrusted stale fingerprint', change:(body, ctx) => {if (ctx.id) body.reviewInput.question.body += ' 변경됨'; return body;}, message:/Invalid input fingerprint/},
  ]) {
    const fake = fixtureFetch(details, scenario.change);
    await assert.rejects(collectReviewSnapshot(siteUrl, fake.fetchImpl), scenario.message, scenario.name);
  }
  await assert.rejects(collectReviewSnapshot(siteUrl, async () => new Response('{}', {status:503})), /HTTP 503/);
});

test('a concurrent review with the same timestamp but a different run ID invalidates collection and apply', async () => {
  const details = await fixtures();
  const sameTime = recent(10000);
  const workflow = {mode:'manual', lastRunAt:sameTime, lastRunId:'review-a'};
  const fake = fixtureFetch(details, (body, context) => {
    if (context.listReads === 3) body.reviewWorkflow.lastRunId = 'review-b';
    return body;
  }, workflow);
  await assert.rejects(collectReviewSnapshot(siteUrl, fake.fetchImpl), /Questions or review version changed/);
  const before = snapshotFor(details);
  before.reviewWorkflow = workflow;
  const current = clone(before);
  current.reviewWorkflow.lastRunId = 'review-b';
  const draft = completeDraft(before);
  await assert.rejects(appendReviewedRun(before, draft, current), /Another review was published/);
});

test('draft requires deliberate review for all questions and freezes the first guide answer without treating it as reviewed', async () => {
  const details = await fixtures();
  const snapshot = snapshotFor(details);
  const draft = createReviewDraft(snapshot);
  assert.equal(draft.entries.length, seedQuestions.length + 1);
  assert.equal(draft.reviewedAt, null);
  assert(draft.entries.every(entry => entry.outcome === null && entry.summary === '' && entry.sources.length === 0));
  for (const original of details.filter(d => d.reviewInput.baseAnswer)) {
    const entry = draft.entries.find(e => e.questionId === original.question.id);
    assert.deepEqual(entry.previousAnswer, original.reviewInput.baseAnswer);
    assert.equal(entry.body, original.reviewInput.baseAnswer.body);
  }
  const userEntry = draft.entries.find(e => e.questionId === 'user-new-question');
  assert.equal(userEntry.body, '');
  assert.equal(Object.hasOwn(userEntry, 'previousAnswer'), false);
  await assert.rejects(appendReviewedRun(snapshot, draft, clone(snapshot)), /actual completed review time/);
});

test('apply rejects incomplete whole-board coverage, missing outcomes and changed guide snapshots', async () => {
  const snapshot = snapshotFor(await fixtures({includeUser:false}));
  assert.equal(snapshot.questions.length, 15);
  const incomplete = completeDraft(snapshot);
  incomplete.questionIds.pop(); incomplete.entries.pop();
  await assert.rejects(appendReviewedRun(snapshot, incomplete, clone(snapshot)), /Every current question must be reviewed/);
  const missingEntry = completeDraft(snapshot);
  missingEntry.entries.pop();
  await assert.rejects(appendReviewedRun(snapshot, missingEntry, clone(snapshot)), /entries must cover every questionId/);
  const unreviewed = completeDraft(snapshot);
  unreviewed.entries[0].outcome = null;
  await assert.rejects(appendReviewedRun(snapshot, unreviewed, clone(snapshot)), /outcome/);
  const changedOriginal = completeDraft(snapshot);
  changedOriginal.entries[0].previousAnswer = {...changedOriginal.entries[0].previousAnswer, body:'원래 답변을 덮어쓰려는 변경 내용입니다.'};
  await assert.rejects(appendReviewedRun(snapshot, changedOriginal, clone(snapshot)), /Preserve the exact original guide answer/);
});

test('apply rejects stale user edits, deletions, additions, changed deployed reviews and local ledger changes', async () => {
  const details = await fixtures();
  const snapshot = snapshotFor(details);
  const draft = completeDraft(snapshot);
  const edited = clone(snapshot);
  const user = edited.questions.find(d => d.question.id === 'user-new-question');
  user.reviewInput.communityAnswers.push({id:'new-community-answer', body:'검토 후 새로 보탠 사용자 답변입니다.', kind:'opinion'});
  user.inputFingerprint = await fingerprintReviewInput(user.reviewInput);
  await assert.rejects(appendReviewedRun(snapshot, draft, edited), /inputs changed/);
  const removed = clone(snapshot); removed.questions.pop();
  await assert.rejects(appendReviewedRun(snapshot, draft, removed), /Questions were added or removed/);
  const added = clone(snapshot); added.questions.push(await detailFor({...user.question, id:'another-user-question'}));
  await assert.rejects(appendReviewedRun(snapshot, draft, added), /Questions were added or removed/);
  const published = clone(snapshot); published.reviewWorkflow.lastRunAt = recent(500);
  await assert.rejects(appendReviewedRun(snapshot, draft, published), /Another review was published/);
  const changedLedger = {version:1, runs:[], unexpectedEdit:true};
  await assert.rejects(appendReviewedRun(snapshot, draft, clone(snapshot), changedLedger), /Local review ledger changed/);
  const staleEntry = completeDraft(snapshot); staleEntry.entries[0].inputFingerprint = 'sha256:' + '0'.repeat(64);
  await assert.rejects(appendReviewedRun(snapshot, staleEntry, clone(snapshot)), /Stale input/);
  assert.throws(() => assertSameReviewInputs(snapshot, {...snapshot, siteUrl:'https://another.example'}), /another site/);
});

test('two successful whole-board runs append history without rewriting original answers or community content', async () => {
  const details = await fixtures();
  const initial = snapshotFor(details);
  const originals = clone(details);
  const ledger = emptyLedger();
  const first = completeDraft(initial, ledger, {reviewedAt:recent(3000)});
  const published = await appendReviewedRun(initial, first, clone(initial), ledger);
  assert.deepEqual(ledger, emptyLedger());
  assert.deepEqual(details, originals);
  assert.equal(published.runs.length, 1);
  assert.equal(published.runs[0].entries.length, 16);
  const indexed = indexReviewLedger(published, seedQuestions);
  const after = details.map(d => ({...clone(d), answers:[projectResearchAnswer(d.question.id, indexed.byQuestion.get(d.question.id)), ...clone(d.reviewInput.communityAnswers)]}));
  const secondSnapshot = snapshotFor(after, published);
  const second = completeDraft(secondSnapshot, published, {id:'whole-board-review-2', reviewedAt:recent(1000)});
  assert(second.entries.every(e => !Object.hasOwn(e, 'previousAnswer')));
  second.entries[0].body = '새로 확인한 근거에 맞게 기존 검토 답변의 설명을 보완합니다.';
  second.entries[0].outcome = 'revised';
  const beforeAppend = clone(published);
  const appended = await appendReviewedRun(secondSnapshot, second, clone(secondSnapshot), published);
  assert.deepEqual(published, beforeAppend);
  assert.deepEqual(appended.runs[0], first);
  assert.equal(appended.runs.length, 2);
  const firstGuideId = seedQuestions[0].id;
  const records = indexReviewLedger(appended, seedQuestions).byQuestion.get(firstGuideId);
  const displayed = projectResearchAnswer(firstGuideId, records);
  assert.equal(displayed.id, seedQuestions[0].answer.id);
  assert.equal(displayed.history[0].body, seedQuestions[0].answer.body);
  assert.equal(displayed.history.length, 2);
  assert.equal(displayed.own, false);
  assert.deepEqual(details, originals);
  assert.deepEqual(after[0].reviewInput.communityAnswers, originals[0].reviewInput.communityAnswers);
  assert.equal(after[0].answers.find(a => a.id === 'existing-community-answer').history[0].sourceUrl, 'https://www.bok.or.kr/');
});
