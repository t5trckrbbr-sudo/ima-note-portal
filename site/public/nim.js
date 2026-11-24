const money=(n,d=1)=>Number(n).toLocaleString('ko-KR',{minimumFractionDigits:d,maximumFractionDigits:d});
const q=(n)=>money(n,2);
const state={period:'2027',noteBp:150,imaBp:120,companyBp:{}};
const cleanBp=(v,fallback)=>Number.isFinite(Number(v))&&v!==null&&v!==''?Math.max(0,Math.min(300,Number(v))):fallback;

/** An explicit average target takes priority; other balances remain annualized proxies. */
export function computeNim(D,opts={}){
 const period=opts.period==='2026'?'2026':'2027',noteBp=cleanBp(opts.noteBp,150),imaBp=cleanBp(opts.imaBp,120),companyBp=opts.companyBp||{};
 const rows=D.fundingForecast2027.companies.map(firm=>{
  const {key,name}=firm,actualDart=D.promNoteDart202609?.find(r=>r.key===key||r.firm===name),actualFisis=D.promNoteFisis202606.find(r=>r.firm===name);
  const [note,ima]=period==='2027'?[firm.promNoteYearEndTril,firm.imaYearEndTril]:actualDart?[actualDart.promNoteTril||0,actualDart.imaLiabTril||0]:[actualFisis?.promNoteTril||0,actualFisis?.imaTril||0];
  const hasAverage=period==='2027'&&Number.isFinite(firm.promNoteAverageTril);
  const noteIncomeBase=hasAverage?firm.promNoteAverageTril:note;
  const noteIncomeBasis=hasAverage?(firm.noteIncomeBasis||'average-target'):period==='2027'?'year-end-proxy':'snapshot-proxy';
  const bp=cleanBp(companyBp[key],noteBp),noteIncome=noteIncomeBase*bp,imaIncome=ima*imaBp;
  return {key,name,note,ima,noteIncomeBase,noteIncomeBasis,noteBp:bp,imaBp,noteIncome,imaIncome,total:noteIncome+imaIncome};
 });
 const totals=rows.reduce((t,r)=>({note:t.note+r.note,ima:t.ima+r.ima,noteIncomeBase:t.noteIncomeBase+r.noteIncomeBase,noteIncome:t.noteIncome+r.noteIncome,imaIncome:t.imaIncome+r.imaIncome,total:t.total+r.total}),{note:0,ima:0,noteIncomeBase:0,noteIncome:0,imaIncome:0,total:0});
 return {period,rows,totals,max:Math.max(0,...rows.map(r=>r.total))};
}
export function getNimScenario(D){return computeNim(D,state);}
const basisLabel=basis=>basis==='average-target'?'IR 평잔 목표':basis==='average-assumption'?'대시보드 평잔 가정':basis==='year-end-proxy'?'연말 잔액 대용':'분기말 잔액 대용';
const incomeBasisNote=c=>c.period==='2027'?'삼성·메리츠에는 각각 연말 잔액 4조 원과 수익 계산용 평잔 2조 원을 적용합니다. 메리츠는 전달받은 IR 목표이며 삼성은 동일한 대시보드 가정입니다. 다른 회사는 연말 잔액을 평균 운용잔액의 대용값으로 사용합니다.':'2026.3Q(OpenDART 확정)는 각 회사의 3분기말 확정 잔액을 연간 평균 운용잔액의 대용값으로 사용합니다. 실제 연간 손익이 아닌 연환산 규모입니다.';

export function renderNim(D){
 const c=getNimScenario(D);
 return `<section class="panel" id="nim-lab" style="scroll-margin-top:95px"><div class="panel-head"><div><div class="eyebrow">NIM SCENARIO · 수신에서 수익으로</div><h2>NIM을 가정하면, 회사별 수익 규모는?</h2><p>수익 계산용 잔액에 마진을 적용합니다. 삼성·메리츠는 평잔을 적용하고, 나머지 회사는 연말 잔액을 대용합니다.</p></div><span class="badge amber">사용자 가정</span></div>
 <div class="control-row"><label for="nim-period">잔액 기준</label><select id="nim-period"><option value="2027" ${state.period==='2027'?'selected':''}>2027 전망 · 삼성·메리츠 평잔 적용</option><option value="2026" ${state.period==='2026'?'selected':''}>2026.3Q 확정 잔액 (OpenDART)</option></select><button class="btn" id="nim-reset" type="button">가정 초기화 ↺</button><span class="badge blue">잔액 기준 구분 · 억 원/년</span></div>
 <div class="grid2"><div><label class="range-field" for="nim-note"><span>발행어음 공통 NIM 가정 <output id="nim-note-value">${q(state.noteBp/100)}% · ${state.noteBp}bp</output></span><input id="nim-note" type="range" min="0" max="300" step="5" value="${state.noteBp}"><span class="range-ends"><span>0.00%</span><span>3.00%</span></span></label><p class="muted" style="font-size:10px">공통 슬라이더를 바꾸면 아래 회사별 NIM도 모두 같은 값으로 재설정됩니다.</p></div>
 <div><label class="range-field" for="nim-ima"><span>IMA 수익 기여율 가정 <output id="nim-ima-value">${q(state.imaBp/100)}% · ${state.imaBp}bp</output></span><input id="nim-ima" type="range" min="0" max="300" step="5" value="${state.imaBp}"><span class="range-ends"><span>0.00%</span><span>3.00%</span></span></label><p class="muted" style="font-size:10px">IMA는 증권사에 귀속되는 보수·배분수익 기여율을 별도로 가정합니다.</p></div></div>
 <div class="grid3" style="margin-top:22px" aria-live="polite"><div class="metric" data-xray="kpi:margin-150-200" tabindex="0" role="button"><small>발행어음 · 연간 수익 시나리오</small><strong><span id="nim-note-total">${money(c.totals.noteIncome)}</span> <small>억 원</small></strong><p id="nim-note-balance">어음 잔액 ${q(c.totals.note)}조 · 수익 계산잔액 ${q(c.totals.noteIncomeBase)}조</p></div><div class="metric" data-xray="kpi:ima-kis-260" tabindex="0" role="button"><small>IMA · 연간 추정 수익 기여</small><strong><span id="nim-ima-total">${money(c.totals.imaIncome)}</span> <small>억 원</small></strong><p id="nim-ima-balance">IMA 잔액 ${q(c.totals.ima)}조 원</p></div><div class="metric" data-xray="kpi:forecast-85" tabindex="0" role="button" style="background:#ebf3fe;border-color:#bdd5f7"><small>합산 · 연간 추정 수익 기여</small><strong style="color:#004ea2"><span id="nim-all-total">${money(c.totals.total)}</span> <small>억 원</small></strong><p>전사 순영업수익과 구분하는 가정값</p></div></div>
 <div class="section-title"><h3>회사별 NIM을 직접 조정해 보세요</h3><span class="muted" style="font-size:10px">잔액 조 원 · 수익 억 원/년</span></div>
 <div class="table-wrap"><table class="data-table"><thead><tr><th scope="col">회사</th><th scope="col">어음 잔액<br><small>2027E는 연말</small></th><th scope="col">어음 수익 계산잔액</th><th scope="col">IMA 잔액</th><th scope="col">어음 NIM 가정</th><th scope="col">어음 순이자수익</th><th scope="col">IMA 수익 기여</th><th scope="col">합산 수익 기여</th></tr></thead><tbody>${c.rows.map(r=>`<tr data-nim-row="${r.key}"><td><button type="button" class="xray-token" data-xray="nim-firm:${r.key}"><b>${r.name}</b></button></td><td data-nim-note="${r.key}">${q(r.note)}</td><td><b data-nim-base="${r.key}">${q(r.noteIncomeBase)}</b><br><small data-nim-basis="${r.key}">${basisLabel(r.noteIncomeBasis)}</small></td><td data-nim-ima="${r.key}">${q(r.ima)}</td><td><label style="display:inline-flex;align-items:center;gap:4px"><span class="sr-only">${r.name} 발행어음 NIM 가정, 퍼센트</span><input data-nim-input="${r.key}" type="number" min="0" max="3" step="0.01" value="${(r.noteBp/100).toFixed(2)}" style="width:66px;border:1px solid #cddff7;border-radius:5px;padding:6px;text-align:right;background:#f5f8fe;color:#004ea2" aria-describedby="nim-input-note"><span>%</span></label></td><td data-nim-note-income="${r.key}">${money(r.noteIncome)}</td><td data-nim-ima-income="${r.key}">${money(r.imaIncome)}</td><td style="min-width:140px"><b data-nim-income="${r.key}">${money(r.total)}</b><div class="bar-track" style="margin-top:7px"><div class="bar-fill" data-nim-bar="${r.key}" style="width:${c.max?r.total/c.max*100:0}%;background:#004ea2"></div></div></td></tr>`).join('')}</tbody><tfoot><tr><th scope="row">합계</th><td id="nim-foot-note">${q(c.totals.note)}</td><td id="nim-foot-base">${q(c.totals.noteIncomeBase)}</td><td id="nim-foot-ima">${q(c.totals.ima)}</td><td>회사별 가정 적용</td><td id="nim-foot-note-income">${money(c.totals.noteIncome)}</td><td id="nim-foot-ima-income">${money(c.totals.imaIncome)}</td><td><b id="nim-foot-total">${money(c.totals.total)}</b></td></tr></tfoot></table></div>
 <p id="nim-input-note" class="muted" style="font-size:10px;margin-top:10px">회사별 NIM은 0~3% 범위에서 입력합니다. 막대는 합산 수익 기여가 가장 큰 회사 대비 규모입니다.</p><p id="nim-validation" role="status" style="font-size:11px;color:#b05a39;min-height:18px"></p>
 <div class="callout" id="nim-basis-note">${incomeBasisNote(c)}</div>
 <div class="callout" style="font-size:11px"><b>계산식 · 수익 계산잔액(조 원) × 마진(bp) = 연간 수익 시나리오(억 원)</b><br>예를 들어 삼성과 메리츠는 각각 평잔 2조 원 × NIM 150bp(1.50%) = 연 300억 원입니다. IMA에는 별도 수익 기여율을 적용합니다.</div>
 <div class="source"><b>출처 및 산정방식</b> · 2026.3Q 잔액은 OpenDART 분기보고서, 다른 회사의 2027E 전망은 대시보드 수신 모형을 사용합니다. 메리츠는 2026.11.17 사용자 전달 IR 목표(발행어음 평잔 2조·연말 4조)를 반영했습니다. IR 원문 링크는 별도 확인 전입니다.<br>
 전망은 어음 ${q(D.globalKpis.promNote27EstTril)}조·IMA ${q(D.globalKpis.ima27EstTril)}조, 합산 ${q(D.globalKpis.promNoteIma27EstTril)}조입니다. 삼성의 연말 4조 원과 평잔 2조 원은 메리츠와 같게 둔 가정입니다.<br>
 삼성과 메리츠의 수익 계산에는 각각 평잔 2조 원을 적용합니다. 다른 회사는 선택 시점 잔액을 1년 평균 운용잔액으로 대용한 <b>연환산 규모</b>이므로 합계를 실제 2027년 연간 손익 전망으로 해석하지 않습니다. 수신액 100% 운용을 가정합니다.<br>
 어음 NIM은 조달비용 차감 후, 판관비·충당금·세금 전 가정입니다. 표준 NIM의 평균 이자수익자산 분모와 달리 수신 잔액을 대용합니다. IMA 운용수익 전부가 증권사 수익은 아니므로 보수·배분수익 기여율을 분리했고, 합산은 <b>추정 수익 기여</b>입니다. 기본 150bp·120bp는 예시 가정이며 실제 회사별 실적이 아닙니다.<br>
 모험자본 기회비용은 자동으로 추가 차감하지 않습니다. 이미 NIM에 반영했는지 먼저 확인하세요. <a href="#sources">원천·검토 사항 ↗</a></div></section>`;
}

export function bindNim(D){
 const root=document.getElementById('nim-lab');if(!root)return;
 const $=s=>root.querySelector(s),inputs=[...root.querySelectorAll('[data-nim-input]')];
 const update=()=>{const c=getNimScenario(D);
  $('#nim-note-value').textContent=`${q(state.noteBp/100)}% · ${state.noteBp}bp`;$('#nim-ima-value').textContent=`${q(state.imaBp/100)}% · ${state.imaBp}bp`;
  const set=(id,value)=>$('#'+id).textContent=value;
  set('nim-note-total',money(c.totals.noteIncome));set('nim-ima-total',money(c.totals.imaIncome));set('nim-all-total',money(c.totals.total));
  set('nim-note-balance',`어음 잔액 ${q(c.totals.note)}조 · 수익 계산잔액 ${q(c.totals.noteIncomeBase)}조`);set('nim-ima-balance',`IMA 잔액 ${q(c.totals.ima)}조 원`);
  set('nim-foot-note',q(c.totals.note));set('nim-foot-base',q(c.totals.noteIncomeBase));set('nim-basis-note',incomeBasisNote(c));set('nim-foot-ima',q(c.totals.ima));set('nim-foot-note-income',money(c.totals.noteIncome));set('nim-foot-ima-income',money(c.totals.imaIncome));set('nim-foot-total',money(c.totals.total));
  c.rows.forEach(r=>{[['note',q(r.note)],['base',q(r.noteIncomeBase)],['basis',basisLabel(r.noteIncomeBasis)],['ima',q(r.ima)],['note-income',money(r.noteIncome)],['ima-income',money(r.imaIncome)],['income',money(r.total)]].forEach(([key,value])=>{$(`[data-nim-${key}="${r.key}"]`).textContent=value;});$(`[data-nim-bar="${r.key}"]`).style.width=(c.max?r.total/c.max*100:0)+'%';});
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
