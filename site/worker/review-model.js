const outcomes = new Set(['answered', 'revised', 'confirmed', 'needs-evidence']);
const identifier = /^[A-Za-z0-9_-]{1,100}$/;
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const requireValue = (condition, message) => { if (!condition) throw new Error('Invalid review ledger: ' + message); };
const validText = (value, min, max) => typeof value === 'string' && value.trim().length >= min && value.length <= max;
const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
const validTime = value => typeof value === 'string' && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString() === value;
const validUrl = value => {
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password; }
  catch { return false; }
};

export function validateReviewLedger(ledger, seeds = []) {
  requireValue(ledger?.version === 1 && Array.isArray(ledger.runs), 'version/runs');
  const runIds = new Set(), reviewedQuestions = new Set();
  const seedMap = new Map(seeds.map(question => [question.id, question]));
  let lastTime = '';
  for (const run of ledger.runs) {
    requireValue(identifier.test(run.id || '') && !runIds.has(run.id), 'duplicate or malformed run id');
    requireValue(validTime(run.reviewedAt) && run.reviewedAt >= lastTime && Date.parse(run.reviewedAt) <= Date.now(), 'reviewedAt must be chronological and not future');
    requireValue(Array.isArray(run.questionIds) && Array.isArray(run.entries) && run.questionIds.length > 0, 'run coverage');
    const ids = new Set(run.questionIds);
    requireValue(ids.size === run.questionIds.length && run.questionIds.every(id => typeof id === 'string' && identifier.test(id)), 'questionIds must be unique strings');
    requireValue(run.entries.length === ids.size, 'entries must cover every questionId');
    const entryIds = new Set();
    for (const entry of run.entries) {
      requireValue(ids.has(entry.questionId) && !entryIds.has(entry.questionId), 'duplicate or out-of-scope entry');
      requireValue(outcomes.has(entry.outcome), 'outcome');
      requireValue(validText(entry.summary, 1, 1000) && validText(entry.body, 10, 30000), 'summary/body');
      requireValue(/^sha256:[a-f0-9]{64}$/.test(entry.inputFingerprint || ''), 'inputFingerprint');
      requireValue(Array.isArray(entry.sources) && entry.sources.length <= 30, 'sources');
      requireValue(entry.outcome === 'needs-evidence' || entry.sources.length > 0, 'a concluded review requires sources');
      for (const source of entry.sources) {
        requireValue(validUrl(source.url) && validText(source.title, 1, 500), 'source url/title');
        requireValue(validDate(source.observedAt) && source.observedAt <= run.reviewedAt.slice(0, 10), 'source observedAt');
      }
      const isFirst = !reviewedQuestions.has(entry.questionId);
      if (!isFirst) requireValue(!own(entry, 'previousAnswer'), 'previousAnswer belongs only to the first review');
      if (isFirst && seedMap.get(entry.questionId)?.answer) requireValue(entry.previousAnswer != null, 'first guide review must freeze previousAnswer');
      if (entry.previousAnswer != null) {
        const previous = entry.previousAnswer;
        requireValue(typeof previous.id === 'string' && identifier.test(previous.id) && previous.questionId === entry.questionId && previous.kind === 'guide', 'previousAnswer identity');
        requireValue(validText(previous.body, 1, 30000), 'previousAnswer body');
        requireValue(!previous.sourceUrl || validUrl(previous.sourceUrl), 'previousAnswer source');
        const current = seedMap.get(entry.questionId)?.answer;
        if (current) requireValue(previous.id === current.id, 'previousAnswer id must preserve the guide id');
      }
      entryIds.add(entry.questionId);
      reviewedQuestions.add(entry.questionId);
    }
    runIds.add(run.id);
    lastTime = run.reviewedAt;
  }
  return ledger;
}

const canonical = value => {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  return value;
};

export async function fingerprintReviewInput(input) {
  const bytes = new TextEncoder().encode(JSON.stringify(canonical(input)));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return 'sha256:' + [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

export function indexReviewLedger(ledger, seeds = []) {
  validateReviewLedger(ledger, seeds);
  const byQuestion = new Map();
  for (const run of ledger.runs) for (const entry of run.entries) {
    if (!byQuestion.has(entry.questionId)) byQuestion.set(entry.questionId, []);
    byQuestion.get(entry.questionId).push({...entry, runId: run.id, reviewedAt: run.reviewedAt});
  }
  const rows = [...byQuestion].map(([questionId, records]) => {
    const latest = records.at(-1);
    return {question_id: questionId, reviewed_at: latest.reviewedAt, outcome: latest.outcome, summary: latest.summary, run_id: latest.runId, cited: latest.sources.length > 0 ? 1 : 0};
  });
  return {byQuestion, rows: JSON.stringify(rows), workflow: {mode: 'manual', lastRunAt: ledger.runs.at(-1)?.reviewedAt || null, lastRunId: ledger.runs.at(-1)?.id || null}};
}

function reviewAnswer(record, questionId, id, revision) {
  const firstSource = record.sources[0];
  return {
    id, questionId, body: record.body, author: '리서치 검토', kind: 'research',
    sourceUrl: firstSource?.url || '', sourceTitle: firstSource?.title || '', observedAt: firstSource?.observedAt || '',
    sources: record.sources, createdAt: record.reviewedAt, updatedAt: record.reviewedAt,
    reviewedAt: record.reviewedAt, outcome: record.outcome, summary: record.summary, runId: record.runId,
    revision, own: false,
  };
}

export function projectResearchAnswer(questionId, records) {
  if (!records?.length) return null;
  const original = records[0].previousAnswer;
  const id = original?.id || 'research-answer-' + questionId;
  const history = [];
  if (original) history.push({...original, own: false, revision: Number(original.revision) || 1, editedAt: records[0].reviewedAt});
  const baseRevision = original ? Number(original.revision) || 1 : 0;
  for (let index = 0; index < records.length - 1; index++) {
    history.push({...reviewAnswer(records[index], questionId, id, baseRevision + index + 1), editedAt: records[index + 1].reviewedAt});
  }
  const latest = reviewAnswer(records.at(-1), questionId, id, baseRevision + records.length);
  latest.createdAt = original?.createdAt || records[0].reviewedAt;
  return {...latest, history};
}

export function makeReviewInput(question, baseAnswer, communityAnswers) {
  const publicAnswer = answer => {
    const {own: ownership, ...rest} = answer;
    return rest;
  };
  return {
    version: 1,
    question: Object.fromEntries(['id', 'title', 'body', 'category', 'timeframe', 'author', 'createdAt', 'seed'].map(field => [field, question[field]])),
    baseAnswer: baseAnswer ? publicAnswer(baseAnswer) : null,
    communityAnswers: communityAnswers.map(publicAnswer).sort((a, b) => a.id.localeCompare(b.id)),
  };
}
