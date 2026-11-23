import {renderDetail,bindDetail} from './details.js';
import {renderNim,bindNim} from './nim.js';
import {renderQuestions,bindQuestions} from './qa.js';
import {calcCost,explorerState,getSamsungScenario,setSamsungScenario,renderFundingBreakdownPanel,bindFundingBreakdownPanel,renderMoneyMoveSafetyPanel,bindMoneyMoveSafetyPanel,renderVentureDeepDive,renderHouseholdWealthPage,bindHouseholdWealthPage} from './curiosity.js';
import {renderBearFlatStrategy} from './funding-strategy.js';
import {initXraySystem,recordTrailStep,renderTrailHtml} from './xray.js';
const $=s=>document.querySelector(s),fmt=(n,d=2)=>Number(n).toLocaleString('ko-KR',{minimumFractionDigits:d,maximumFractionDigits:d}),navigateTo=tab=>{location.hash=tab;};
const topicXrayKeys=['kpi:forecast-85','kpi:reg-cap-300','kpi:vc-mandate-20','kpi:actual-5854','kpi:mrmc-qstar','kpi:ima-kis-260','kpi:ib-debt-472','kpi:kis-mirae-lev'];
const nav=[['map','한눈에 보기','◈'],['questions','질문 · 답변','?'],['funding','수신 · NIM · 2027 전망','↗'],['household-wealth','가계자산 · 5개국 비교','◎'],['pnl','발행어음 · 운용규제','▤'],['invest','모험자본 · 비용 계산기','⊞'],['ima-maturity','IMA · 만기 타임라인','◷'],['ib-funding','9대 증권사 조달 비교','▥'],['kis-mirae','한국투자 vs 미래에셋','⇄'],['pension-risk','리스크점검','◇'],['sources','출처 · 데이터 검토','▧']];
const topics=[
{title:'시장은 얼마나 커질까?',label:'수신 · 조달금리',subtitle:'시장 성장과 2027년 전망',icon:'↗',id:'funding',value:'',unit:'조 원',tag:'2027E · 수정 가정',answer:'시장 전망 가정을 불러옵니다.',law:'FISIS SF325 · 원문 전망모형',pct:94},
{title:'어떤 규칙이 적용될까?',label:'규제 · 근거법령',subtitle:'조달한도와 자산 운용의 조건',icon:'⚖',id:'sources',value:'300',unit:'%',tag:'어음 + IMA 통합 한도',answer:'자료에 제시된 자기자본 대비 통합 조달한도입니다. 발행어음 단독 한도 200%와 구분해 봐야 합니다.',law:'자본시장법 시행령 제77조의6',pct:67},
{title:'성장의 비용은 얼마일까?',label:'모험자본 · 기회비용',subtitle:'20% 의무와 30% 인정 상한',icon:'⊞',id:'invest',value:'',unit:'억 원/년',tag:'수정 모형 · 가정 계산',answer:'선택한 수신 전망과 기준선으로 기회비용을 계산합니다.',law:'원문 Module C · 시뮬레이션',pct:70},
{title:'누가 얼마나 발행했을까?',label:'어음 공시 · 운용규제',subtitle:'7개 인가사의 발행 현황',icon:'▤',id:'pnl',value:'55.94',unit:'조 원',tag:'2026.2Q · 제공 실적',answer:'7개사의 발행어음 합계입니다. IMA 2.60조 원은 별도이며, 전사 조달잔액과 구분합니다.',law:'FISIS SF325:A13 · 제공 데이터',pct:45.8},
{title:'계속 늘리는 게 유리할까?',label:'최적규모 · 자본효율',subtitle:'한계수익과 한계비용의 균형',icon:'⌁',id:'invest',value:'MR = MC',unit:'',tag:'최적규모 Q* · 개념 모형',answer:'모험자본 소싱과 조달금리 부담을 함께 봐야 합니다. 실제 최적규모는 회사별 한계수익·비용 자료가 있어야 산출할 수 있습니다.',law:'원문 Module C · 개념 설명',pct:50},
{title:'언제 만기가 몰릴까?',label:'IMA · 만기집중',subtitle:'2027.12–2028.04 차환 점검',icon:'◷',id:'ima-maturity',value:'2.60',unit:'조 원',tag:'한국투자 IMA 1~4호',answer:'자료에 수록된 초기 4개 회차가 5개월 사이 만기를 맞습니다. 전체 IMA 시장이 아닌 해당 회차의 집중도입니다.',law:'원문 Module D · 상품 일정',pct:100},
{title:'증권사마다 전략이 다를까?',label:'9대 증권사 · 조달전략',subtitle:'7개 조달수단을 한눈에 비교',icon:'▥',id:'ib-funding',value:'472.75',unit:'조 원',tag:'전사 기준 · 9사 차입부채',answer:'RP, 발행어음, ELS·DLS 등의 구성비를 비교합니다. 고객예수금 158.50조 원은 이 합계와 분리합니다.',law:'FISIS SF325 · 전사 기준',pct:31},
{title:'한투와 미래, 무엇이 다를까?',label:'한투 vs 미래 · 수익구조',subtitle:'레버리지와 이자손익의 차이',icon:'⇄',id:'kis-mirae',value:'10.5 / 13.6',unit:'배',tag:'전사 기준 · 순수 회계 레버리지',answer:'자산을 자기자본으로 나눈 배수입니다. 규제 레버리지와 구분하고, 전사 이자손익으로 발행어음 자체 수익성을 단정하지 않습니다.',law:'FISIS SF304 · SF331 · SF321',pct:77}
];
let D,selectedTopic=0,routeCleanup=null,lastRoutedUrl='',pendingScrollId='';
function fundingMetrics(){const k=D.globalKpis,total=k.promNoteIma27EstTril,actual=k.promNoteIma26Q3ExactTril||k.promNoteIma26Q2ExactTril,noteActual=k.promNote26Q3ExactTril||k.promNote26Q2ExactTril,imaActual=k.ima26Q3ExactTril||k.ima26Q2ExactTril,actualQ2=k.promNoteIma26Q2ExactTril,model=k.promNoteIma26Q2SimBaseTril;return {total,actual,noteActual,imaActual,actualQ2,model,note:k.promNote27EstTril,ima:k.ima27EstTril,actualGrowth:(total/actual-1)*100,modelGrowth:(total/model-1)*100,cost:calcCost({q26Base:actual,q27Est:total}).cost};}
function syncForecastCopy(){const f=fundingMetrics();Object.assign(topics[0],{value:fmt(f.total,1),tag:'2027E · 수정 가정',answer:`발행어음 ${fmt(f.note,0)}조 원과 IMA ${fmt(f.ima,0)}조 원. 메리츠 연말 목표 4조 원을 반영해 '26.3Q 확정(${fmt(f.actual)}조) 대비 +${fmt(f.actualGrowth,1)}% 성장을 가정합니다.`,law:'OpenDART 26.3Q · 원문 모형 + 메리츠 IR 목표'});Object.assign(topics[2],{value:fmt(f.cost,0),tag:'수정 모형 · 26.3Q 기준',answer:`'26.3Q 기준 신규 수신 ${fmt(f.total-f.actual)}조의 20%와 기존 잔액 ${fmt(f.actual)}조의 10%p 상승분에 순스프레드 차이 150bp를 적용한 비용입니다.`});for(const item of searchItems){const topic=topics.find(t=>t.title===item.title);if(topic)item.desc=topic.label+' '+topic.answer;}}
function pulseScrollTo(targetId){if(!targetId)return false;const el=document.getElementById(targetId);if(!el)return false;el.scrollIntoView({behavior:'smooth',block:'start'});el.classList.remove('xray-pulse');void el.offsetWidth;el.classList.add('xray-pulse');setTimeout(()=>el.classList.remove('xray-pulse'),1300);return true;}
function refreshBreadcrumb(){const raw=location.hash.slice(1)||'map',id=nav.some(n=>n[0]===raw)?raw:'map',label=nav.find(n=>n[0]===id)[1],firmName=(D?.ib9FirmsCuriosityChain||[]).find(x=>x.key===explorerState.firmKey)?.firm||'';recordTrailStep({id,label,firmName,href:location.search?location.search+location.hash:'#'+id});const bc=$('.breadcrumb');if(bc)bc.innerHTML=renderTrailHtml(id,label,firmName);else if($('#crumb'))$('#crumb').textContent=label;}

const source=(text,xrayKey='')=>`<div class="source"><b>출처 및 산정방식</b> · ${text} ${xrayKey?`<button type="button" class="source-xray-btn" data-xray="${xrayKey}">산식·근거 열기</button> · `:''}<a href="#sources">원천·검토 사항 ↗</a></div>`;
const next=(id,q)=>`<a class="next-question" href="#${id}"><span><small>이어서 살펴볼 질문</small>${q}</span><span>다음으로 →</span></a>`;
const heading=(eyebrow,title,desc)=>`<div class="page-heading"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p>${desc}</p></div><div class="date-tag">재무·잔액 <strong>2026.3Q</strong> <span> / 세부의무 2026.2Q</span></div></div>`;
function trendChart(compact=false){const tr=D.promNoteImaTrend,n=tr.length,lastAct=n-2,w=compact?540:850,h=compact?200:280,left=40,right=w-30,bottom=h-35,top=24;const pts=tr.map((x,i)=>[left+i*(right-left)/(n-1),bottom-x.total/90*(bottom-top)]);let area=`M${left},${bottom} L`+pts.slice(0,lastAct+1).map(p=>p.join(',')).join(' L')+` L${pts[lastAct][0]},${bottom}Z`;const labels=tr.map(x=>x.period.includes('2026.2Q')?'26.2Q':x.period.includes('2026.3Q')?'26.3Q':x.period.includes('2027E')?'2027E':x.period);return `<svg class="chart-svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="발행어음과 IMA 합산 잔액 2021년 23.2조에서 2026년 3분기 ${fmt(tr[lastAct].total)}조, 2027년 전망 ${fmt(tr[n-1].total,0)}조"><defs><linearGradient id="trendFade" x1="0" x2="0" y1="0" y2="1"><stop stop-color="#b9d4f7" stop-opacity=".55"/><stop offset="1" stop-color="#f0f6fe" stop-opacity=".15"/></linearGradient></defs><rect x="${pts[lastAct][0]+10}" y="10" width="${right-pts[lastAct][0]+8}" height="${bottom-10}" fill="#f3f7fd" rx="4"/>${[0,30,60,90].map(v=>{let y=bottom-v/90*(bottom-top);return `<line x1="${left}" x2="${right}" y1="${y}" y2="${y}" stroke="#e4ebf5" stroke-dasharray="3 4"/><text x="${left-10}" y="${y+3}" text-anchor="end" font-size="9" fill="#8b9ab0">${v}</text>`}).join('')}<path d="${area}" fill="url(#trendFade)"/><polyline points="${pts.slice(0,lastAct+1).map(p=>p.join(',')).join(' ')}" fill="none" stroke="#004ea2" stroke-width="2.4"/><line x1="${pts[lastAct][0]}" y1="${pts[lastAct][1]}" x2="${pts[n-1][0]}" y2="${pts[n-1][1]}" stroke="#004ea2" stroke-width="2.4" stroke-dasharray="5 5"/>${pts.map((p,i)=>`<g class="xray-svg-pt" data-xray="trend:${i}" tabindex="0" role="button" aria-label="${labels[i]} 합산 수신 ${tr[i].total}조 원 상세 분해"><circle cx="${p[0]}" cy="${p[1]}" r="13" fill="transparent"/><circle cx="${p[0]}" cy="${p[1]}" r="${i===n-1?4.2:i===lastAct?3.8:3}" fill="white" stroke="${i===n-1?'#e88300':'#004ea2'}" stroke-width="2.2"/><text x="${p[0]}" y="${p[1]-12}" text-anchor="middle" font-size="${i===n-1?13:10}" fill="${i===n-1?'#004ea2':i===lastAct?'#0f223d':'#687890'}" font-weight="${i>=lastAct?700:400}">${tr[i].total}</text><text x="${p[0]}" y="${bottom+23}" text-anchor="middle" font-size="9" fill="${i===n-1?'#004ea2':i===lastAct?'#0f223d':'#8b9ab0'}" font-weight="${i>=lastAct?700:400}">${labels[i]}</text></g>`).join('')}</svg>`}
function mapTopDownFlow(D){
const f=fundingMetrics(),k=D.globalKpis,hw=D.householdWealthAndIntl2026?.headlineKpis||{};
const noteShare=((f.noteActual/(hw.krFinAssets26Q2Tril||6930.21))*100).toFixed(2);
const imaShare=((f.imaActual/(hw.krFinAssets26Q2Tril||6930.21))*100).toFixed(2);
const noteDepShare=((f.noteActual/(hw.krDeposits26Q2Tril||2688.07))*100).toFixed(2);
const imaDepShare=((f.imaActual/(hw.krDeposits26Q2Tril||2688.07))*100).toFixed(2);
return `<section class="map-topdown-panel" id="map-topdown-flow">
<div class="map-topdown-head">
  <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
    <span class="badge blue">TOP-DOWN 자금 지도</span>
    <h2 style="font-size:16px">거시 경제(GDP)에서 발행어음 · IMA까지 — 한국 가계자산 자금 흐름도</h2>
  </div>
  <a href="#household-wealth" class="btn" style="padding:6px 11px;font-size:11px;color:#004ea2">가계자산 상세 · 5개국 비교 ↗</a>
</div>
<div class="map-topdown-svg-wrap">
  <svg viewBox="0 0 960 402" role="img" aria-label="명목 GDP 2,676.7조에서 가계 총자산 16,641.3조, 부동산 10,433.7조와 금융자산 6,930.2조를 거쳐 발행어음 57.24조와 IMA 4.09조로 이어지는 Top-Down 자금 흐름도">
    <text x="10" y="42" font-size="11.5" font-weight="800" fill="#64748b">STEP 1</text>
    <text x="10" y="58" font-size="11" fill="#8a99ae">소득·총자산</text>
    <text x="10" y="138" font-size="11.5" font-weight="800" fill="#64748b">STEP 2</text>
    <text x="10" y="154" font-size="11" fill="#8a99ae">실물 vs 금융</text>
    <text x="10" y="236" font-size="11.5" font-weight="800" fill="#004ea2">STEP 3</text>
    <text x="10" y="252" font-size="11" fill="#5e6e85">금융 4대 축</text>
    <text x="10" y="346" font-size="11.5" font-weight="800" fill="#e07c00">STEP 4</text>
    <text x="10" y="362" font-size="11" fill="#5e6e85">종투사 수신</text>

    <g class="flow-node" data-map-jump="household-wealth" tabindex="0" role="button">
      <rect x="96" y="14" width="248" height="62" rx="9" fill="#f3f6fb" stroke="#cbd6e6" stroke-width="1.5"/>
      <text x="112" y="35" font-size="11.5" font-weight="700" fill="#5e6e85">국내 명목 GDP (연간 현금유입 원천)</text>
      <text x="112" y="61" font-size="19.5" font-weight="800" fill="#0f223d">2,676.7조 원</text>
      <text x="330" y="61" text-anchor="end" font-size="11.5" font-weight="600" fill="#64748b">'25년</text>
    </g>
    <path d="M344 45 L418 45" stroke="#004ea2" stroke-width="2" stroke-dasharray="4 3" fill="none"/>
    <polygon points="424,45 415,40 415,50" fill="#004ea2"/>
    <text x="384" y="37" text-anchor="middle" font-size="11" font-weight="700" fill="#004ea2">소득 누적</text>
    <text x="384" y="63" text-anchor="middle" font-size="11" font-weight="600" fill="#5e6e85">GDP 6.22배</text>
    <g class="flow-node" data-map-jump="household-wealth" tabindex="0" role="button">
      <rect x="426" y="12" width="516" height="66" rx="10" fill="#0a1e3c"/>
      <text x="446" y="35" font-size="11.5" font-weight="700" fill="#9fc2ee">한국 가계 · 비영리 총자산 (국민대차대조표 · '25년 말)</text>
      <text x="446" y="63" font-size="21.5" font-weight="800" fill="#ffffff">16,641.3조 원</text>
      <text x="922" y="42" text-anchor="end" font-size="11.5" fill="#bfd6f6">순자산 14,200.5조</text>
      <text x="922" y="61" text-anchor="end" font-size="11.5" fill="#8ea5c4">금융부채 2,440.9조</text>
    </g>

    <path d="M580 78 C580 96, 260 88, 260 110" stroke="#94a3b8" stroke-width="2" fill="none"/>
    <polygon points="260,113 255,105 265,105" fill="#94a3b8"/>
    <path d="M684 78 C684 96, 684 96, 684 110" stroke="#004ea2" stroke-width="2.5" fill="none"/>
    <polygon points="684,113 679,105 689,105" fill="#004ea2"/>

    <g class="flow-node" data-map-jump="household-wealth" tabindex="0" role="button">
      <rect x="96" y="114" width="328" height="68" rx="9" fill="#f8fafc" stroke="#cbd6e6" stroke-width="1.5"/>
      <text x="112" y="135" font-size="11.5" font-weight="700" fill="#5e6e85">부동산 · 비금융(실물)자산</text>
      <rect x="354" y="121" width="56" height="20" rx="4" fill="#e8eef6"/>
      <text x="382" y="135" text-anchor="middle" font-size="11.5" font-weight="800" fill="#475569">62.7%</text>
      <text x="112" y="160" font-size="18.5" font-weight="800" fill="#334155">10,433.7조 원</text>
      <text x="112" y="175" font-size="11" fill="#64748b">토지 7,418.6 · 주택·건물 2,833.0조 ('25말)</text>
    </g>
    <g class="flow-node" data-map-jump="household-wealth" tabindex="0" role="button">
      <rect x="444" y="114" width="498" height="68" rx="9" fill="#ebf3fe" stroke="#004ea2" stroke-width="2"/>
      <text x="462" y="135" font-size="11.5" font-weight="800" fill="#004ea2">가계 금융자산 (자금순환 '26.2Q 최신 확정)</text>
      <rect x="822" y="121" width="104" height="20" rx="4" fill="#004ea2"/>
      <text x="874" y="135" text-anchor="middle" font-size="11" font-weight="800" fill="#ffffff">37.3% → 확장</text>
      <text x="462" y="161" font-size="20.5" font-weight="800" fill="#0f223d">6,930.2조 원</text>
      <text x="926" y="161" text-anchor="end" font-size="11.5" font-weight="600" fill="#3b557a">'25말 6,207.6조 대비 +722.6조</text>
      <text x="462" y="176" font-size="11" fill="#4b6282">※ 금융자산 내부에서 은행예금 이탈 → 증시·증권사 수신으로 머니무브 진행</text>
    </g>

    <path d="M620 182 C620 198, 200 192, 200 212" stroke="#004ea2" stroke-width="2.4" fill="none"/>
    <path d="M665 182 C665 198, 434 194, 434 212" stroke="#3b82f6" stroke-width="1.8" fill="none"/>
    <path d="M710 182 C710 198, 666 196, 666 212" stroke="#94a3b8" stroke-width="1.5" fill="none"/>
    <path d="M760 182 C760 198, 858 194, 858 212" stroke="#94a3b8" stroke-width="1.5" fill="none"/>

    <g class="flow-node" data-map-jump="household-wealth" tabindex="0" role="button">
      <rect x="96" y="214" width="218" height="76" rx="9" fill="#ffffff" stroke="#004ea2" stroke-width="1.8"/>
      <text x="110" y="234" font-size="11.5" font-weight="800" fill="#004ea2">① 현금 · 예금 (주 유입원)</text>
      <text x="110" y="259" font-size="17.5" font-weight="800" fill="#0f223d">2,688.1조</text>
      <text x="300" y="259" text-anchor="end" font-size="12.5" font-weight="800" fill="#004ea2">38.8%</text>
      <text x="110" y="279" font-size="11" fill="#5e6e85">기타예금(예탁·어음·CMA) 306조</text>
    </g>
    <g class="flow-node" data-map-jump="household-wealth" tabindex="0" role="button">
      <rect x="328" y="214" width="214" height="76" rx="9" fill="#ffffff" stroke="#cbd6e6" stroke-width="1.5"/>
      <text x="342" y="234" font-size="11.5" font-weight="700" fill="#1e3a5f">② 주식 · 투자펀드</text>
      <text x="342" y="259" font-size="17.5" font-weight="800" fill="#0f223d">2,381.1조</text>
      <text x="528" y="259" text-anchor="end" font-size="12.5" font-weight="800" fill="#1e40af">34.4%</text>
      <text x="342" y="279" font-size="11" fill="#5e6e85">국내 1,791 · 펀드 318 · 해외 272</text>
    </g>
    <g class="flow-node" data-map-jump="pension-risk" tabindex="0" role="button">
      <rect x="556" y="214" width="210" height="76" rx="9" fill="#ffffff" stroke="#cbd6e6" stroke-width="1.5"/>
      <text x="570" y="234" font-size="11.5" font-weight="700" fill="#475569">③ 보험 · 연금준비금</text>
      <text x="570" y="259" font-size="17.5" font-weight="800" fill="#0f223d">1,633.0조</text>
      <text x="752" y="259" text-anchor="end" font-size="12.5" font-weight="700" fill="#475569">23.6%</text>
      <text x="570" y="279" font-size="11" fill="#5e6e85">퇴직연금 원리금보장 378조</text>
    </g>
    <g class="flow-node" data-map-jump="household-wealth" tabindex="0" role="button">
      <rect x="780" y="214" width="162" height="76" rx="9" fill="#f8fafc" stroke="#cbd6e6" stroke-width="1.5"/>
      <text x="794" y="234" font-size="11.5" font-weight="700" fill="#64748b">④ 채권 · 기타</text>
      <text x="794" y="259" font-size="17.5" font-weight="800" fill="#334155">228.0조</text>
      <text x="928" y="259" text-anchor="end" font-size="12.5" font-weight="700" fill="#64748b">3.3%</text>
      <text x="794" y="279" font-size="11" fill="#64748b">채권·ELS 179 · 기타 49</text>
    </g>

    <path d="M205 290 C205 312, 310 302, 310 322" stroke="#004ea2" stroke-width="2.6" fill="none"/>
    <polygon points="310,326 305,318 315,318" fill="#004ea2"/>
    <path d="M240 290 C240 310, 680 298, 680 322" stroke="#e88300" stroke-width="2" stroke-dasharray="4 3" fill="none"/>
    <polygon points="680,326 675,318 685,318" fill="#e88300"/>
    <path d="M435 290 C435 308, 370 308, 370 322" stroke="#64748b" stroke-width="1.2" stroke-dasharray="3 3" fill="none"/>

    <g class="flow-node" data-map-jump="funding" tabindex="0" role="button">
      <rect x="96" y="328" width="440" height="66" rx="10" fill="#004ea2"/>
      <text x="116" y="350" font-size="11.5" font-weight="700" fill="#bfd8fa">발행어음 시장 ('26.3Q OpenDART · 8사 발행)</text>
      <text x="116" y="378" font-size="21.5" font-weight="800" fill="#ffffff">${fmt(f.noteActual)}조 원</text>
      <text x="518" y="352" text-anchor="end" font-size="11.5" font-weight="700" fill="#ffffff">가계 금융자산 대비 ${noteShare}%</text>
      <text x="518" y="376" text-anchor="end" font-size="11" fill="#cfe2fc">예금 대비 ${noteDepShare}% · 당사 24.47조(42.8%)</text>
    </g>
    <g class="flow-node" data-map-jump="ima-maturity" tabindex="0" role="button">
      <rect x="552" y="328" width="390" height="66" rx="10" fill="#e88300"/>
      <text x="572" y="350" font-size="11.5" font-weight="700" fill="#fff3df">종합투자계좌 IMA ('26.3Q OpenDART · 3사)</text>
      <text x="572" y="378" font-size="21.5" font-weight="800" fill="#ffffff">${fmt(f.imaActual)}조 원</text>
      <text x="924" y="352" text-anchor="end" font-size="11.5" font-weight="700" fill="#ffffff">가계 금융자산 대비 ${imaShare}%</text>
      <text x="924" y="376" text-anchor="end" font-size="11" fill="#fff3df">예금 대비 ${imaDepShare}% · 당사 3.08조(75.2%)</text>
    </g>
  </svg>
</div>
${source('한국은행 ECOS 국민계정(200Y113, \'25) · 국민대차대조표(291Y505, \'25말) · 자금순환(281Y002, \'26.2Q) · OpenDART 9대 종투사 분기보고서(\'26.3Q). 발행어음·IMA 잔액에는 가계 외 비금융법인 유동성(예금 1,135.9조) 유입분도 포함되며, %는 가계 금융자산(6,930.2조) 모수 대비 비교 비율입니다.','kpi:hw-kr-total')}
</section>`;}

function map(){
const f=fundingMetrics(),k=D.globalKpis,eq9=k.ib9Equity26Q3ExactTril||80.70,cap9=k.ib9LegalCap200_26Q3Tril||161.39;
return heading('2027 OUTLOOK · MACRO TO IB OVERVIEW','발행어음과 IMA — 거시 자금 흐름과 2027년 3대 핵심 축','거시 가계자산 흐름에서 초대형 IB 수신 성장 · 마진 압박 · IMA 차환벽까지 한눈에 파악합니다.')+
`<a href="#kis-mirae" class="kis-pos-ribbon" aria-label="당사 한국투자증권 26.3Q 포지션 상세 보기">
  <div><span class="kis-pos-badge">당사(한국투자) '26.3Q 포지션</span><span class="kis-pos-sub">9대 종투사 내 압도적 1위 수신 사업자 (OpenDART 확정)</span></div>
  <div class="kis-pos-metrics"><span>별도자본 <b>13.55조</b></span><span class="kis-pos-div">|</span><span>발행어음 <b>24.47조</b> <small style="color:#bfd6f6">(한도소진 90.3%)</small></span><span class="kis-pos-div">|</span><span>IMA 부채 <b class="kis-gold-hi">3.08조</b> <small style="color:#bfd6f6">(점유율 75.2%)</small></span></div>
</a>`+
mapTopDownFlow(D)+
`<section class="map-b1-grid" aria-label="2027년 3대 핵심 도해">
  <article class="map-b1-card accent-blue" data-map-jump="funding" tabindex="0" role="button">
    <div class="map-b1-top"><span class="map-b1-title">01 · 얼마나 커지나?</span><span class="badge blue tabular">+${fmt(f.actualGrowth,1)}% 순증</span></div>
    <div class="map-b1-svg">
      <svg viewBox="0 0 280 176" role="img" aria-label="2026.3Q ${fmt(f.actual,1)}조에서 2027E ${fmt(f.total,1)}조 성장 도해">
        <line x1="20" y1="138" x2="260" y2="138" stroke="#d9e2ef" stroke-width="1.5"/>
        <rect x="38" y="72" width="66" height="66" rx="4" fill="#bac7da"/>
        <rect x="38" y="66" width="66" height="8" rx="3" fill="#e88300" opacity="0.8"/>
        <text x="71" y="56" text-anchor="middle" font-size="14" font-weight="800" fill="#0f223d">${fmt(f.actual,1)}조</text>
        <text x="71" y="109" text-anchor="middle" font-size="11" font-weight="700" fill="#0f223d">${fmt(f.noteActual,1)}+${fmt(f.imaActual,1)}</text>
        <text x="71" y="157" text-anchor="middle" font-size="11.5" font-weight="600" fill="#5e6e85">'26.3Q 확정</text>
        <path d="M114 86 L156 56" fill="none" stroke="#004ea2" stroke-width="2" stroke-dasharray="4 3"/>
        <polygon points="159,54 150,55 155,62" fill="#004ea2"/>
        <text x="136" y="59" text-anchor="middle" font-size="11.5" font-weight="800" fill="#004ea2">+${fmt(f.total-f.actual,1)}조</text>
        <rect x="172" y="40" width="70" height="98" rx="5" fill="#004ea2"/>
        <rect x="172" y="30" width="70" height="12" rx="3" fill="#e88300"/>
        <text x="207" y="21" text-anchor="middle" font-size="16" font-weight="800" fill="#004ea2">${fmt(f.total,1)}조</text>
        <text x="207" y="86" text-anchor="middle" font-size="11.5" font-weight="700" fill="#ffffff">어음 ${fmt(f.note,0)}</text>
        <text x="207" y="104" text-anchor="middle" font-size="11.5" font-weight="700" fill="#ffe3b3">IMA ${fmt(f.ima,0)}</text>
        <text x="207" y="157" text-anchor="middle" font-size="11.5" font-weight="800" fill="#004ea2">'27E 전망</text>
      </svg>
    </div>
    <div class="map-b1-foot"><span class="muted">9사 별도자본 <b style="color:var(--ink)">${fmt(eq9)}조</b> (한도 ${fmt(cap9,0)}조)</span><span class="go">수신 전망 →</span></div>
  </article>

  <article class="map-b1-card accent-gold" data-map-jump="funding" data-map-scroll="funding-outlook-2027" tabindex="0" role="button">
    <div class="map-b1-top"><span class="map-b1-title">02 · 마진은 지켜질까?</span><span class="badge amber">상박하후 압박</span></div>
    <div class="map-b1-svg">
      <svg viewBox="0 0 280 176" role="img" aria-label="순스프레드 차이 150bp 가정과 비A급 비중 14%를 적용한 21bp 차감 후 129bp 워터폴 도해">
        <line x1="18" y1="138" x2="262" y2="138" stroke="#d9e2ef" stroke-width="1.5"/>
        <rect x="26" y="42" width="60" height="96" rx="5" fill="#004ea2"/>
        <rect x="26" y="42" width="60" height="20" rx="4" fill="#fff6e8" fill-opacity="0.22" stroke="#ffb547" stroke-width="1.6" stroke-dasharray="3 2"/>
        <text x="56" y="32" text-anchor="middle" font-size="13" font-weight="800" fill="#004ea2">+150bp</text>
        <text x="56" y="96" text-anchor="middle" font-size="11.5" font-weight="700" fill="#ffffff">목표치</text>
        <text x="56" y="157" text-anchor="middle" font-size="11.5" font-weight="600" fill="#5e6e85">어음 NIM</text>
        <line x1="86" y1="42" x2="112" y2="42" stroke="#5e6e85" stroke-dasharray="3 2"/>
        <rect x="112" y="42" width="56" height="22" rx="4" fill="#c4362e"/>
        <text x="140" y="32" text-anchor="middle" font-size="13" font-weight="800" fill="#c4362e">−21bp</text>
        <text x="140" y="81" text-anchor="middle" font-size="11.5" font-weight="700" fill="#c4362e">규제세금</text>
        <text x="140" y="157" text-anchor="middle" font-size="11.5" font-weight="600" fill="#5e6e85">모험 20%</text>
        <line x1="168" y1="64" x2="194" y2="64" stroke="#5e6e85" stroke-dasharray="3 2"/>
        <rect x="194" y="64" width="60" height="74" rx="5" fill="#14325c"/>
        <text x="224" y="54" text-anchor="middle" font-size="13" font-weight="800" fill="#14325c">+129bp</text>
        <text x="224" y="106" text-anchor="middle" font-size="11.5" font-weight="700" fill="#ffffff">실질기여</text>
        <text x="224" y="157" text-anchor="middle" font-size="11.5" font-weight="700" fill="#0f223d">금리 연동</text>
      </svg>
    </div>
    <div class="map-b1-foot"><span class="muted">1H <b style="color:var(--ink)">베어플랫 축소</b> 주의</span><span class="go">2027 금리전망 →</span></div>
  </article>

  <article class="map-b1-card accent-crimson" data-map-jump="ima-maturity" tabindex="0" role="button">
    <div class="map-b1-top"><span class="map-b1-title">03 · 언제 만기가 몰리나?</span><span class="badge red tabular">2.60조 차환벽</span></div>
    <div class="map-b1-svg">
      <svg viewBox="0 0 280 176" role="img" aria-label="2027년 12월부터 2028년 4월까지 초기 IMA 1~4호 2.60조 만기도래 집중 도해">
        <rect x="18" y="8" width="244" height="22" rx="5" fill="#fdf1f0" stroke="#f3c4c1"/>
        <text x="140" y="23" text-anchor="middle" font-size="11.5" font-weight="700" fill="#c4362e">5개월 내 초기 1~4호 2.60조 만기 집중</text>
        <line x1="18" y1="138" x2="262" y2="138" stroke="#d9e2ef" stroke-width="1.5"/>
        <rect x="26" y="50" width="36" height="88" rx="4" fill="#c4362e"/>
        <text x="44" y="42" text-anchor="middle" font-size="11.5" font-weight="800" fill="#c4362e">1.10</text>
        <text x="44" y="98" text-anchor="middle" font-size="11.5" font-weight="700" fill="#ffffff">1호</text>
        <text x="44" y="157" text-anchor="middle" font-size="11.5" font-weight="800" fill="#c4362e">27.12</text>
        <rect x="74" y="134" width="36" height="4" rx="2" fill="#bac7da"/>
        <text x="92" y="126" text-anchor="middle" font-size="11.5" fill="#5e6e85">—</text>
        <text x="92" y="157" text-anchor="middle" font-size="11.5" fill="#5e6e85">28.01</text>
        <rect x="122" y="106" width="36" height="32" rx="4" fill="#e88300"/>
        <text x="140" y="98" text-anchor="middle" font-size="11.5" font-weight="700" fill="#0f223d">0.40</text>
        <text x="140" y="157" text-anchor="middle" font-size="11.5" fill="#5e6e85">28.02</text>
        <rect x="170" y="114" width="36" height="24" rx="4" fill="#e88300" opacity="0.82"/>
        <text x="188" y="106" text-anchor="middle" font-size="11.5" font-weight="700" fill="#0f223d">0.30</text>
        <text x="188" y="157" text-anchor="middle" font-size="11.5" fill="#5e6e85">28.03</text>
        <rect x="218" y="74" width="36" height="64" rx="4" fill="#004ea2"/>
        <text x="236" y="66" text-anchor="middle" font-size="11.5" font-weight="800" fill="#004ea2">0.80</text>
        <text x="236" y="110" text-anchor="middle" font-size="11.5" font-weight="700" fill="#ffffff">2호</text>
        <text x="236" y="157" text-anchor="middle" font-size="11.5" font-weight="700" fill="#0f223d">28.04</text>
      </svg>
    </div>
    <div class="map-b1-foot"><span class="muted">연말 <b style="color:var(--ink)">1호 1.1조(42%)</b> 도래</span><span class="go">IMA 차환 점검 →</span></div>
  </article>
</section>`+
`<div class="map-quick-grid">
  <a href="#ib-funding" class="map-quick-card"><span class="map-quick-num">01</span><span><strong>9대 종투사 조달 · 실적 비교</strong><small>OpenDART '26.3Q 확정 · 어음·RP·ROE</small></span><span class="map-quick-arrow">↗</span></a>
  <a href="#invest" class="map-quick-card"><span class="map-quick-num">02</span><span><strong>모험자본 20% 기회비용 계산기</strong><small>기준선 '26.3Q ${fmt(f.actual)}조 → '27E ${fmt(f.total,0)}조</small></span><span class="map-quick-arrow">↗</span></a>
  <a href="#questions" class="map-quick-card"><span class="map-quick-num">03</span><span><strong>열린 리서치 Q&amp;A 보드</strong><small>금리커브 · 퇴직연금 · 9대 고유규제 문답</small></span><span class="map-quick-arrow">↗</span></a>
</div>`;}
function shortCurvePanel(){const s=D.shortYieldCurveAndMaturity;if(!s)return '';const m=s.maturityBuckets26Q1;return `<section class="panel" id="short-curve-panel" style="scroll-margin-top:95px"><h2>왜 발행어음 수신은 3개월 이하 초단기(63.4%)에 몰릴까?</h2><p class="muted">단기(수시~1년) 수익률곡선 스티프닝과 조달원가 방어의 구조적 결합 · 기준일 ${s.observedDate} (기준금리 ${fmt(s.bokBasePct)}%)</p><div class="grid3" style="margin-top:14px"><div class="metric" data-xray="kpi:curve-slope-109bp" tabindex="0" role="button"><small>발행어음 1Y−수시 기울기</small><strong>+109 <small>bp</small></strong><p>선발 4사 평균 +120bp · 국고(1Y−콜) +58.4bp의 1.9배</p></div><div class="metric" data-xray="kpi:short-share-634" tabindex="0" role="button"><small>만기 3개월 이하 수신 비중</small><strong style="color:#295dd8">${fmt(m.under3mSharePct,1)} <small>%</small></strong><p>1개월 이하 53.7%(29.25조) + 1~3개월 9.6%(5.25조)</p></div><div class="metric" data-xray="kpi:demand-share-4550" tabindex="0" role="button"><small>실질 수시물 추정 비중</small><strong>45–50 <small>%</small></strong><p>발행어음형 CMA 단독 21~24.5조(38~44%)</p></div></div><div class="table-wrap" style="margin-top:18px"><table class="data-table"><thead><tr><th>상품 · 채권 커브 (${s.observedDate})</th><th>1D(수시·콜)</th><th>1M</th><th>3M</th><th>6M</th><th>9M</th><th>1Y</th><th>1Y−3M 기울기</th></tr></thead><tbody>${s.curves.map((c,idx)=>`<tr data-xray="curve:${idx}" tabindex="0" role="button"><td><b class="xray-token">${c.label}</b></td><td>${fmt(c.d1)}%</td><td>${c.m1===null?'—':fmt(c.m1)+'%'}</td><td>${fmt(c.m3)}%</td><td>${fmt(c.m6)}%</td><td>${fmt(c.m9)}%</td><td>${fmt(c.y1)}%</td><td><b>+${fmt(c.slope1y3mBp,1)}bp</b></td></tr>`).join('')}</tbody></table></div><div class="grid2" style="margin-top:18px"><div><small class="muted">업권 발행어음 만기 분포 (${m.basePeriod} · 총 ${(m.totalEok/10000).toFixed(2)}조 원)</small>${m.buckets.map((b,i)=>`<div class="stat-row" style="margin-top:8px" data-xray="kpi:short-share-634" tabindex="0" role="button"><span>${b.bucket}</span><b class="xray-token">${fmt(b.amountEok/10000)}조 (${fmt(b.sharePct,1)}%)</b></div><div style="height:7px;background:#edf1f5;border-radius:4px;overflow:hidden"><div style="height:100%;width:${b.sharePct}%;background:${i<2?'#295dd8':'#91b5e8'}"></div></div>`).join('')}</div><div class="callout" style="margin:0"><b>초단기 수신 유지의 경제적 필연성</b><p>금융채 AA0·회사채 AA-는 6개월 이후 기울기가 평탄화(+8~16bp)되지만 발행어음은 1년물까지 가파르게 상승(+41bp)합니다. 3개월 이하 비중(63.4%)을 20%(기간약정 80% 위주)로 낮추면 가중평균 조달단가가 즉시 +46~66bp 급등(하나증권 초기 기간형 90% 실효금리 3.42% vs 선발 3사 2.61~2.75%)하므로, 단기 저원가는 발행어음이 맡고 중장기 기업금융은 폐쇄형 IMA(위험액 50% 감경)로 분담하는 투트랙 전략이 합리적입니다.</p><div style="margin-top:10px"><a class="btn" href="?q=guide-yield-curve-short-funding#questions" data-qa-jump="guide-yield-curve-short-funding">Q&A · 수익률곡선 스티프닝 & 초단기 수신 실증 해설 →</a></div></div></div>${source('KOFIA 채권정보센터 민평수익률(2026-11-13) · 한국은행 ECOS · 금융감독원 정무위 제출 만기분포(2026.1Q, 54.43조) · KOFIA CMA 통계 · FISIS(202606). 수시물 총비중(45~50%)은 확정 발행어음형 CMA(38~44%)에 일반·법인 수시물을 합산한 추산 범위입니다.','kpi:short-share-634')}</section>`;}
function outlook2027BearFlatPanel(){const o=D.fundingOutlook2027BearFlattening;if(!o)return '';return `<section class="panel" id="funding-outlook-2027" style="scroll-margin-top:95px"><div class="panel-head"><div><h2>2027년 수신환경 종합 전망: 3대 악화 vs 3대 강화 요인과 ‘베어 플랫’ 역학</h2><p class="muted">외형 확장과 마진 경로를 따로 점검 · 기준일 ${o.observedDate}</p></div><span class="badge amber">2027 SCENARIO</span></div><div class="grid3" style="margin-top:14px"><div class="metric" data-xray="kpi:bear-volume" tabindex="0" role="button"><small>수신 외형(잔액) 종합 판정</small><strong style="color:var(--teal);font-size:22px">확장 우위</strong><p>${o.volumeVerdict} · 단기 고금리 파킹 선호</p></div><div class="metric" data-xray="kpi:bear-margin" tabindex="0" role="button"><small>조달원가 · NIM 경로</small><strong style="color:#c26d27;font-size:22px">상반기 압박 가능</strong><p>${o.marginVerdict}</p></div><div class="metric" data-xray="kpi:bear-spread-11bp" tabindex="0" role="button"><small>국고 3Y−1Y 스프레드 (${o.observedDate})</small><strong style="color:#295dd8">+11.1 <small>bp</small></strong><p>2026.2Q +50.2bp에서 급축소 · 베어 플랫 진입</p></div></div><div class="grid2" style="margin-top:18px"><div style="background:#fdf8f4;border:1px solid #f0dfd1;border-radius:10px;padding:14px"><b>3대 악화 요인 (상반기 원가·마진 압박 집중)</b>${o.headwinds.map((h,i)=>`<div style="margin-top:10px;padding-top:10px;border-top:1px solid #f2e5da"><div style="display:flex;justify-content:space-between;gap:8px"><b>0${i+1}. ${h.title}</b><span class="badge amber">${h.impact}</span></div><p class="muted" style="margin-top:4px">${h.detail}</p></div>`).join('')}</div><div style="background:#f3faf8;border:1px solid #d5ece6;border-radius:10px;padding:14px"><b>3대 강화 요인 (외형 확장 · 하반기 원가 안정)</b>${o.tailwinds.map((t,i)=>`<div style="margin-top:10px;padding-top:10px;border-top:1px solid #dceee9"><div style="display:flex;justify-content:space-between;gap:8px"><b>0${i+1}. ${t.title}</b><span class="badge green">${t.impact}</span></div><p class="muted" style="margin-top:4px">${t.detail}</p></div>`).join('')}</div></div><div class="table-wrap" style="margin-top:18px"><table class="data-table"><thead><tr><th>국내 수익률곡선 레짐 대조</th><th>기준금리</th><th>국고채 3M / 1Y / 3Y</th><th>국고 3Y−1Y 기울기</th><th>금융채 AA0 1Y / 3Y</th><th>회사채 AA- 1Y / 3Y</th></tr></thead><tbody>${o.bearFlatteningRegimes.map(r=>`<tr data-xray="kpi:bear-spread-11bp" tabindex="0" role="button"><td><b class="xray-token">${r.regime}</b></td><td>${r.bokPct}</td><td>${r.ktb3m1y3y}</td><td><b>${r.ktb3y1yBp}</b></td><td>${r.finAa01y3y}</td><td>${r.corpAam1y3y}</td></tr>`).join('')}</tbody></table></div>${renderBearFlatStrategy(D)}${source('KOFIA 민평수익률(2018.01~2026.11.13) · 한국은행 ECOS · FISIS(202606) · 통합연금포털(501.4조). 2027.1H 금리·커브 범위는 기준금리 1~2회 인상(3.25~3.50%) 및 베어 플랫 시나리오 가정입니다.','kpi:bear-spread-11bp')}</section>`;}
function funding(){const f=fundingMetrics(),imaNote=D?.fundingForecast2027?.ima27RationaleNote||'';return heading('01 · MARKET OUTLOOK','2027년, 시장은 얼마나 커질까?','OpenDART 2026.3Q 확정 잔액(61.33조)을 출발점으로 2027년 85조 수정 전망과 조달환경·회사별 전략을 살펴봅니다.')+`
<div class="grid3"><div class="metric" data-xray="kpi:actual-5854" tabindex="0" role="button"><small>2026.3Q 확정 잔액 (OpenDART)</small><strong>${fmt(f.actual)} <small>조 원</small></strong><p>발행어음 ${fmt(f.noteActual)} (8사) + IMA ${fmt(f.imaActual)} (3사)</p></div><div class="metric" data-xray="kpi:forecast-85" tabindex="0" role="button"><small>2027년 말 수정 전망</small><strong style="color:var(--teal)">${fmt(f.total)} <small>조 원</small></strong><p>발행어음 ${fmt(f.note)} + IMA ${fmt(f.ima)} · 한투 1.5개월 2,000억 페이스 감안</p></div><div class="metric" data-xray="kpi:growth-452" tabindex="0" role="button"><small>'26.3Q 확정 대비 순증</small><strong>+${fmt(f.actualGrowth,1)} <small>%</small></strong><p>+${fmt(f.total-f.actual)}조 원 · 약 15개월 구간</p></div></div>
<section class="panel" id="funding-trend" style="margin-top:20px;scroll-margin-top:95px"><div class="panel-head"><div><h2>실적에서 전망으로</h2><p>합산 잔액 · 조 원 (연도별 포인트를 클릭하면 세부 구성이 열립니다)</p></div><span class="badge blue">점선 = 전망</span></div>${trendChart()}${imaNote?`<div class="callout" style="margin-bottom:0"><b>2027E IMA 5.0조 원 유지 근거</b> · ${imaNote}</div>`:''}${source(`OpenDART 2026.3Q 분기보고서(9대 종투사) · FISIS SF325 및 사용자 전달 메리츠 IR 목표. 성장률 = (${fmt(f.total)} ÷ ${fmt(f.actual)} − 1) × 100. 연간 성장률이 아닙니다.`,'kpi:forecast-85')}</section>
${outlook2027BearFlatPanel()}${shortCurvePanel()}
<div class="grid2"><section class="panel"><h2>조달금리는 어떻게 정해질까?</h2><p class="muted">원문에 제시된 평시·특판 스프레드 모형</p><label class="range-field"><span>기준금리 가정 <output id="rate-output">3.00%</output></span><input aria-label="기준금리 가정" id="base-rate" type="range" min="1" max="5" step=".05" value="3"><div class="range-ends"><span>1.00%</span><span>5.00%</span></div></label><div class="grid2"><div class="metric" data-xray="kpi:curve-slope-109bp" tabindex="0" role="button"><small>평시 · +30bp</small><strong id="normal-rate">3.30%</strong></div><div class="metric" data-xray="kpi:curve-slope-109bp" tabindex="0" role="button"><small>특판 · +70~90bp</small><strong id="promo-rate" style="font-size:23px">3.70–3.90%</strong></div></div>${source('원문 ECOS·KOFIA 관측 해석. 평시 ±5bp 범위. 입력한 3%는 시연용 가정이며 현재 기준금리·판매금리가 아닙니다.','kpi:curve-slope-109bp')}</section><section class="panel"><h2>왜 기준선마다 순증이 다를까?</h2><div class="stat-row" data-xray="kpi:actual-5854" tabindex="0" role="button"><span>★ OpenDART '26.3Q 확정 (기본)</span><b class="xray-token">${fmt(f.actual)} → ${fmt(f.total)} (+${fmt(f.total-f.actual)}조 · +${fmt(f.actualGrowth,1)}%)</b></div><div class="stat-row" data-xray="kpi:actual-5854" tabindex="0" role="button"><span>FISIS '26.2Q 제공 실적</span><b class="xray-token">${fmt(f.actualQ2)} → ${fmt(f.total)} (+${fmt(f.total-f.actualQ2)}조)</b></div><div class="stat-row" data-xray="kpi:actual-5854" tabindex="0" role="button"><span>기존 '26.2Q 원문 모형</span><b class="xray-token">${fmt(f.model)} → ${fmt(f.total)} (+${fmt(f.total-f.model)}조)</b></div><div class="callout">3분기 분기보고서 확정치(삼성 0.24조 첫 발행·3사 IMA 4.09조 반영)로 기본 기준선이 61.33조 원으로 갱신되었습니다. 모험자본 비용 계산기에서 3개 기준선을 직접 전환해 비교할 수 있습니다.</div>${source(`기존 원문 전망 83조를 메리츠 목표 반영 후 ${fmt(f.total)}조로 조정했습니다. 전망치는 같고 출발 기준선만 다릅니다.`,'kpi:actual-5854')}</section></div>
${renderFundingBreakdownPanel(D)}${renderMoneyMoveSafetyPanel(D)}${renderNim(D)}${next('invest','성장할수록 모험자본 의무와 비용은 얼마나 늘어날까?')}`}

export {calcCost};
function invest(){const ss=getSamsungScenario(D),presets=D?.fundingForecast2027?.samsungMediaCheck2026?.scenarioPresets||[];return heading('03 · SCENARIO LAB','성장할수록 비용은 얼마나 늘어날까?','OpenDART 26.3Q 확정 잔액(61.33조)을 출발점으로 신규 수신 → 모험자본 의무 → 순스프레드 차이 → 연간 기회비용을 계산합니다.')+`<section class="panel"><div class="panel-head"><div><h2>모험자본 기회비용 계산기</h2><p>실제 손실이 아닌, 다른 운용 기회를 포기하는 비용의 시나리오입니다.</p></div><span class="badge amber">사용자 가정 · 26.3Q 기준</span></div><div class="control-row"><label for="firm-select">회사</label><select id="firm-select">${[...D.opportunityCost2027].reverse().map(r=>`<option value="${r.key}">${r.name}</option>`).join('')}</select><label for="basis-select">기준선</label><select id="basis-select"><option value="dart26q3">OpenDART '26.3Q 확정 61.33조 (기본)</option><option value="actual">FISIS '26.2Q 제공 잔액 58.54조</option><option value="model">기존 '26.2Q 모형 57.26조</option></select><button class="btn" id="reset-sim">초기화 ↺</button></div>${presets.length?`<div class="control-row" id="invest-ss-bar" style="margin-top:-6px;font-size:11px"><span style="font-weight:700;color:var(--ink)">삼성 '27E 시나리오 연동:</span>${presets.map(p=>`<button type="button" class="chip ${ss.id===p.id?'active':''}" data-invest-ss="${p.id}">${p.label}</button>`).join('')}</div>`:''}<div class="flow-grid" id="flow" aria-live="polite"></div><div class="grid2" style="margin-top:20px"><div><label class="range-field"><span>정상 기업금융 순스프레드 <output id="spread-value">150bp</output></span><input id="spread" aria-label="정상 기업금융 순스프레드" type="range" min="50" max="250" step="5" value="150"><div class="range-ends"><span>50bp</span><span>250bp</span></div></label><label class="range-field"><span>P-CBO 순스프레드 가정 <output id="pcbo-value">0bp</output></span><input id="pcbo" aria-label="P-CBO 순스프레드 가정" type="range" min="0" max="150" step="5" value="0"><div class="range-ends"><span>0bp</span><span>150bp</span></div></label></div><div><label class="range-field"><span>중견·A급 인정 상한 활용률 <output id="cap-value">30%</output></span><input id="cap" aria-label="중견 A급 의무액 중 비중" type="range" min="0" max="30" step="1" value="30"><div class="range-ends"><span>미활용 0%</span><span>상한 30%</span></div></label><p class="muted" style="font-size:10px">상한 활용분은 정상 기업금융과 같은 순스프레드로 운용한다고 가정합니다.</p></div></div><div class="callout" id="sim-summary"></div>${source('의무액(조) = 신규 수신 × 20% + 기존 기준 잔액 × 10%p. 비용(억/년) = 의무액 × 10,000 × 스프레드 차이(%p) ÷ 100. bp 입력 시 의무액 × bp 차이. 상한 활용 시 × (1−활용률). 기본 출발점은 OpenDART 26.3Q 확정 61.33조 원입니다.','kpi:vc-mandate-20')}</section><section class="panel"><div class="panel-head"><div><h2>회사별로 같은 가정을 적용하면</h2><p>회사 이름을 선택하면 위 계산기도 함께 바뀝니다.</p></div><span class="badge">조 원 / 억 원·년</span></div><div id="cost-table" class="table-wrap"></div>${source(`메리츠 연말 목표를 반영한 수정 전망(85조). 기본 ${fmt(fundingMetrics().cost,0)}억·${fmt(fundingMetrics().cost*.7,0)}억은 OpenDART 26.3Q 확정(61.33조) 기준으로 기존 잔액의 의무비율 상승분까지 포함합니다. 삼성증권 기본선(0)은 별도 목표 미공개로 추가 순증 0으로 처리하며 상단 시나리오 버튼으로 가산할 수 있습니다.`,'kpi:vc-mandate-20')}</section>${renderVentureDeepDive(D)}<div class="grid2"><section class="panel"><h2>모험자본 20%는 어디에 더할까?</h2><p class="muted" style="margin-top:8px">자산 유형 배분에 더하지 않는, 별도 교차 의무입니다.</p><div class="stat-row"><span>2026년</span><b>10%</b></div><div class="stat-row"><span>2027년</span><b style="color:var(--teal)">20%</b></div><div class="stat-row"><span>2028년 이후</span><b>25%</b></div><div class="callout">2027년 총 운용자산의 20% 중, 중견·A급 인정분은 최대 30%. 총 운용자산 대비 6%에 해당하며, 나머지는 14%입니다.</div>${source('원문 규제 해석 / 금융위 2025.04.09 방안. 실제 의무 준수는 적용 조문·인정 요건 확인이 필요합니다.','kpi:vc-mandate-20')}</section><section class="panel"><h2>최적규모 Q*는 어떻게 판단할까?</h2><svg viewBox="0 0 440 210" role="img" aria-label="한계수익은 내려가고 한계비용은 올라가는 개념도. 교차점 Q별표가 최적규모"><path d="M40 20V175H415" fill="none" stroke="#d6e0e5"/><path d="M55 40L155 65L245 104L395 155" fill="none" stroke="#004ea2" stroke-width="2.5"/><path d="M55 155L155 135L245 104L395 30" fill="none" stroke="#e88300" stroke-width="2.5"/><line x1="245" y1="104" x2="245" y2="175" stroke="#99aab2" stroke-dasharray="4 4"/><g class="xray-svg-pt" data-xray="kpi:mrmc-qstar" tabindex="0" role="button" aria-label="최적 수신규모 Q* 한계수익·한계비용 균형 상세 열기"><circle cx="245" cy="104" r="16" fill="transparent"/><circle cx="245" cy="104" r="5" fill="#0a1e3c"/><text x="233" y="195" font-size="12" font-weight="700" fill="#0a1e3c">Q*</text></g><text x="332" y="169" font-size="10" fill="#004ea2">MR 한계수익</text><text x="320" y="29" font-size="10" fill="#e07c00">MC 한계비용</text><text x="335" y="195" font-size="10" fill="#8799a2">수신 규모 →</text></svg><p class="muted">소싱이 어려워질수록 수익은 낮아지고, 특판·자본 비용은 높아질 수 있습니다.</p>${source('MR = MC 개념도. 좌표는 설명용이며 실제 수익률과 구분합니다. 회사별 계수 자료가 없어 정량 Q*는 산출하지 않습니다.','kpi:mrmc-qstar')}</section></div>${next('ib-funding','어느 회사가 어떤 조달수단을 사용하고 있을까?')}`}
function bindInvest(){const selectedFirm=explorerState.pendingInvestKey||explorerState.firmKey;if(D.opportunityCost2027.some(r=>r.key===selectedFirm))$('#firm-select').value=selectedFirm;explorerState.pendingInvestKey=null;const syncExplorer=val=>{if(val!=='all'){explorerState.firmKey=val;explorerState.expandedFirmKey=val;}};const getEffRows=()=>{const ss=getSamsungScenario(D);return D.opportunityCost2027.map(r=>!ss.isOverridden?r:r.key==='samsung'?{...r,q27Est:ss.yearEndTril}:r.key==='all'?{...r,q27Est:r.q27Est+ss.yearEndTril}:r);};const update=()=>{const ss=getSamsungScenario(D),effRows=getEffRows();let row=effRows.find(r=>r.key===$('#firm-select').value)||effRows[0];syncExplorer(row.key);refreshBreadcrumb();document.querySelectorAll('[data-invest-ss]').forEach(btn=>btn.classList.toggle('active',btn.dataset.investSs===ss.id));let opts={basis:$('#basis-select').value,spread:+$('#spread').value,pcbo:+$('#pcbo').value,cap:+$('#cap').value};let c=calcCost(row,opts),xk=row.key==='all'?'kpi:vc-mandate-20':'firm:'+row.key;['spread','pcbo'].forEach(k=>$('#'+k+'-value').textContent=opts[k]+'bp');$('#cap-value').textContent=opts.cap+'%';$('#flow').innerHTML=[['01 · 신규 수신 증가분',fmt(c.delta),'조 원',`기준 잔액 ${fmt(c.base)}조`],['02 · 추가 모험자본 의무',fmt(c.obligation),'조 원','신규 수신 × 20% + 기존 잔액 × 10%p'],['03 · 포기하는 순스프레드',fmt((opts.spread-opts.pcbo)/100),'%p',`${opts.spread}bp − ${opts.pcbo}bp`],['04 · 연간 기회비용',fmt(c.cost,0),'억 원',`상한 활용 시 ${fmt(c.after,0)}억 원`]].map(v=>`<div class="flow-card metric" data-xray="${xk}" tabindex="0" role="button"><b>${v[0]}</b><strong>${v[1]} <small>${v[2]}</small></strong><small>${v[3]}</small></div>`).join('');const basisName=opts.basis==='dart26q3'?"OpenDART '26.3Q 확정":opts.basis==='actual'?"FISIS '26.2Q 제공":"기존 '26.2Q 모형";$('#sim-summary').textContent=`${row.name}${ss.isOverridden&&(row.key==='samsung'||row.key==='all')?` (삼성 +${fmt(ss.yearEndTril)}조 시나리오 적용)`:''} · ${basisName} 기준으로 연간 ${fmt(c.cost,0)}억 원, 중견·A급 ${opts.cap}% 활용 시 ${fmt(c.after,0)}억 원의 기회비용을 가정합니다.${c.cost<0?' 음수는 비교대상보다 높은 가정 수익을 뜻합니다.':''}`;$('#cost-table').innerHTML=`<table class="data-table"><thead><tr><th>회사</th><th>신규수신</th><th>추가 의무액</th><th>전액 P-CBO 가정</th><th>상한 활용</th></tr></thead><tbody>${effRows.map(r=>{let v=calcCost(r,opts),rk=r.key==='all'?'kpi:vc-mandate-20':'firm:'+r.key;return `<tr class="${r.key===row.key?'selected':''}"><td><button data-firm="${r.key}">${r.name}</button></td><td>${fmt(v.delta)}</td><td>${fmt(v.obligation)}</td><td><span class="xray-token" data-xray="${rk}" tabindex="0" role="button">${fmt(v.cost,0)}억</span></td><td><span class="xray-token" data-xray="${rk}" tabindex="0" role="button">${fmt(v.after,0)}억</span></td></tr>`}).join('')}</tbody></table>`;document.querySelectorAll('[data-firm]').forEach(el=>el.onclick=()=>{$('#firm-select').value=el.dataset.firm;update()})};document.querySelectorAll('[data-invest-ss]').forEach(btn=>btn.onclick=()=>{if(btn.dataset.investSs!=='base0'&&$('#firm-select').value!=='all')$('#firm-select').value='samsung';setSamsungScenario(btn.dataset.investSs)});if(typeof window!=='undefined'){if(window._ssInvestListener)window.removeEventListener('samsung-scenario-change',window._ssInvestListener);window._ssInvestListener=()=>{if(document.getElementById('firm-select'))update()};window.addEventListener('samsung-scenario-change',window._ssInvestListener);}['firm-select','basis-select','spread','pcbo','cap'].forEach(id=>$('#'+id).addEventListener('input',update));$('#reset-sim').onclick=()=>{$('#firm-select').value='all';$('#basis-select').value='dart26q3';$('#spread').value=150;$('#pcbo').value=0;$('#cap').value=30;setSamsungScenario('base0');update()};update();}
function householdWealth(){return heading('01B · MACRO WEALTH & 5-COUNTRY COMPARISON','수신의 원천: 가계자산과 주요 5개국 비교','발행어음과 IMA의 토대가 되는 가계·법인 자산을 실물·금융·세부상품 시계열로 분해하고, 한·미·영·일·중 5개국 구조와 대조합니다.')+renderHouseholdWealthPage(D)+next('funding','이 거시 수신 원천 위에서 2027년 발행어음·IMA 85조 시장은 어떻게 움직일까?');}
function route(){if(routeCleanup){routeCleanup();routeCleanup=null;}let id=location.hash.slice(1)||'map';if(!nav.some(n=>n[0]===id))id='map';if(id!=='questions'&&location.search){const u=new URL(location.href);u.search='';history.replaceState(null,'',u);}refreshBreadcrumb();document.title=`${nav.find(n=>n[0]===id)[1]} · IMA NOTE 2027`;$('#nav').innerHTML=nav.map(n=>`${n[0]==='ib-funding'||n[0]==='sources'?'<div class="nav-separator"></div>':''}<a class="nav-link ${id===n[0]?'active':''}" href="#${n[0]}" ${id===n[0]?'aria-current="page"':''}><span class="nav-icon" aria-hidden="true">${n[2]}</span>${n[1]}</a>`).join('');$('#content').innerHTML=id==='map'?map():id==='questions'?heading('QUESTIONS & ANSWERS · OPEN RESEARCH','질문을 모으고, 답을 업데이트하다.','기간 공통 개념부터 2027년 전망까지. 누구나 질문하고 근거를 보탤 수 있습니다.')+renderQuestions():id==='funding'?funding():id==='household-wealth'?householdWealth():id==='invest'?invest():heading('RESEARCH · 2027 OUTLOOK',nav.find(n=>n[0]===id)[1], '질문에 대한 답과 데이터, 그 근거를 함께 살펴보세요.')+renderDetail(id,D);if(id==='map')document.querySelectorAll('[data-map-jump]').forEach(el=>{const go=()=>{if(el.dataset.mapScroll)pendingScrollId=el.dataset.mapScroll;navigateTo(el.dataset.mapJump);};el.addEventListener('click',go);el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go();}});});if(id==='questions')routeCleanup=bindQuestions();if(id==='funding'){bindNim(D);bindFundingBreakdownPanel(D,navigateTo);bindMoneyMoveSafetyPanel(D,navigateTo);$('#base-rate').oninput=()=>{let r=+$('#base-rate').value;$('#rate-output').textContent=fmt(r)+'%';$('#normal-rate').textContent=fmt(r+.3)+'%';$('#promo-rate').textContent=fmt(r+.7)+'–'+fmt(r+.9)+'%'};}if(id==='household-wealth')bindHouseholdWealthPage(D,navigateTo);if(id==='invest')bindInvest();else if(!['map','funding','household-wealth','questions'].includes(id))bindDetail(id,D,navigateTo);$('#search-results').hidden=true;if(pendingScrollId){const sid=pendingScrollId;pendingScrollId='';if(!pulseScrollTo(sid))window.scrollTo(0,0);}else window.scrollTo(0,0);lastRoutedUrl=location.href}
const searchItems=[{title:'AAA 은행채 3년 금리를 비교 기준으로 쓰면?',desc:'P-CBO 비교 기준금리 4.113% · KIS자산평가 2026.11.13 · 정상 IB 모형 대비 명목 금리차 73.7bp',id:'invest'},{title:'IMA의 5% 충당금과 위험액 50% 감경은 구NCR에 어떤 효과가 있나요?',desc:'취득 자산 위험률별 영업용순자본·총위험액 비교 그래프',id:'questions',question:'guide-ima-old-ncr-capital'},{title:'발행어음·IMA 전수 건전성 규제(유동성비율 100% 등)·금감원 보고 주기·복구기한·페널티는?',desc:'자본시장법·금투업규정·금소법 조항별 월보/분기보 기한, 위반 복구기간(유예 유무), 과징금·과태료·형사벌 총람',id:'pnl'},{title:'삼성증권 발행어음 목표치 기사 확인(특판·모험자본 5조) 및 시나리오 가산은?',desc:'9~10월 특판 2,100억 완판·2028년 모험자본 5조 공급 발표 반영 및 2~4조 시나리오 시뮬레이션',id:'funding'},{title:'한국 가계자산(16,641.3조) 실물·금융·세부상품 브레이크다운 및 분기 시계열은?',desc:'국민대차대조표(실물 62.7%·금융 37.3%) 및 자금순환(예금·주식·연금·채권 15개 항목, 2019.4Q~2026.2Q)',id:'household-wealth'},{title:'한국·미국·영국·일본·중국 5개국 명목 GDP·가계자산 구성비 비교는?',desc:'한·미·영·일·중(+유로존) GDP 배율, 실물 vs 금융 비중, 예금·주식·연금·채권 포트폴리오 대조',id:'household-wealth'},{title:'비금융법인(S11) 유동성(1,135.9조)과 가계금융복지조사 순자산 5분위 분포는?',desc:'법인 현금·예금·MMF·단기채 추이 및 상위 20%(순자산 5분위 평균 17.46억·금융 3.46억) 집중도',id:'household-wealth'},{title:'2027년 수신환경과 베어 플랫 전망은?',desc:'조달환경 악화 3가지와 강화 3가지 · 기간스프레드 압축 · 전망 해설',id:'questions',question:'guide-2027-funding-outlook-bear-flattening'},{title:'초단기 수신 63.4%와 단기 수익률곡선은?',desc:'수시형 · 3개월 이하 수신 비중과 조달원가',id:'questions',question:'guide-yield-curve-short-funding'},{title:'질문을 남기거나 새로운 답변을 확인하려면?',desc:'로그인 없이 작성하는 질문·답변, 출처를 첨부한 업데이트와 이력',id:'questions'},{title:'모험자본은 앞으로도 계속 부족할까?',desc:'VC·신기사 소싱, 2027·2028 인정자산 수요, 벤처투자 동향과 인정 대상 확대 필요성',id:'invest'},{title:'9대 증권사 조달수단별 실효금리와 전사 영업 수익성(ROE) 비교는?',desc:'어음·RP·사채·예탁금 실효금리 및 9사 순영업수익·판관비율·별도/연결 ROE 동기화 대조',id:'ib-funding'},{title:'2027E 85조 수정 전망, 누가 왜 늘리고 메리츠·삼성 인가 영향은?',desc:'메리츠 IR 목표(연말 4조·평잔 2조) 및 2026.09 삼성·메리츠 어음 인가 반영 9사 인라인 드릴다운',id:'funding'},{title:'시중 대기자금 머니무브 금리 사다리와 9사 신용등급·원금보호 구조는?',desc:'M2 4,278.8조·연금 원리금보장 378.1조·예수금 158.5조 금리 격차 및 AA급 발행사 신용 비교',id:'funding'},{title:'2027년 발행어음 수신환경 전망과 베어 플랫 역학은?',desc:'3대 악화·강화 요인과 한국투자증권 조달·운용·만기 매칭 전략',id:'funding'},{title:'발행어음 수익률곡선 스티프닝과 3개월 이하·수시물 비중은?',desc:'국고채·회사채 단기 커브 대조 및 만기 3개월 이하 63.4%·CMA 수시물 구조',id:'funding'},{title:'NIM이 바뀌면 회사별 순이자수익은?',desc:'발행어음 NIM 가정과 IMA 수익 기여율로 회사별 연환산 금액을 비교합니다.',id:'funding'},...topics.map(t=>({title:t.title,desc:t.label+' '+t.answer,id:t.id})),...nav.map(n=>({title:n[1],desc:'관련 대시보드로 이동',id:n[0]})),{title:'주요 리스크는 무엇을 점검해야 할까?',desc:'모험자본 조달 병목 · 조달금리 경쟁 · 베어 플랫 · 기간스프레드 압축 · IMA 만기 집중 · 자본효율과 수신 한도 · 부동산·단일 자산 집중',id:'pension-risk'},{title:'발행어음·IMA의 퇴직연금 편입 조건은?',desc:'질문·답변에서 편입 가능 여부와 상품별 조건을 확인합니다.',id:'questions',question:'guide-pension-eligibility'},{title:'P-CBO는 무수익 상품일까?',desc:'0bp는 계산기의 순스프레드 가정입니다.',id:'invest'},{title:'NH 기준선이 왜 다를까?',desc:'7.50조 모형과 8.78조 제공 공시의 차이',id:'funding'}];
function toast(msg){$('#toast').textContent=msg;$('#toast').classList.add('show');setTimeout(()=>$('#toast').classList.remove('show'),2300)}
$('#search').addEventListener('input',()=>{let q=$('#search').value.trim().toLowerCase(),r=$('#search-results');r.hidden=!q;if(!q)return;let items=searchItems.filter(x=>(x.title+' '+x.desc).toLowerCase().includes(q));r.innerHTML=items.length?items.slice(0,8).map(x=>`<a href="${x.question?'?q='+x.question+'#questions':'#'+x.id}" ${x.question?'data-search-question="'+x.question+'"':''}>${x.title}<small>${x.desc.slice(0,65)}</small></a>`).join(''):'<div style="padding:15px;font-size:12px">일치하는 질문이 없습니다.<br><small>금리, 모험자본, 만기, NH 등으로 검색해 보세요.</small></div>';r.querySelectorAll('a').forEach(a=>a.onclick=e=>{if(a.dataset.searchQuestion&&!e.metaKey&&!e.ctrlKey&&!e.shiftKey&&!e.altKey&&e.button===0){e.preventDefault();history.pushState(null,'',a.href);route();}r.hidden=true;$('#search').value=''})});$('#search').addEventListener('keydown',e=>{if(e.key==='Enter'){let first=$('#search-results a');if(first)first.click()}});document.addEventListener('keydown',e=>{if(e.key==='/'&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)){e.preventDefault();$('#search').focus()}if(e.key==='Escape'){$('#search-results').hidden=true;$('#search').blur()}});document.addEventListener('click',e=>{if(!e.target.closest('.search-wrap'))$('#search-results').hidden=true;if(D&&e.target.closest('[data-sync-firm],[data-sync-row],[data-profit-firm],[data-drill-firm]'))requestAnimationFrame(refreshBreadcrumb);});$('#share').onclick=async()=>{try{await navigator.clipboard.writeText(location.href);toast('현재 화면의 링크를 복사했습니다.')}catch{toast('주소창에서 현재 화면의 링크를 복사해 주세요.')}};
document.addEventListener('click',event=>{const anchor=event.target.closest('a[data-qa-jump]');if(!anchor||event.defaultPrevented||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||event.button!==0)return;event.preventDefault();const url=new URL(anchor.href);history.pushState(null,'',url);route();});
window.addEventListener('ima:qa-context',()=>{if(D)refreshBreadcrumb();});
try{const r=await fetch('./data.json');if(!r.ok)throw Error('data');D=await r.json();syncForecastCopy();initXraySystem({getData:()=>D,onAction:act=>{if(act.href){const targetUrl=act.href.startsWith('#')?location.pathname+act.href:act.href;history.pushState(null,'',targetUrl);route();return;}if(act.firmKey){explorerState.firmKey=act.firmKey;explorerState.expandedFirmKey=act.firmKey;if(act.tab==='invest'){const ch=(D.ib9FirmsCuriosityChain||[]).find(x=>x.key===act.firmKey);explorerState.pendingInvestKey=ch?.costKey||act.firmKey;}}const raw=location.hash.slice(1)||'map',curId=nav.some(n=>n[0]===raw)?raw:'map';if(act.tab&&act.tab!==curId){pendingScrollId=act.scrollTo||'';location.hash=act.tab;}else if(act.firmKey){pendingScrollId=act.scrollTo||'';route();}else if(act.scrollTo){pulseScrollTo(act.scrollTo);}}});route();const onHistoryNavigation=()=>{if(location.href!==lastRoutedUrl)route();};window.addEventListener('hashchange',onHistoryNavigation);window.addEventListener('popstate',onHistoryNavigation)}catch(e){$('#content').innerHTML='<div class="panel"><h1>자료를 불러오지 못했습니다.</h1><p>페이지를 새로고침하거나 아래 원본 데이터를 확인해 주세요.</p><a class="btn" href="data.json">원본 데이터 열기</a></div>';console.error(e)}
