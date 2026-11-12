const createdAt='2026-11-12T00:00:00.000Z';
const sourceUrl='https://github.com/t5trckrbbr-sudo/ima-note-portal/blob/32a997602ee354aaea36e64d0346449435340d21/SITE_BUILD_GUIDE.md';

// Authored starter questions, not posts attributed to real visitors. Guide answers
// preserve the supplied research's scope and must not imply live verification.
const entries=[
 {
  id:'guide-product-difference',category:'basics',timeframe:'timeless',
  title:'발행어음과 IMA는 어떤 점이 다른가요?',
  body:'수익 구조와 만기, 자금을 운용하는 방식의 차이부터 알고 싶습니다.',
  answer:'발행어음은 증권사가 약정한 금리에 따라 지급하는 1년 이내 상품이며, IMA는 기업금융 자산 등을 운용한 실적에 따라 수익을 배분하는 구조입니다. IMA의 목표수익률은 확정금리가 아니고 만기·중도해지 조건은 상품별로 다릅니다. 저장소는 기업금융 운용 의무를 발행어음 50% 이상, IMA 70% 이상으로 요약합니다. 이는 제공 기획서를 바탕으로 한 설명이며 현행 법령과 개별 상품 약관을 독립적으로 재검증한 답변은 아닙니다.'
 },
 {
  id:'guide-principal-protection',category:'risk',timeframe:'timeless',
  title:'IMA의 원금지급 약정은 예금자보호와 같은 뜻인가요?',
  body:'만기 원금지급 약정이 있다는 설명을 볼 때 무엇을 구분해야 하나요?',
  answer:'같은 뜻이 아닙니다. IMA의 만기 원금지급 약정은 발행 증권사가 약정에 따라 지급할 의무이며, 예금보험을 통한 보호와 구분해야 합니다. 발행어음과 IMA는 모두 발행사 신용위험을 살펴봐야 하고, 만기 전 해지에는 지급 조건·손익·수수료가 달라질 수 있습니다. 원금지급 약정만으로 중도해지 때도 같은 금액을 받을 수 있다고 해석하면 안 됩니다.'
 },
 {
  id:'guide-nim-income',category:'returns',timeframe:'timeless',
  title:'NIM과 순이자수익, 순영업수익은 어떻게 구분하나요?',
  body:'수신 화면에서 가정한 NIM으로 계산한 금액을 어떤 수익 지표로 읽어야 하나요?',
  answer:'NIM은 이자수익에서 조달 이자비용을 뺀 금액을 평균 이자수익자산으로 나눈 비율이고, 순이자수익은 그 차액의 금액입니다. 이 사이트 계산기는 수신 잔액을 1년 평균 운용잔액으로 대신 사용합니다. 예를 들어 발행어음 1조 원에 NIM 150bp를 적용하면 연환산 순이자수익은 150억 원입니다. 수수료·평가손익 등까지 포괄하는 전사 순영업수익과는 다르며, IMA는 증권사에 귀속되는 보수·배분수익 기여율을 별도로 가정합니다. 연말 잔액 기준 결과는 실제 해당 연도의 손익 전망이 아닙니다.'
 },
 {
  id:'guide-growth-baseline',category:'strategy',timeframe:'2027',
  title:'2027년 83조 원 전망의 성장률이 41.8%와 45%로 다른 이유는요?',
  body:'같은 83조 원 전망인데 신규 수신 증가분도 24.46조와 25.74조로 나뉩니다.',
  answer:'출발 잔액이 다르기 때문입니다. 제공된 2026.2Q 잔액 58.54조 원에서 83조 원으로 늘면 순증 24.46조 원, 증가율 약 41.8%입니다. 원문의 기존 모형은 57.26조 원에서 시작하므로 순증 25.74조 원, 약 45.0%가 됩니다. 차이 1.28조 원은 NH투자증권 잔액을 제공 실적 8.78조 원으로 볼지 모형의 7.50조 원으로 볼지에서 발생합니다. 83조 원은 발행어음 78조 원과 IMA 5조 원을 합한 시나리오이며, 이 증가율은 약 18개월 구간으로 연간 성장률이 아닙니다.'
 },
 {
  id:'guide-venture-cross-rule',category:'regulation',timeframe:'2027',
  title:'모험자본 20% 의무는 자산배분 100%에 더하는 항목인가요?',
  body:'기업금융·부동산·기타 자산 비중과 모험자본 비중을 동시에 읽는 방법이 궁금합니다.',
  answer:'자산배분 합계에 20%를 추가하는 방식이 아닙니다. 기업금융·부동산·기타 자산이 합계 100%를 이루고, 그 안에서 모험자본 인정 요건을 만족하는 금액을 별도로 계산하는 교차 규제입니다. 저장소는 의무비율을 2026년 10%, 2027년 20%, 2028년 이후 25%로 제시합니다. 중견기업·A급 채권 인정 상한 30%는 총 운용자산이 아니라 모험자본 의무액을 분모로 하므로, 2027년 총 운용자산 대비 6%(20% × 30%)에 해당합니다. 실제 인정 대상과 적용 시점은 해당 규정 원문을 확인해야 합니다.'
 },
 {
  id:'guide-pcbo-assumption',category:'returns',timeframe:'timeless',
  title:'계산기의 P-CBO 0bp는 실제로 수익이 없다는 뜻인가요?',
  body:'모험자본 기회비용을 계산할 때 사용하는 0bp가 어떤 가정인지 알고 싶습니다.',
  answer:'0bp는 실제 P-CBO 상품 수익률을 확인한 값이 아니라, 계산기에 넣은 조달비용 차감 후 순운용스프레드 가정입니다. 기회비용은 정상 기업금융 순스프레드와 P-CBO 가정 스프레드의 차이에 의무액을 곱해 계산합니다. 원문 기준 신규수신 25.74조 원 × 의무비율 20% × 스프레드 차이 150bp라면 연간 약 772억 원입니다. 이는 확정 손실이 아니며, 실제 투자 조건이나 이미 NIM에 반영한 비용을 확인한 뒤 중복 차감하지 않도록 해야 합니다.'
 },
 {
  id:'guide-ima-maturity',category:'risk',timeframe:'2027',
  title:'2027년 말 IMA 만기집중은 어느 상품을 말하나요?',
  body:'5개월 동안 2.60조 원의 만기가 몰린다는 설명이 전체 시장을 뜻하나요?',
  answer:'저장소에 수록된 한국투자증권 초기 IMA 1~4호에 대한 설명입니다. 1호 1.10조 원은 2027년 12월, 3호 0.40조 원은 2028년 2월, 4호 0.30조 원은 3월, 2호 0.80조 원은 4월에 만기 도래하는 것으로 제시되어 있습니다. 이 네 회차의 합계 2.60조 원이 5개월에 집중된다는 의미이며 전체 IMA 시장의 만기 분포를 뜻하지 않습니다. 회차별 기초자산 회수 일정과 실제 지급·재투자 조건을 함께 대조해야 합니다.'
 },
 {
  id:'guide-kis-mirae-comparison',category:'strategy',timeframe:'timeless',
  title:'한국투자와 미래에셋의 순이자 차이가 발행어음 수익성 차이를 입증하나요?',
  body:'전사 이자손익에서 리테일 신용이자를 뺀 숫자를 상품별 마진처럼 봐도 되나요?',
  answer:'그 숫자만으로 발행어음 자체의 수익성을 입증할 수는 없습니다. 2025년 자료의 +5,299억 원과 −1,405억 원은 전사 순이자손익에서 리테일 신용공여 이자를 차감한 참고값입니다. 대응 조달비용·헤지손익·평가손익·비이자손익이 해당 사업별로 분리되지 않아 순수 IB 손익이나 발행어음 계정 손익으로 볼 수 없습니다. 회사별 조달·운용 구조의 차이를 살펴보는 자료로 사용하고, 상품 자체의 마진을 비교하려면 계정별 운용자산·평균잔액·조달비용이 추가로 필요합니다.'
 },
 {
  id:'guide-account-separation',category:'basics',timeframe:'timeless',
  title:'전사 차입부채와 발행어음·IMA 잔액은 왜 분리해서 보나요?',
  body:'대시보드의 472.75조 원, 55.94조 원, 58.54조 원이 각각 무엇을 포함하나요?',
  answer:'제공 데이터의 472.75조 원은 9개 증권사의 RP·발행어음·ELS/DLS 등 전사 차입부채 합계입니다. 55.94조 원은 7개 인가사의 발행어음 잔액이며, 여기에 자료상 IMA 2.60조 원을 더하면 58.54조 원입니다. 고객예수금 158.50조 원은 별도로 표시합니다. 전사 판관비·충당금·평균 마진을 발행어음이나 IMA에 임의 배분하면 상품 수익성이 왜곡될 수 있습니다. 원문 7개 조달항목 합계와 차입부채 총계에는 0.10조 원 차이도 있어 세부 원장 재확인이 필요합니다.'
 },
 {
  id:'guide-latest-rate',category:'returns',timeframe:'2027',
  title:'2027년에 실제 판매되는 발행어음 금리와 IMA 조건은 어떻게 달라지나요?',
  body:'증권사별 공식 상품 안내나 약관을 확인한 날짜와 함께 비교하고 싶습니다. 약정금리·특판 조건·목표수익률을 구분하고 만기와 중도해지 조건도 같이 확인할 수 있을까요?',
  answer:null
 },
 {
  id:'guide-pension-eligibility',category:'regulation',timeframe:'timeless',
  title:'발행어음과 IMA의 퇴직연금 편입 가능 여부는 어디서 확인하나요?',
  body:'IRP·DC 등 계좌 유형과 상품별로 실제 편입 가능한지 알고 싶습니다. 최신 사업자 안내·상품 약관·적용 규정의 출처와 확인일을 남겨 주세요. 예금자보호 한도와 연금 상품 편입 상한도 구분해 확인하고 싶습니다.',
  answer:null
 },
 {
  id:'guide-sizing-growth',category:'strategy',timeframe:'2027',
  title:'2027년에 수신을 계속 늘리는 것이 항상 유리한가요?',
  body:'시장 점유율 확대와 모험자본 소싱 부담, 자본 여력을 어떻게 함께 봐야 하나요?',
  answer:'추가 수신을 운용해 얻는 수익이 추가 조달비용·신용위험·자본비용을 보상하는지 살펴봐야 합니다. 원문은 모험자본 의무 상향, 특판 경쟁, IMA 만기집중을 함께 점검하도록 제안합니다. MR=MC로 표현한 최적규모 Q*는 설명을 위한 개념이며, 회사별 한계수익·한계비용 계수가 없어 실제 최적 잔액을 숫자로 산출한 결과는 아닙니다. 수신 계산기의 NIM도 사용자 가정이므로 실제 소싱 가능량과 회수 일정을 확인하며 조정해야 합니다.'
 }
];

export const seedQuestions=entries.map(({answer,...question})=>({
 ...question,author:'리서치 가이드',createdAt,updatedAt:createdAt,seed:true,
 answer:answer===null?null:{
  id:question.id.replace('guide-','guide-answer-'),questionId:question.id,
  body:answer,author:'리서치 가이드',kind:'guide',sourceUrl,
  sourceTitle:'저장소 제공 기획서',observedAt:'2026-11-12',
  createdAt,updatedAt:createdAt,revision:1
 }
}));
