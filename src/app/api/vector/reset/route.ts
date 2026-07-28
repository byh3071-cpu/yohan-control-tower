/** POST /api/vector/reset — 4개 컬렉션 재생성(데이터 전체 삭제). 파괴적 — UI 에서 확인 후 호출. */
import { ALL_COLLECTIONS } from '@/lib/vector/sources'
import { recreateCollection } from '@/lib/vector/qdrant'

export const runtime = 'nodejs'

/**
 * 같은 오리진에서 온 요청인지 검사. Route Handler 는 Server Action 과 달리
 * CSRF 내장 보호가 없어, 임의 웹페이지의 simple POST 가 preflight 없이 도달한다.
 * 브라우저는 cross-origin 요청에 Origin 을 강제로 실으며 JS 로 제거할 수 없으므로,
 * Origin 의 host 와 Host 헤더를 대조해 외부 트리거를 차단한다.
 * Origin 이 없으면(브라우저가 아닌 직접 호출) CSRF 범위 밖이라 통과시킨다.
 */
function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get('origin')
  if (origin === null) return true
  try {
    return new URL(origin).host === req.headers.get('host')
  } catch {
    return false // 'null' 등 불투명 origin
  }
}

export async function POST(req: Request): Promise<Response> {
  if (!isSameOrigin(req)) {
    return Response.json({ error: 'cross-origin 요청 거부' }, { status: 403 })
  }
  try {
    for (const c of ALL_COLLECTIONS) await recreateCollection(c)
    return Response.json({ ok: true, reset: ALL_COLLECTIONS })
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
