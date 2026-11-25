import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {handleApi} from '../worker/api.js';
import {seedQuestions} from '../worker/seeds.js';
function setup(){const sql=new DatabaseSync(':memory:');for(const f of fs.readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())sql.exec(fs.readFileSync('drizzle/'+f,'utf8'));const prepare=(text,params=[])=>({bind(...p){return prepare(text,p)},async first(){return sql.prepare(text).get(...params)||null},async all(){return {results:sql.prepare(text).all(...params)}},async run(){return {success:true,meta:{changes:sql.prepare(text).run(...params).changes}}}});const db={prepare,async batch(stmts){sql.exec('BEGIN');try{const result=[];for(const s of stmts)result.push(await s.run());sql.exec('COMMIT');return result}catch(e){sql.exec('ROLLBACK');throw e}}};return {db,sql};}
const key='a'.repeat(64),other='b'.repeat(64);
const request=async(db,path,method='GET',body,authorKey=key,origin='https://example.org')=>{const headers={'X-Author-Key':authorKey,'Origin':origin};if(body!==undefined)headers['Content-Type']='application/json';const r=await handleApi(new Request('https://example.org'+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)}),{DB:db});return {status:r.status,body:r.status===204?null:await r.json()}};
const question={title:'모험자본 의무와 수신 확대를 어떻게 비교할까요?',body:'자산 배분과 교차 규제를 구분해 보고 싶습니다.',category:'regulation',timeframe:'2027',author:'검증자'};
const answer={body:'모험자본 의무는 자산 유형 안에서 별도 요건으로 집계합니다.',author:'참여자',kind:'opinion',sourceUrl:'',sourceTitle:'',observedAt:''};
test('seed questions have meaningful filters and verified guide answers',async()=>{const {db}=setup();let r=await request(db,'/api/questions');assert.equal(r.status,200);assert.equal(r.body.total,18);assert.equal(r.body.pages,2);assert.equal(r.body.questions.length,12);assert.equal(r.body.counts.unanswered,0);assert(r.body.questions.every(q=>!q.own));assert.equal(r.body.questions[0].id,'guide-mirae-note-growth');for(const qid of ['guide-ima-old-ncr-capital','guide-2027-funding-outlook-bear-flattening','guide-yield-curve-short-funding','guide-demand-note-cash-buffer','guide-real-estate-concentration','guide-pension-self-product-ban']){const d=await request(db,'/api/questions/'+qid);assert.equal(d.status,200);assert.equal(d.body.answers[0].kind,'guide');}r=await request(db,'/api/questions?status=unanswered');assert.equal(r.body.questions.length,0);r=await request(db,'/api/questions?timeframe=timeless');assert(r.body.questions.every(q=>q.timeframe==='timeless'));r=await request(db,'/api/questions?q=NIM');assert(r.body.total>0);r=await request(db,'/api/questions?q='+encodeURIComponent('현금성자산'));assert.equal(r.body.total,1);r=await request(db,'/api/questions?q='+encodeURIComponent('베어 플랫'));assert.equal(r.body.total,1);r=await request(db,'/api/questions/'+seedQuestions[0].id);assert.equal(r.body.answers[0].kind,'guide');});
test('all guides have a concise key answer without changing the review input',async()=>{
 const {db}=setup();
 for(const seed of seedQuestions){
  const detail=await request(db,'/api/questions/'+seed.id);
  const guide=detail.body.answers[0];
  assert.equal(guide.kind,'guide',seed.id);
  assert.equal(guide.summary,seed.answerSummary,seed.id);
  assert(guide.summary.length>0&&guide.summary.length<=155,seed.id);
  assert.equal(guide.body,seed.answer.body,seed.id);
  assert.deepEqual(detail.body.reviewInput.baseAnswer,seed.answer,seed.id);
 }
});

test('Mirae guide connects comparable balances to its use of RP and bonds',async()=>{
 const {db}=setup();
 const id='guide-mirae-note-growth';
 const found=await request(db,'/api/questions?q='+encodeURIComponent('미래에셋 발행어음'));
 assert(found.body.questions.some(q=>q.id===id));
 const detail=await request(db,'/api/questions/'+id);
 assert.equal(detail.status,200);
 const guide=detail.body.answers.find(a=>a.kind==='guide');
 assert.match(guide.summary,/RP로, 장기자금을 회사채로.*기존 거래망/);
 assert.match(guide.body,/10\.36조.+48\.9%/);
 assert.match(guide.body,/9\.09조 → 10\.36조.*24\.86조 → 26\.99조/);
 assert.match(guide.body,/RP 2\.42%, 발행어음 2\.75%/);
 assert.match(guide.body,/경로의존성/);
 assert.doesNotMatch(guide.body+guide.summary,/안전\s*자산|안정적\s*자산/);
 assert(guide.sourceUrl.includes('QA_VERIFIED_ANSWERS.md#q20-'));
 assert.equal(guide.observedAt,'2026-11-23');
});

test('risk labels find active answers and both removed questions stay absent',async()=>{
 const {db}=setup();
 const first=await request(db,'/api/questions');
 const second=await request(db,'/api/questions?page=2');
 const all=[...first.body.questions,...second.body.questions];
 assert.equal(all.length,18);
 for(const id of ['guide-venture-cross-rule','guide-funding-rate-spread-risk']){
  assert(!all.some(q=>q.id===id));
  assert.equal((await request(db,'/api/questions/'+id)).status,404);
 }
 assert.equal((await request(db,'/api/questions?q='+encodeURIComponent('기준금리 +50bp'))).body.total,0);
 assert(second.body.questions.some(q=>q.id==='guide-sizing-growth'),'sourcing answer remains searchable beyond the first page');
 for(const [label,id] of [
  ['모험자본 조달 병목','guide-sizing-growth'],
  ['베어 플랫 · 기간스프레드 압축','guide-2027-funding-outlook-bear-flattening'],
  ['IMA 만기 집중','guide-ima-maturity'],
  ['자본효율과 수신 한도','guide-sizing-growth'],
  ['부동산·단일 자산 집중','guide-real-estate-concentration']
 ]){
  const found=await request(db,'/api/questions?q='+encodeURIComponent(label));
  assert.equal(found.status,200);
  assert(found.body.questions.some(q=>q.id===id),label);
  const detail=await request(db,'/api/questions/'+id);
  assert.equal(detail.status,200);
  assert(detail.body.answers.some(a=>a.kind==='guide'&&a.body.length>100),label);
 }
 for(const id of ['guide-pension-eligibility','guide-pension-self-product-ban']){
  const found=await request(db,'/api/questions?q='+encodeURIComponent('퇴직연금'));
  assert(found.body.questions.some(q=>q.id===id),'pension Q&A retained');
 }
});
test('short-funding question is discoverable by the panel percentage',async()=>{const {db}=setup();const r=await request(db,'/api/questions?q=63.4');assert.equal(r.status,200);assert(r.body.questions.some(q=>q.id==='guide-yield-curve-short-funding'));});
test('IMA old-NCR explanation is searchable and has a stable question detail route',async()=>{
 const {db}=setup();
 for(const q of ['구NCR','5% 충당금','위험액 50%']){
  const found=await request(db,'/api/questions?q='+encodeURIComponent(q));
  assert.equal(found.status,200);
  assert(found.body.questions.some(x=>x.id==='guide-ima-old-ncr-capital'),q);
 }
 const detail=await request(db,'/api/questions/guide-ima-old-ncr-capital');
 assert.equal(detail.status,200);
 assert.equal(detail.body.answers[0].kind,'guide');
 assert.equal(detail.body.answers[0].observedAt,'2026-11-18');
 assert.equal(detail.body.answers[0].sourceUrl,'https://www.fsc.go.kr/no010101/84322');
 const unchanged=await request(db,'/api/questions/guide-ima-maturity');
 assert.equal(unchanged.body.answers[0].observedAt,'2026-11-12','an added question does not mark untouched answers newly reviewed');
});
test('anonymous records visible to a separate client and edits retain previous sources',async()=>{const {db}=setup();let r=await request(db,'/api/questions','POST',question);assert.equal(r.status,201);const id=r.body.question.id;assert(r.body.question.own);r=await request(db,'/api/questions/'+id,'GET',undefined,other);assert(!r.body.question.own);assert.equal(r.body.question.title,question.title);
r=await request(db,'/api/questions/'+id+'/answers','POST',answer,other);assert.equal(r.status,201);const aid=r.body.answer.id;
r=await request(db,'/api/answers/'+aid,'PATCH',{...answer,expectedRevision:1},key);assert.equal(r.status,403);
const evidence={...answer,body:'업데이트한 근거 자료를 확인한 날짜와 함께 기록합니다.',kind:'evidence',sourceUrl:'https://www.fsc.go.kr/',sourceTitle:'금융위원회',observedAt:'2026-11-12',expectedRevision:1};
r=await request(db,'/api/answers/'+aid,'PATCH',evidence,other);assert.equal(r.status,200);assert.equal(r.body.answer.revision,2);
r=await request(db,'/api/answers/'+aid,'PATCH',evidence,other);assert.equal(r.status,409);
r=await request(db,'/api/questions/'+id,'GET',undefined,key);assert.equal(r.body.answers[0].history.length,1);assert.equal(r.body.answers[0].history[0].body,answer.body);assert.equal(r.body.question.evidenceCount,1);
r=await request(db,'/api/questions?status=evidence');assert.equal(r.body.total,1);
r=await request(db,'/api/questions/'+id,'DELETE');assert.equal(r.status,409);
r=await request(db,'/api/answers/'+aid,'DELETE',undefined,key);assert.equal(r.status,403);
r=await request(db,'/api/answers/'+aid,'DELETE',undefined,other);assert.equal(r.status,204);
r=await request(db,'/api/questions/'+id,'DELETE');assert.equal(r.status,204);
r=await request(db,'/api/questions/'+id);assert.equal(r.status,404);});
test('invalid inputs, forged URLs, cross-origin writes, and stale ownership are rejected',async()=>{const {db}=setup();const id=seedQuestions[0].id;for(const body of [{...answer,kind:'evidence'},{...answer,sourceUrl:'javascript:alert(1)'},{...answer,kind:'verified'},{...answer,observedAt:'2026-02-30'},{...answer,website:'bot'}])assert.equal((await request(db,'/api/questions/'+id+'/answers','POST',body)).status,400);assert.equal((await request(db,'/api/questions','POST',question,key,'https://evil.example')).status,403);assert.equal((await request(db,'/api/questions','POST',question,'short')).status,400);assert.equal((await request(db,'/api/questions','POST',{...question,title:'짧음'})).status,400);assert.equal((await request(db,'/api/questions/'+id,'DELETE')).status,403);});
test('retries do not duplicate content, special characters remain literal and read responses omit keys',async()=>{const {db}=setup();const q={...question,title:'<script>alert(1)</script> 질문 SQL % _ 확인'};const a=await request(db,'/api/questions','POST',q),b=await request(db,'/api/questions','POST',q);assert.equal(a.body.question.id,b.body.question.id);const r=await request(db,'/api/questions?q=SQL%20%25%20_');assert.equal(r.body.total,1);assert.equal(r.body.questions[0].title,q.title);assert(!JSON.stringify(r.body).includes('key_hash'));assert(!JSON.stringify(r.body).includes(key));});
test('concurrent revision attempts save one history record and surface a conflict',async()=>{const {db}=setup();let r=await request(db,'/api/questions/'+seedQuestions[0].id+'/answers','POST',answer);const id=r.body.answer.id;const responses=await Promise.all([request(db,'/api/answers/'+id,'PATCH',{...answer,body:'첫 번째 변경 내용을 충분한 길이로 저장합니다.',expectedRevision:1}),request(db,'/api/answers/'+id,'PATCH',{...answer,body:'두 번째 변경 내용을 충분한 길이로 저장합니다.',expectedRevision:1})]);assert.deepEqual(responses.map(r=>r.status).sort(),[200,409]);const detail=await request(db,'/api/questions/'+seedQuestions[0].id);assert.equal(detail.body.answers.find(a=>a.id===id).history.length,1);});
