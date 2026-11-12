# 발행어음 & IMA 사이트 소스

**운영 URL:** https://ima-outlook-2027.mcr8jq7mcg.chatgpt.site  
**AI 인계:** [../AI_HANDOFF.md](../AI_HANDOFF.md)

## 로컬에서 실행

Node.js **24 이상**이 필요합니다. `node:sqlite`를 테스트와 로컬 DB에 사용합니다.

```bash
cd site
npm ci
npm run check
npm test
npm run dev
```

`npm run dev`는 Worker를 빌드한 뒤 로컬 개발 서버를 시작합니다. 기본 주소는 `http://127.0.0.1:4173`이며 실행 로그를 확인하세요. `PORT` 환경변수로 포트를 바꿀 수 있습니다. 소스를 수정한 뒤에는 서버를 종료하고 같은 명령으로 다시 시작하세요.

로컬 질문·답변은 `site/.local-data/qa.sqlite`에 저장됩니다. 로컬 실행에 Sites나 Cloudflare 계정·운영 DB 접속 정보가 필요하지 않습니다. 브라우저 개발용 키와 운영 데이터는 GitHub에 올리지 마세요.

## 빌드와 검증

```bash
npm run check
npm test
npm run build
```

- `check`: 주요 JavaScript 문법 검사
- `test`: 실제 SQLite 기반 API 테스트. 등록·조회·출처·이력·수정 권한·동시 수정 충돌·입력 검증을 확인합니다.
- `build`: `public/` 자산을 Worker에 포함하고 DB 마이그레이션을 패키징합니다.

생성물:

```text
dist/
  server/index.js
  .openai/hosting.json
  .openai/drizzle/...
```

`dist/`, `worker/assets.generated.js`, `node_modules/`, `.local-data/`는 생성물/로컬 상태이므로 Git에 포함하지 않습니다. 소스는 `public/`, `worker/`, `db/`, `scripts/`, `tests/`에 있습니다.

## DB 스키마 변경

`db/schema.ts`를 수정하고 다음을 실행합니다.

```bash
npm run db:generate
```

생성한 SQL과 `drizzle/meta/`를 검토·커밋하세요. 배포된 마이그레이션 파일은 수정하지 않고 새 마이그레이션을 추가합니다. 로컬 개발 서버는 새로운 마이그레이션을 로컬 DB에 적용하고, Sites 배포는 호스팅 DB에 적용합니다.

## 현재 Sites로 배포

현재 사이트의 `.openai/hosting.json`에는 기존 project ID와 논리 DB 바인딩 `"d1": "DB"`가 들어 있습니다. 정적 사이트가 아니므로 `static` 필드를 추가하지 않습니다.

1. Sites의 `get_site`로 대상과 공개 범위를 확인합니다. 현재 사이트는 공개입니다.
2. Sites 소스 저장소 자격증명을 발급받고 기존 소스를 동기화합니다. GitHub 커밋은 이 Sites 소스 저장소의 커밋과 별개입니다.
3. 이 `site/` 폴더를 Sites 프로젝트 루트로 사용하여 의존성 설치·검사·빌드를 수행합니다.
4. Sites 소스 저장소에 정확한 소스 커밋을 push하고, 같은 소스에서 생성한 `dist/`와 manifest를 패키징합니다.
5. 공개 사이트에는 `save_site_version` 후 `deploy_site_version`을 사용합니다. 반환된 버전·배포 상태를 확인합니다.

Sites 도구가 없는 AI는 코드를 수정하고 GitHub에 올리는 작업까지 할 수 있습니다. 실제 운영 사이트 반영에는 별도 Sites 배포가 필요합니다. GitHub Actions 자동 배포는 설정하지 않았습니다.

다른 호스팅으로 이전한다면 표준 Cloudflare Worker의 `fetch(request, env)`와 D1 바인딩 `env.DB`를 제공하고, 동일한 SQL 마이그레이션을 새 DB에 적용해야 합니다. 호스팅별 인증·프로비저닝 설정은 이 저장소에 포함하지 않았습니다.

## 데이터와 검증 범위

- 화면·API 구현은 운영 배포 버전 3 기준입니다.
- 게시판 사용자 데이터는 운영 D1에 있으며 이 저장소에 포함하지 않았습니다.
- 정량 데이터는 제공 자료이며 원문 전체를 독립 재검증했다는 뜻이 아닙니다.
- 배포 당시 공개 사이트에서 익명 등록·다른 방문자 조회·수정 이력·삭제를 확인했습니다. 테스트 글은 삭제했습니다.
- 로컬 DOM 통합 검증을 수행했으나 실제 브라우저 시각 검수는 환경 제약으로 완료하지 못했습니다.

상세 산식·제품 의도·알려진 데이터 불일치는 `AI_HANDOFF.md`를 읽으세요.
