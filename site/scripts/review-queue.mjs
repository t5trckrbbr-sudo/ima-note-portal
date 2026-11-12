import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL, fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {reviewLedger} from '../worker/reviews.js';
import {seedQuestions} from '../worker/seeds.js';
import {validateReviewLedger, fingerprintReviewInput} from '../worker/review-model.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const defaultSite = 'https://ima-outlook-2027.mcr8jq7mcg.chatgpt.site';
const ledgerHash = value => 'sha256:' + createHash('sha256').update(JSON.stringify(value)).digest('hex');
const idsOf = rows => rows.map(q => q.id).sort();
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export async function collectReviewSnapshot(siteUrl, fetchImpl = fetch) {
  const site = new URL(siteUrl);
  if (!['https:', 'http:'].includes(site.protocol) || site.username || site.password) throw Error('Invalid public site URL.');
  site.pathname = '/'; site.search = ''; site.hash = '';
  async function get(route) {
    const response = await fetchImpl(new URL(route, site), {headers: {'Accept':'application/json', 'User-Agent':'IMA-Portal-Review/1.0'}, signal: AbortSignal.timeout(30000)});
    if (!response.ok) throw Error(`Unable to read ${route}: HTTP ${response.status}`);
    return response.json();
  }
  async function listAll() {
    const first = await get('/api/questions');
    if (!Number.isInteger(first.total) || !Number.isInteger(first.pages) || first.pages < 1 || !Array.isArray(first.questions)) throw Error('Invalid question list.');
    const rows = [...first.questions];
    for (let page = 2; page <= first.pages; page++) {
      const next = await get('/api/questions?page=' + page);
      if (next.total !== first.total || next.pages !== first.pages || next.page !== page) throw Error('Question list changed during collection. Prepare again.');
      rows.push(...next.questions);
    }
    if (rows.length !== first.total || new Set(idsOf(rows)).size !== rows.length) throw Error('Question list changed during pagination. Prepare again.');
    return {rows, workflow:first.reviewWorkflow};
  }
  const startedAt = new Date().toISOString();
  const initial = await listAll();
  if (!initial.workflow || initial.workflow.mode !== 'manual') throw Error('Deploy the manual review workflow before preparing a review.');
  const questions = [];
  for (const row of initial.rows) {
    const detail = await get('/api/questions/' + encodeURIComponent(row.id));
    if (detail.question?.id !== row.id || !detail.reviewInput || !Array.isArray(detail.answers)) throw Error('Missing review input for ' + row.id);
    if (await fingerprintReviewInput(detail.reviewInput) !== detail.inputFingerprint) throw Error('Invalid input fingerprint for ' + row.id);
    questions.push(detail);
  }
  const final = await listAll();
  if (!equal([...initial.rows].sort((a,b)=>a.id.localeCompare(b.id)), [...final.rows].sort((a,b)=>a.id.localeCompare(b.id))) || !equal(initial.workflow, final.workflow)) throw Error('Questions or review version changed during collection. Prepare again.');
  return {version:1, siteUrl:site.origin, startedAt, collectedAt:new Date().toISOString(), reviewWorkflow:initial.workflow, questions};
}

export function assertSameReviewInputs(before, current) {
  if (before.version !== 1 || before.siteUrl !== current.siteUrl) throw Error('Snapshot belongs to another site or format.');
  const oldIds = idsOf(before.questions.map(d => d.question));
  const newIds = idsOf(current.questions.map(d => d.question));
  if (!equal(oldIds, newIds)) throw Error('Questions were added or removed. Prepare a new whole-board review.');
  if (!equal(before.reviewWorkflow, current.reviewWorkflow)) throw Error('Another review was published. Refresh source and prepare again.');
  const old = new Map(before.questions.map(d => [d.question.id, d.inputFingerprint]));
  const changed = current.questions.filter(d => old.get(d.question.id) !== d.inputFingerprint).map(d => d.question.id);
  if (changed.length) throw Error('Question or answer inputs changed; re-review these IDs: ' + changed.join(', '));
}

export function createReviewDraft(snapshot, ledger = reviewLedger) {
  const reviewedIds = new Set(ledger.runs.flatMap(r => r.entries.map(e => e.questionId)));
  const questionIds = idsOf(snapshot.questions.map(d => d.question));
  const byId = new Map(snapshot.questions.map(d => [d.question.id, d]));
  return {
    id:'review-' + snapshot.collectedAt.replace(/[^0-9]/g, ''),
    reviewedAt:null,
    questionIds,
    entries:questionIds.map(questionId => {
      const d = byId.get(questionId);
      const prior = d.answers.find(a => a.kind === 'research') || d.reviewInput.baseAnswer;
      return {questionId, outcome:null, summary:'', body:prior?.body || '', sources:[], inputFingerprint:d.inputFingerprint,
        ...(!reviewedIds.has(questionId) && d.reviewInput.baseAnswer ? {previousAnswer:d.reviewInput.baseAnswer} : {})};
    })
  };
}

export async function appendReviewedRun(snapshot, draft, current, ledger = reviewLedger) {
  assertSameReviewInputs(snapshot, current);
  if (snapshot.ledgerFingerprint !== ledgerHash(ledger)) throw Error('Local review ledger changed. Prepare again.');
  if (!equal([...draft.questionIds].sort(), idsOf(current.questions.map(d => d.question)))) throw Error('Every current question must be reviewed, including previously answered questions.');
  if (!draft.reviewedAt || Date.parse(draft.reviewedAt) < Date.parse(snapshot.startedAt) || Date.parse(draft.reviewedAt) > Date.now()) throw Error('Set reviewedAt to the actual completed review time.');
  const details = new Map(current.questions.map(d => [d.question.id, d]));
  const reviewedIds = new Set(ledger.runs.flatMap(r => r.entries.map(e => e.questionId)));
  for (const entry of draft.entries) {
    const detail = details.get(entry.questionId);
    if (!detail || entry.inputFingerprint !== detail.inputFingerprint) throw Error('Stale input for ' + entry.questionId);
    if (!reviewedIds.has(entry.questionId) && detail.reviewInput.baseAnswer && !equal(entry.previousAnswer, detail.reviewInput.baseAnswer)) throw Error('Preserve the exact original guide answer for ' + entry.questionId);
  }
  const next = {...ledger, runs:[...ledger.runs, draft]};
  validateReviewLedger(next, seedQuestions);
  return next;
}

async function main() {
  const [command = 'prepare', arg] = process.argv.slice(2);
  if (command === 'prepare') {
    const snapshot = await collectReviewSnapshot(arg || defaultSite);
    const localLast = reviewLedger.runs.at(-1)?.reviewedAt || null;
    if (snapshot.reviewWorkflow.lastRunAt !== localLast || snapshot.reviewWorkflow.lastRunId !== (reviewLedger.runs.at(-1)?.id || null)) throw Error('Local source and deployed review version differ. Synchronize before reviewing.');
    snapshot.ledgerFingerprint = ledgerHash(reviewLedger);
    const dir = path.join(root, '.local/reviews', snapshot.collectedAt.replace(/[:.]/g, '-'));
    await fs.mkdir(dir, {recursive:true});
    await fs.writeFile(path.join(dir, 'snapshot.json'), JSON.stringify(snapshot, null, 2) + '\n');
    await fs.writeFile(path.join(dir, 'draft.json'), JSON.stringify(createReviewDraft(snapshot), null, 2) + '\n');
    console.log(JSON.stringify({questions:snapshot.questions.length, snapshot:path.join(dir,'snapshot.json'), draft:path.join(dir,'draft.json'), next:'Research every question, then fill outcomes, summaries, sources and actual reviewedAt. No review has been published.'}));
    return;
  }
  if (!['apply', 'verify'].includes(command) || !arg) throw Error('Usage: review-queue.mjs prepare [site-url] | apply <draft.json> | verify <snapshot.json>');
  const filename = path.resolve(arg);
  const snapshotPath = command === 'apply' ? path.join(path.dirname(filename), 'snapshot.json') : filename;
  const snapshot = JSON.parse(await fs.readFile(snapshotPath, 'utf8'));
  const current = await collectReviewSnapshot(snapshot.siteUrl);
  assertSameReviewInputs(snapshot, current);
  if (command === 'verify') {
    console.log('Current public question and answer inputs match the reviewed snapshot.');
    return;
  }
  const draft = JSON.parse(await fs.readFile(filename, 'utf8'));
  const next = await appendReviewedRun(snapshot, draft, current);
  const target = path.join(root, 'worker/reviews.js');
  const content = '// Append-only research review runs. See REVIEW_WORKFLOW.md.\nexport const reviewLedger = ' + JSON.stringify(next, null, 2) + ';\n';
  await fs.writeFile(target + '.tmp', content);
  await fs.rename(target + '.tmp', target);
  console.log(JSON.stringify({stagedRun:draft.id,questions:draft.questionIds.length,next:'Run check, test, build and review:verify; then sync GitHub and deploy the same Site. Production data has not been written.'}));
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(error => {console.error(error.message); process.exitCode = 1;});
}
