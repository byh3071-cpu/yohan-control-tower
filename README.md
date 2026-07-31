# 👁️ 요한 관제탑 (yohan-control-tower)

요한 브레인 **P0 벡터 인프라** 관제탑. 노션(SoT)의 DB/페이지를 읽어 청킹 → Ollama 로컬 임베딩 → **Qdrant** 벡터 인덱스(읽기 전용 복사본)에 저장하고, 검색을 테스트하는 대시보드.

- 포트: **3001** (요한 스튜디오 3000과 분리된 독립 프로젝트)
- 비용 **0**: 외부 API 없음. Ollama 로컬 임베딩 + 로컬 Qdrant.
- 노션이 **SoT**. Qdrant 는 복사본. 수정은 항상 노션에서.
- 모든 실행은 **관제탑 버튼**에서(터미널 인제스트 불필요).

```
[노션 12-DB] --Notion API(읽기)--> [관제탑 3001] --Ollama 임베딩--> [Qdrant 6333]
                                       (청킹 512/50)                    (4 컬렉션, 1024d, Cosine)
```

---

## ⚠️ 이 PC에서 지금 필요한 것 (현재 환경 점검 결과)

| 항목 | 상태 | 조치 |
|---|---|---|
| Docker + Qdrant | 🟢 가동 중 (localhost:6333, v1.17.1) | — |
| 컬렉션 4개 | 🟢 생성됨 | — |
| Node / 빌드 / 타입 / 린트 | 🟢 통과 | — |
| **Ollama** | 🔴 **이 PC 미설치** | **아래 1번** 설치 + 모델 pull 필요 |
| **YOHAN_OS_ROOT / YOHAN_REPOS_ROOT** | 🔴 PC별 설정 필요 | **아래 2번** `.env.local` 에 절대경로 입력 |
| **NOTION_TOKEN** | 🔴 미설정 | **아래 2번** `.env.local` 채우기 |

> 인제스트(버튼 실행)는 **Ollama 와 NOTION_TOKEN 이 모두 준비된 뒤** 동작한다.
> 이 두 가지는 의도적으로 자동 처리하지 않았다(소프트웨어 설치·비밀 토큰은 사용자 영역).

---

## 🚀 셋업 (남은 순서)

### 1. Ollama 설치 + 임베딩 모델

```powershell
winget install Ollama.Ollama      # 또는 https://ollama.com/download 에서 설치
# 새 터미널에서:
ollama pull bge-m3                 # 1024차원, ~1.2GB, 한국어 강함, 4060Ti 8GB 충분
ollama list                        # bge-m3 보이면 OK
```

Ollama 설치 후 서버는 자동으로 `localhost:11434` 에서 뜬다.

### 2. 로컬 경로 + 노션 토큰

1. `.env.example` 을 `.env.local` 로 복사하고 `YOHAN_OS_ROOT` 에 yohan-brain 절대경로, `YOHAN_REPOS_ROOT` 에 레포 모음 절대경로 입력
2. https://www.notion.so/my-integrations 에서 **내부 통합(Internal Integration)** 토큰 발급
3. `.env.local` 의 `NOTION_TOKEN=` 에 붙여넣기
4. **인제스트 대상 12개 DB/페이지를 그 통합과 공유** (각 DB 우상단 ··· → 연결 추가 → 통합 선택)
   - 대상 목록·ID 는 `lib/sources.ts` 참고 (AI 사전·PROTOCOL·RULEBOOK·SUMMARY·지식허브·인물·키워드·헌법·취향·EXEC LOG·RETROSPECT·RESOURCE)

### 3. 인프라 (이미 완료 — 재기동 시 참고)

```powershell
# Qdrant 가 꺼져 있으면:
docker start qdrant
# 최초 1회였다면: docker run -d --name qdrant -p 6333:6333 -p 6334:6334 -v qdrant_data:/qdrant/storage qdrant/qdrant

npm install                 # 의존성 (이미 완료)
npm run init:collections    # 컬렉션 4개 보장 (멱등, 이미 완료)
```

### 4. 실행

```powershell
npm run dev                 # http://localhost:3001
```

브라우저에서:
1. **상태 패널**에서 Qdrant 🟢 / Ollama 🟢 / Notion 🟢 확인
2. **Tier 1** → `AI 사전` 버튼 클릭 → 로그에 조회·청킹·임베딩·저장 진행 표시
3. **검색 테스트** → 컬렉션 `knowledge_base` → "온톨로지와 비슷한 개념" 검색 → 결과 확인
4. `PROTOCOL`·`RULEBOOK` → "코드 작성 규칙" 검색(컬렉션 `system_rules`)
5. 이후 **전체 동기화(Tier 1)** 또는 Tier 2·3 버튼으로 확장

---

## ✅ P0 검증 체크리스트 (10)

| # | 항목 | 상태 |
|---|---|---|
| 1 | Qdrant localhost:6333 응답 | 🟢 통과 |
| 2 | 컬렉션 4개 생성 | 🟢 통과 |
| 3 | bge-m3 1024차원 | ⏳ Ollama 설치 후 |
| 4 | localhost:3001 대시보드 렌더 | 🟢 통과 |
| 5 | AI 사전 인제스트(버튼) | ⏳ Ollama+토큰 후 |
| 6 | "온톨로지와 비슷한 개념" 검색 ≥3 | ⏳ 인제스트 후 |
| 7 | PROTOCOL → system_rules | ⏳ Ollama+토큰 후 |
| 8 | "코드 작성 규칙" 검색 | ⏳ 인제스트 후 |
| 9 | 4 컬렉션 건수 실시간 표시 | 🟢 통과 |
| 10 | Notion 실패 시 중단 없이 계속 | 🟢 통과 (엔진 레코드별 try/catch + status graceful) |

---

## 🗂 구조

```
yohan-control-tower/
├── app/
│   ├── page.tsx                 # 대시보드(상태/버튼/로그/검색)
│   ├── layout.tsx · globals.css # 미니멀 다크 터미널 테마
│   └── api/
│       ├── status/route.ts      # Qdrant/Ollama/Notion 상태 + 건수
│       ├── query/route.ts       # 벡터 검색
│       ├── reset/route.ts       # 컬렉션 재생성(파괴적)
│       └── ingest/<slug>/route.ts  # 12 소스 + all(Tier1)
├── lib/
│   ├── types.ts                 # 공용 타입(any 금지)
│   ├── collections.ts           # 4 컬렉션 정의(1024/Cosine)
│   ├── sources.ts               # 12 소스 레지스트리(UI·라우트 공용 SoT)
│   ├── qdrant.ts                # Qdrant 클라이언트(멱등 pointId)
│   ├── ollama.ts                # 임베딩(1024 검증)
│   ├── notion.ts                # v5 dataSources.query + 블록 직렬화
│   ├── chunking.ts              # 512토큰/50오버랩/최소50병합
│   ├── producers.ts             # 소스별 텍스트 구성
│   └── ingest.ts                # 인제스트 엔진(노션→청킹→임베딩→upsert)
├── components/                  # CollectionStatus·IngestButton·LogViewer·QueryTester
├── scripts/init-collections.ts  # npm run init:collections
└── .env.local                   # NOTION_TOKEN(비밀, gitignore)
```

## 🔧 명령어

```powershell
npm run dev               # 개발 서버(3001)
npm run build             # 프로덕션 빌드
npm run typecheck         # tsc --noEmit
npm run lint              # eslint
npm run init:collections  # Qdrant 컬렉션 4개 보장
```

## 📌 원칙 메모

- `memory/` 파일은 P0 인제스트 대상 **아님** (이중 SoT 방지).
- 모든 벡터 포인트에 `source_system: "notion"` 메타데이터.
- 포인트 ID 는 `(page_id, chunk_index)` 결정적 → **재인제스트 멱등**(중복 없음).
- 관계형 프로퍼티(UUID)는 임베딩 텍스트에서 제외.
- n8n / claude -p(headless) 미사용.
