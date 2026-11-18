# 다른 AI를 위한 사이트 인계

## 시작 지점

- 운영 사이트: https://ima-outlook-2027.mcr8jq7mcg.chatgpt.site
- 질문·답변: https://ima-outlook-2027.mcr8jq7mcg.chatgpt.site#questions
- 작업할 코드: `site/` (루트의 `reference/prototype_v1.html`은 초기 참고본)
- Q&A 17건 답변 마스터 문서: [`QA_VERIFIED_ANSWERS.md`](./QA_VERIFIED_ANSWERS.md)
- 단기 수익률곡선 스티프닝 & 초단기 수신(`63.4%`) 심층 분석 보고서: [`PROMISSORY_NOTE_CURVE_AND_SHORT_FUNDING.md`](./PROMISSORY_NOTE_CURVE_AND_SHORT_FUNDING.md)
- 2027년 수신환경(3대 악화 vs 3대 강화) & 베어 플랫 전략 보고서: [`OUTLOOK_2027_FUNDING_AND_BEAR_FLATTENING.md`](./OUTLOOK_2027_FUNDING_AND_BEAR_FLATTENING.md)
- 이번 기능 추가 전 운영 소스: Sites commit `76497e1113f42e77042c826fd1f749c5731a46ac`, 배포 버전 6 (GitHub `d96753ce2307dcc578f91306e1ad21b35cbbb8af` 반영).
- 원문 데이터팩 기준: commit `32a997602ee354aaea36e64d0346449435340d21` (+ `2026-11-17` `shortYieldCurveAndMaturity` · `fundingOutlook2027BearFlattening` 확장).

GitHub와 Sites는 자동 동기화되지 않습니다. 변경 후 검사·테스트·빌드를 거쳐 같은 운영 사이트에 배포해야 합니다.

## 채팅에서 Q&A 업데이트 요청 시 — 새 질문 + 기존 답변 전체 검토

사용자가 사이트에 질문을 올린 뒤 이 대화에서 **“사이트 Q&A 업데이트해줘”**라고 요청하면, [REVIEW_WORKFLOW.md](./REVIEW_WORKFLOW.md)를 따라 새 질문에 답하고 기존 질문 답변도 모두 다시 검토합니다. 검토 결과·원문 근거·실제 검토일·변경 요약을 남기며, 변경 없음도 근거를 확인한 후 기록합니다. 확인되지 않은 항목은 ‘추가 확인 필요’로 남깁니다.

검토 답변은 `worker/reviews.js`의 회차별 기록으로 관리합니다. 처음에는 빈 기록이며 기존 17건을 새로 검증했다고 표시하지 않습니다. 사용자 D1 글은 그대로 보존하고, 원래 가이드 및 이후 검토 답변은 이력으로 남깁니다. 전체 질문 수집과 입력 변경 검사는 `npm run review:prepare`, `review:apply`, `review:verify`를 사용합니다. 수집 원문과 미완성 초안은 무시되는 `.local/`에만 둡니다.

업데이트는 채팅 요청 시 진행합니다. 사이트의 ‘업데이트 요청문 복사’는 요청문을 복사하는 기능이며 자체적으로 AI 검토를 실행하지 않습니다. 단순 소스 배포 요청을 금융 자료 전체 재검토 요청으로 확대하지 않습니다.

## 최신 업데이트 — 2026-11-18 호기심 연쇄형 하이브리드 UX 개편 (`curiosity.js`) & 4대 관점 데이터 구축

- **핵심 UX 방향성**: 명시적 FAQ 문장 나열 없이 사용자가 핵심 수치를 클릭하면 **① 인라인 연쇄 드릴다운(Inline Progressive Drilldown) · ② 9대 증권사 상호 연동 렌즈(Synchronized Entity Cross-Filtering) · ③ 산식 렌즈 전환기(RAROC Formula Lens Switcher)**를 통해 자연스럽게 3~4단계 심층 데이터와 출처·타 탭으로 가지치기되도록 개편했습니다.
- **신규 데이터셋 반영 (`site/public/data.json` & `data/ib_portal_verified_data.json` 동기화)**:
  1. `ib9FirmsCuriosityChain`: 9대 종투사의 최신 인가 현황(**`2026.09.09` 삼성증권 8호 · `2026.09.23` 메리츠증권 9호 발행어음 인가, `2026.03.18` NH투자증권 IMA 3호 인가**), 2027E 성장 전제(원문 83조 합계 보존 + 최신 인가 반영 레인지 병기), 자본 대비 발행어음 비율 격차 사유, 대체 조달수단·실효금리(`SF321`), 신용등급 및 전사 영업 수익성(`SF307` 별도 · `DART` 연결 순영업수익·판관비율·순이익·ROE).
  2. `ventureCapitalChain2027`: 모험자본 취득 기회비용 **4대 산정 방식**(① 명목 스프레드 차감 · ② EL/실사원가 조정 · ③ 신NCR 위험값 반영 RAROC/EVA · ④ 수신 1조 패키지 한계기여이익·규제 그림자 조세), KOFIA 민평(`2026-11-13`) 및 금투업규정 별표 5·10 기반 **발행어음(위험액 100%) vs IMA(위험액 50% 감경) 자산군별 RAROC 대조표**, **선제적 모험자본 확보를 통한 경쟁자 견제 전략 타당성 진단**(유통시장 물량 매점 ❌ vs 상위 VC·신기사 GP 쿼터 및 주거래 파이프라인 선점 ✅), **인정 모험자본 7대 자산군별 현재 규모 vs 2027~2028 잠재 시장규모**.
  3. `moneyMoveAndSafety2026Q4`: 시중 대기자금(`M2 4,278.8조` · `퇴직연금 원리금보장 378.1조` · `9사 고객예수금 158.50조`) 금리 매력도 사다리와 예금자보호 미적용 상품을 뒷받침하는 9사 신용등급·자본완충력·원금보호 조건 대조(`#funding` 내 렌즈 전환, 연금 세부 요건은 `?q=guide-pension-eligibility#questions`로 연결해 `#pension-risk` 리스크 전용 원칙 준수).
- **화면별 연동 (`site/public/curiosity.js`, `app.js`, `details.js`, `style.css`)**:
  - `#funding`: 9사 성장 분해 인라인 펼침표(`renderFundingBreakdownPanel`) + 머니무브 금리 사다리·신용버퍼 전환 패널(`renderMoneyMoveSafetyPanel`) 탑재.
  - `#ib-funding` & `#pnl`: 증권사 선택 시 조달포트폴리오·수단별 실효금리·규제버퍼·전사 수익성(ROE) 대조표가 동시에 연동(`renderIbSynchronizedExplorer`)되며 선택한 회사 상태로 `#invest` 계산기 즉시 점프 지원.
  - `#invest`: 기존 기회비용 계산기 아래 4대 기회비용 산식 렌즈·어음/IMA 계정 토글(`#vc-raroc-lab`), 선제 확보 경쟁자 견제 전략 진단(`#vc-preemptive-strategy`), 7대 인정 자산군 잠재 시장규모 펼침표(`#vc-addressable-market`) 추가.
  - 기본 가이드 Q&A **총 17건**(`worker/seeds.js`, `guide-venture-cross-rule` 미포함 원칙) 및 `#pension-risk` 6대 리스크 체크리스트 구조는 그대로 보존했습니다.

### 이전 업데이트 — 2026-11-17 2027 수신환경(악화·강화) & 베어 플랫 전망 (`Q18`) · 단기 수익률곡선 스티프닝 (`Q17`, 총 17건)

- `#funding`(수신 · NIM · 2027 전망) 화면에 ① 발행어음(`수시~1년`) vs 국고채·금융채(`AA0`)·회사채(`AA-`) 단기 수익률곡선 스티프닝 및 만기 3개월 이하(`63.4%`) 수신 비중 패널(`shortCurvePanel()`)과 ② **2027년 수신환경 종합 전망(3대 악화 vs 3대 강화 요인 · 공급 측 자체 속도조절) 및 국내 채권 ‘베어 플랫(Bear Flattening)’ 실증·최적 ALM 전략 패널(`outlook2027BearFlatPanel()`, `fundingOutlook2027BearFlattening`)**을 추가했습니다.
- `#pension-risk`(리스크점검) 체크리스트에 **`베어 플랫 · 기간스프레드 압축`**(높음)을 추가해 주요 위험 6개 항목으로 확장하고 `guide-2027-funding-outlook-bear-flattening`과 연결했습니다.
- `site/worker/seeds.js` 최상단에 `guide-2027-funding-outlook-bear-flattening` (**Q18**) 및 `guide-yield-curve-short-funding` (**Q17**)을 반영하여 기본 가이드 Q&A는 **총 17건**(`guide-venture-cross-rule` 삭제 원칙 유지)이며, `api.test.mjs`·`review-queue.test.mjs`·`reviews.test.mjs`를 `17건` 기준으로 동기화했습니다.

## 편집 원칙 — 2026-11-12 리스크점검 중심 정리

1. **탭 이름은 `리스크점검`입니다.** 기존 공유 링크 호환을 위해 주소 `#pension-risk`는 유지합니다. 이 화면에는 수신·운용·상환에 영향을 주는 강조할 만한 주요 위험만 선별해서 올립니다. 현재 6개이며 향후 항목 수를 고정하지 않습니다.
2. **퇴직연금은 질문·답변에서 다룹니다.** 리스크 화면의 퇴직연금 규모·상품 비교 패널은 제거했습니다. 연금 편입 조건과 자사 예금 편입 제한 Q&A는 유지하고, 상단 검색의 연금 항목도 해당 Q&A로 바로 이동합니다.
3. **`guide-venture-cross-rule` 질문을 삭제했습니다.** “모험자본 20% 의무는 자산배분 100%에 더하는 항목인가요?”를 다시 추가하지 마세요. 핵심 소싱 설명은 기존 `guide-sizing-growth`에 통합했습니다. 신규 추가된 `guide-2027-funding-outlook-bear-flattening`(Q18), `guide-yield-curve-short-funding`(Q17)을 포함한 17개 질문·가이드 답변 ID를 유지합니다.
4. **리스크와 해설을 다음과 같이 연결합니다.** 항목명으로 게시판 검색이 가능해야 합니다. 같은 판단을 다루는 두 리스크는 하나의 충분한 Q&A를 공유하며 중복 질문을 만들지 않습니다.

| 리스크 항목 | Q&A ID |
| --- | --- |
| 모험자본 조달 병목 | `guide-sizing-growth` |
| 조달금리 경쟁 | `guide-funding-rate-spread-risk` |
| 베어 플랫 · 기간스프레드 압축 | `guide-2027-funding-outlook-bear-flattening` |
| IMA 만기 집중 | `guide-ima-maturity` |
| 자본효율과 수신 한도 | `guide-sizing-growth` |
| 부동산·단일 자산 집중 | `guide-real-estate-concentration` |

딥링크 형식은 `?q=<id>#questions`이며 타 탭 이동 시 질문 쿼리를 정리합니다. API 기본 목록은 `total: 17`, `pages: 2`, `unanswered: 0`입니다. 사용자 글이 추가되면 운영 합계는 달라질 수 있습니다. 기존 운영 D1의 사용자 질문·답변·수정 이력은 삭제·초기화하지 않습니다.

## 다른 AI에게 전달할 요청 예시

> 최신 인계 문서(`AI_HANDOFF.md`)와 GitHub `main` 최신 커밋의 코드·데이터 변경분(`site/public/curiosity.js`, `data.json`, `ib_portal_verified_data.json` — `#funding` 9사 성장전제·머니무브 인라인 드릴다운, `#ib-funding` 9사 조달·실효금리·수익성 동기화 탐색기, `#invest` 모험자본 기회비용 4대 산정방식 RAROC 렌즈·경쟁자 견제 전략·7대 인정자산 잠재시장 패널, 기존 기본 질문 17건 및 `#pension-risk` 6대 리스크점검 유지)을 확인하고 같은 운영 사이트(`https://ima-outlook-2027.mcr8jq7mcg.chatgpt.site`)를 업데이트해줘. `.openai/hosting.json`과 운영 D1 데이터를 보존한 채 `npm run check`, `npm test`, `npm run build` 통과 후 배포해줘. 삭제된 `guide-venture-cross-rule`을 복원하지 말고 신규 인라인 드릴다운·탭 간 회사 동기화·Q&A 딥링크도 확인해줘.

## 현재 사용자 요구와 화면

1. 왼쪽 브랜드: **발행어음 & IMA**. 차분한 청록색·화이트 대시보드.
2. 첫 화면: 8가지 질문을 클릭하는 주제 지도, 핵심 지표, 질문 흐름.
3. **두 번째 메뉴는 질문·답변**. 기간 공통/2027 전망, 5개 주제, 답변 대기/출처 첨부 필터와 검색.
4. 수신 화면: 2026.2Q와 2027E 잔액, 회사별 발행어음 NIM 입력, IMA 수익 기여율, 연환산 수익 합계, 단기 수익률곡선·초단기 수신 구조, 2027 수신환경(악화·강화)·베어 플랫 전망.
5. 기존 상세 화면: 운용규제, 모험자본 비용 계산기, IMA 만기, 9사 조달, 한투·미래 비교, 리스크점검(`#questions` 관련 해설 딥링크 연동), 출처.
6. 사이트는 **공개 열람·로그인 없는 작성**이 명시적인 사용자 선택입니다.

## 구조와 수정 위치

| 경로 | 역할 |
| --- | --- |
| `site/public/index.html`, `style.css` | 공통 셸·브랜드·반응형 스타일 |
| `site/public/app.js` | 해시 라우팅(`?q=` 정리 포함), 주제 지도, 수신, 기회비용, 공통 검색 |
| `site/public/curiosity.js` | 호기심 연쇄형 하이브리드 UX: 9사 인라인 드릴다운, 머니무브·신용 렌즈, 9사 동기화 탐색기, 모험자본 RAROC·선점전략·잠재시장 |
| `site/public/nim.js` | NIM·IMA 기여율 시뮬레이터 |
| `site/public/details.js` | 6개 리서치 상세 화면 (`#pension-risk` 주요 리스크 체크리스트 및 Q&A 딥링크 포함) |
| `site/public/qa.js`, `qa.css` | 익명 질문·답변 UI |
| `site/worker/api.js` | 게시판 API, 소유권·입력 검증, 수정 이력 |
| `site/worker/reviews.js`, `review-model.js` | 회차별 검토 답변·근거·원본/수정 이력과 입력 지문 |
| `site/scripts/review-queue.mjs` | 전체 질문 수집·검토 범위/입력 변경 검사·로컬 회차 추가 |
| `REVIEW_WORKFLOW.md` | 채팅 업데이트 요청을 실제 검토·배포로 이어가는 운영 절차 |
| `site/worker/seeds.js` | 기본 질문 17개: 2027 수신환경·베어 플랫(Q18), 단기 수익률곡선·초단기 수신(Q17), 유동성 규제(Q13) 등 유지 |
| `QA_VERIFIED_ANSWERS.md` | Q&A 17개 답변 · 리스크점검 관련 해설 매핑표 · 유동성 규제 비교표 마스터 문서 |
| `PROMISSORY_NOTE_CURVE_AND_SHORT_FUNDING.md` | 발행어음 vs 국채·회사채 단기 수익률곡선 스티프닝 및 만기 3개월 이하(`63.4%`)·수시물 비중 심층 분석 보고서 |
| `OUTLOOK_2027_FUNDING_AND_BEAR_FLATTENING.md` | 2027년 발행어음 수신환경(3대 악화 vs 3대 강화) 및 국내 채권 베어 플랫 국면 전략 분석 보고서 |
| `site/db/schema.ts`, `drizzle/` | D1 스키마와 마이그레이션 |
| `site/public/data.json` | 제공된 원문 정량 데이터 |
| `site/public/source-guide.md` | 배포 시점 원문 기획서 사본 |

`public/data.json`은 원문 정량 데이터의 배포 사본입니다. 루트 `data/ib_portal_verified_data.json`와 기준을 맞추고, 업데이트 시 양쪽의 변경 근거·기준일·산식을 명시하세요. 원문 기획서에 적힌 "검증 완료"를 사이트가 독립적으로 재검증했다는 의미로 바꾸지 마세요.

## 금융 데이터 의미

- **58.54조**는 제공 공시 기준, **57.26조**는 원문의 시뮬레이션 기준선입니다. 83조 전망에 대한 순증은 각각 24.46조와 25.74조입니다. 차이는 NH의 8.78조/7.50조 기준선입니다.
- 회사별 발행어음 순이자수익 = 선택 시점 잔액(조) × NIM(bp), 단위 억 원/년. 선택 잔액을 1년 평균 운용잔액으로 대신 쓰는 **연환산 규모**이며 실제 해당 연도 손익 전망이 아닙니다.
- 기본 2027E NIM 150bp와 IMA 기여율 120bp에서 어음 11,700억 + IMA 600억 = 합산 12,300억입니다. 2026.2Q는 8,391억 + 312억 = 8,703억입니다.
- IMA의 운용수익 전체가 증권사 이자수익은 아닙니다. 보수·배분수익 기여를 분리하고, 합계도 전사 순영업수익으로 부르지 않습니다.
- 모험자본 의무는 자산유형 합계 100% 밖의 교차 규제이며, P-CBO 0bp는 순스프레드 가정입니다. 비용을 NIM에 이미 반영했는지 확인하고 중복 차감하지 않습니다.
- 전사 순이자에서 리테일 이자를 뺀 참고값을 상품 자체 NIM이나 순수 IB 손익으로 확정하지 않습니다.
- 원문의 9사 조달 항목 합계 472.65조와 총계 472.75조 차이, 미래에셋 2026.1H 손익 산술 불일치 주석을 유지합니다.
- 목표수익률, 만기 원금지급 약정, 예금자보호는 서로 다른 개념입니다. Q* 차트는 정량 최적규모가 아닌 개념도입니다.

## 게시판과 데이터 보존

- 사용자 질문·답변·수정 이력은 운영 D1에 저장됩니다. GitHub에는 운영 DB 덤프를 포함하지 않았습니다.
- 브라우저의 랜덤 `X-Author-Key`는 자신의 글 수정 권한입니다. 서버는 해시만 저장하며 응답에 노출하지 않습니다. 로그인 신원 인증을 뜻하지 않습니다.
- 자신이 작성한 브라우저에서 답변을 수정·삭제할 수 있습니다. 수정 시 이전 버전·근거·날짜가 이력으로 남습니다. 답변 없는 본인 질문만 삭제 가능합니다.
- 다른 사용자는 별도 답변·근거 기록을 덧붙입니다. `evidence`는 **출처 첨부 / 작성자 확인**이며 자동으로 검증된 사실이 아닙니다.
- 채팅에서 요청하면 새 질문과 기존 답변 전체를 검토합니다. 자동 뉴스 수집·일정 실행은 하지 않으며, 화면 새로고침은 검토를 실행하지 않습니다.
- 적용된 Drizzle SQL·snapshot·journal은 변경하지 말고 새 마이그레이션을 추가하세요. 운영 데이터는 초기화하거나 seed로 덮어쓰지 않습니다.

## 배포 경계

`.openai/hosting.json`의 project ID는 현재 운영 사이트 식별자이며 인증 토큰이 아닙니다. **동일 사이트 업데이트**일 때 보존합니다. **독립 복제**라면 새 Site와 새 DB를 만들고 해당 식별자로 교체해야 합니다. 기존 운영 DB를 복제 테스트에 연결하지 마세요.

게시판에는 Worker+D1이 필요합니다. GitHub Pages 등 정적 호스팅에 `public/`만 올려서는 공유 질문·답변 기능이 동작하지 않습니다. 구체적인 빌드·배포 순서는 `site/README.md`를 참조하세요.
