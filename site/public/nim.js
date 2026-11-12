const money=(n,d=1)=>Number(n).toLocaleString('ko-KR',{minimumFractionDigits:d,maximumFractionDigits:d});
const q=(n)=>money(n,2);
const plan={kis:[26.9,4],kb:[12.8,0],mirae:[12.5,.5],nh:[10,.5],kiwoom:[6,0],hana:[4.5,0],shinhan:[3.3,0],potential:[2,0]};
const state={period:'2027',noteBp:150,imaBp:120,companyBp:{}};
const cleanBp=(v,fallback)=>Number.isFinite(Number(v))&&v!==null&&v!==''?Math.max(0,Math.min(300,Number(v))):fallback;

/** Snapshot balances proxy one full year's average deployed balance; not fiscal-year earnings. */
export function computeNim(D,opts={}){
 const period=opts.period==='2026'?'2026':'2027',noteBp=cleanBp(opts.noteBp,150),imaBp=cleanBp(opts.imaBp,120),companyBp=opts.companyBp||{};
 const rows=Object.keys(plan).map(key=>{
  const firm=D.opportunityCost2027.find(r=>r.key===key);
  const actual=D.promNoteFisis202606.find(r=>r.firm===firm.name);
  const [note,ima]=period==='2027'?plan[key]:[actual?.promNoteTril||0,actual?.imaTril||0];
  const bp=cleanBp(companyBp[key],noteBp),noteIncome=note*bp,imaIncome=ima*imaBp;
  return {key,name:firm.name,note,ima,noteBp:bp,imaBp,noteIncome,imaIncome,total:noteIncome+imaIncome};
 });
 const totals=rows.reduce((t,r)=>({note:t.note+r.note,ima:t.ima+r.ima,noteIncome:t.noteIncome+r.noteIncome,imaIncome:t.imaIncome+r.imaIncome,total:t.total+r.total}),{note:0,ima:0,noteIncome:0,imaIncome:0,total:0});
 return {period,rows,totals,max:Math.max(0,...rows.map(r=>r.total))};
}

export function renderNim(D){
 const c=computeNim(D,state);
 return `<section class="panel" id="nim-lab" style="scroll-margin-top:95px"><div class="panel-head"><div><div class="eyebrow">NIM SCENARIO · 수신에서 수익으로</div><h2>NIM을 가정하면, 회사별 수익 규모는?</h2><p>수신 잔액에 마진을 적용해 발행어음 순이자수익과 IMA 수익 기여를 각각 비교합니다.</p></div><span class="badge amber">사용자 가정</span></div>
 <div class="control-row"><label for="nim-period">잔액 기준</label><select id="nim-period"><option value="2027" ${state.period==='2027'?'selected':''}>2027년 말 전망 잔액</option><option value="2026" ${state.period==='2026'?'selected':''}>2026.2Q 제공 잔액</option></select><button class="btn" id="nim-reset" type="button">가정 초기화 ↺</button><span class="badge green">연환산 · 억 원/년</span></div>
 <div class="grid2"><div><label class="range-field" for="nim-note"><span>발행어음 공통 NIM 가정 <output id="nim-note-value">${q(state.noteBp/100)}% · ${state.noteBp}bp</output></span><input id="nim-note" type="range" min="0" max="300" step="5" value="${state.noteBp}"><span class="range-ends"><span>0.00%</span><span>3.00%</span></span></label><p class="muted" style="font-size:10px">공통 슬라이더를 바꾸면 아래 회사별 NIM도 모두 같은 값으로 재설정됩니다.</p></div>
 <div><label class="range-field" for="nim-ima"><span>IMA 수익 기여율 가정 <output id="nim-ima-value">${q(state.imaBp/100)}% · ${state.imaBp}bp</output></span><input id="nim-ima" type="range" min="0" max="300" step="5" value="${state.imaBp}"><span class="range-ends"><span>0.00%</span><span>3.00%</span></span></label><p class="muted" style="font-size:10px">IMA는 증권사에 귀속되는 보수·배분수익 기여율을 별도로 가정합니다.</p></div></div>
 <div class="grid3" style="margin-top:22px" aria-live="polite"><div class="metric"><small>발행어음 · 연간 추정 순이자수익</small><strong><span id="nim-note-total">${money(c.totals.noteIncome)}</span> <small>억 원</small></strong><p id="nim-note-balance">발행어음 잔액 ${q(c.totals.note)}조 원</p></div><div class="metric"><small>IMA · 연간 추정 수익 기여</small><strong><span id="nim-ima-total">${money(c.totals.imaIncome)}</span> <small>억 원</small></strong><p id="nim-ima-balance">IMA 잔액 ${q(c.totals.ima)}조 원</p></div><div class="metric" style="background:#eaf6f1;border-color:#c7e3dc"><small>합산 · 연간 추정 수익 기여</small><strong style="color:#087f80"><span id="nim-all-total">${money(c.totals.total)}</span> <small>억 원</small></strong><p>전사 순영업수익과 구분하는 가정값</p></div></div>
 <div class="section-title"><h3>회사별 NIM을 직접 조정해 보세요</h3><span class="muted" style="font-size:10px">잔액 조 원 · 수익 억 원/년</span></div>
 <div class="table-wrap"><table class="data-table"><thead><tr><th scope="col">회사</th><th scope="col">어음 잔액</th><th scope="col">IMA 잔액</th><th scope="col">어음 NIM 가정</th><th scope="col">어음 순이자수익</th><th scope="col">IMA 수익 기여</th><th scope="col">합산 수익 기여</th></tr></thead><tbody>${c.rows.map(r=>`<tr data-nim-row="${r.key}"><td><b>${r.name}</b></td><td data-nim-note="${r.key}">${q(r.note)}</td><td data-nim-ima="${r.key}">${q(r.ima)}</td><td><label style="display:inline-flex;align-items:center;gap:4px"><span class="sr-only">${r.name} 발행어음 NIM 가정, 퍼센트</span><input data-nim-input="${r.key}" type="number" min="0" max="3" step="0.01" value="${(r.noteBp/100).toFixed(2)}" style="width:66px;border:1px solid #d9e5e5;border-radius:5px;padding:6px;text-align:right;background:#f8fcfa;color:#087f80" aria-describedby="nim-input-note"><span>%</span></label></td><td data-nim-note-income="${r.key}">${money(r.noteIncome)}</td><td data-nim-ima-income="${r.key}">${money(r.imaIncome)}</td><td style="min-width:140px"><b data-nim-income="${r.key}">${money(r.total)}</b><div class="bar-track" style="margin-top:7px"><div class="bar-fill" data-nim-bar="${r.key}" style="width:${c.max?r.total/c.max*100:0}%;background:#087f80"></div></div></td></tr>`).join('')}</tbody><tfoot><tr><th scope="row">합계</th><td id="nim-foot-note">${q(c.totals.note)}</td><td id="nim-foot-ima">${q(c.totals.ima)}</td><td>회사별 가정 적용</td><td id="nim-foot-note-income">${money(c.totals.noteIncome)}</td><td id="nim-foot-ima-income">${money(c.totals.imaIncome)}</td><td><b id="nim-foot-total">${money(c.totals.total)}</b></td></tr></tfoot></table></div>
 <p id="nim-input-note" class="muted" style="font-size:10px;margin-top:10px">회사별 NIM은 0~3% 범위에서 입력합니다. 막대는 합산 수익 기여가 가장 큰 회사 대비 규모입니다.</p><p id="nim-validation" role="status" style="font-size:11px;color:#b05a39;min-height:18px"></p>
 <div class="callout" style="font-size:11px"><b>계산식 · 잔액(조 원) × 마진(bp) = 연환산 수익(억 원)</b><br>예: 발행어음 1조 원 × NIM 150bp(1.50%) = 연간 순이자수익 150억 원. IMA에는 별도 수익 기여율을 적용합니다.</div>
 <div class="source"><b>출처 및 산정방식</b> · 잔액은 저장소 <code>promNoteFisis202606</code>와 원문 Module C-1. 2027E 어음 78조·IMA 5조의 회사별 구분을 사용하며 잠재 삼성·메리츠는 원문의 합산 2조를 유지합니다.<br>
 선택 시점 잔액을 1년 평균 운용잔액으로 가정한 <b>연환산 규모</b>입니다. 2027년 말 잔액 선택 시 연말 수익 창출 규모를 뜻하며, 실제 2027년 연간 손익 전망이 아닙니다. 수신액 100% 운용을 가정합니다.<br>
 어음 NIM은 조달비용 차감 후, 판관비·충당금·세금 전 가정입니다. 표준 NIM의 평균 이자수익자산 분모와 달리 수신 잔액을 대용합니다. IMA 운용수익 전부가 증권사 수익은 아니므로 보수·배분수익 기여율을 분리했고, 합산은 <b>추정 수익 기여</b>입니다. 기본 150bp·120bp는 예시 가정이며 실제 회사별 실적이 아닙니다.<br>
 모험자본 기회비용은 자동으로 추가 차감하지 않습니다. 이미 NIM에 반영했는지 먼저 확인하세요. <a href="#sources">원천·검토 사항 ↗</a></div></section>`;
}

export function bindNim(D){
 const root=document.getElementById('nim-lab');if(!root)return;
 const $=s=>root.querySelector(s),inputs=[...root.querySelectorAll('[data-nim-input]')];
 const update=()=>{const c=computeNim(D,state);
  $('#nim-note-value').textContent=`${q(state.noteBp/100)}% · ${state.noteBp}bp`;$('#nim-ima-value').textContent=`${q(state.imaBp/100)}% · ${state.imaBp}bp`;
  const set=(id,value)=>$('#'+id).textContent=value;
  set('nim-note-total',money(c.totals.noteIncome));set('nim-ima-total',money(c.totals.imaIncome));set('nim-all-total',money(c.totals.total));
  set('nim-note-balance',`발행어음 잔액 ${q(c.totals.note)}조 원`);set('nim-ima-balance',`IMA 잔액 ${q(c.totals.ima)}조 원`);
  set('nim-foot-note',q(c.totals.note));set('nim-foot-ima',q(c.totals.ima));set('nim-foot-note-income',money(c.totals.noteIncome));set('nim-foot-ima-income',money(c.totals.imaIncome));set('nim-foot-total',money(c.totals.total));
  c.rows.forEach(r=>{[['note',q(r.note)],['ima',q(r.ima)],['note-income',money(r.noteIncome)],['ima-income',money(r.imaIncome)],['income',money(r.total)]].forEach(([key,value])=>{$(`[data-nim-${key}="${r.key}"]`).textContent=value;});$(`[data-nim-bar="${r.key}"]`).style.width=(c.max?r.total/c.max*100:0)+'%';});
 };
 const clearErrors=()=>{inputs.forEach(x=>x.removeAttribute('aria-invalid'));$('#nim-validation').textContent='';};
 $('#nim-note').addEventListener('input',()=>{state.noteBp=cleanBp($('#nim-note').value,150);state.companyBp={};inputs.forEach(x=>x.value=(state.noteBp/100).toFixed(2));clearErrors();update();});
 $('#nim-ima').addEventListener('input',()=>{state.imaBp=cleanBp($('#nim-ima').value,120);update();});
 $('#nim-period').addEventListener('change',()=>{state.period=$('#nim-period').value;update();});
 inputs.forEach(input=>{input.addEventListener('input',()=>{const value=input.valueAsNumber;
  if(!Number.isFinite(value)||value<0||value>3){input.setAttribute('aria-invalid','true');$('#nim-validation').textContent='NIM은 0~3%의 숫자로 입력해 주세요. 수정 전 유효한 가정으로 계산 중입니다.';return;}
  input.removeAttribute('aria-invalid');if(!inputs.some(x=>x.getAttribute('aria-invalid')==='true'))$('#nim-validation').textContent='';state.companyBp[input.dataset.nimInput]=value*100;update();
 });input.addEventListener('blur',()=>{if(input.getAttribute('aria-invalid')==='true'){input.value=(cleanBp(state.companyBp[input.dataset.nimInput],state.noteBp)/100).toFixed(2);input.removeAttribute('aria-invalid');if(!inputs.some(x=>x.getAttribute('aria-invalid')==='true'))$('#nim-validation').textContent='';}});});
 $('#nim-reset').addEventListener('click',()=>{state.period='2027';state.noteBp=150;state.imaBp=120;state.companyBp={};$('#nim-period').value='2027';$('#nim-note').value='150';$('#nim-ima').value='120';inputs.forEach(x=>x.value='1.50');clearErrors();update();});
 update();
}
