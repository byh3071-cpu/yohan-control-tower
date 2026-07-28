import { VectorPanel } from '@/components/vector/VectorPanel'

/**
 * 벡터 인프라 독립 주소.
 * 탭 셸(`app/page.tsx`)의 벡터 탭과 같은 컴포넌트를 렌더한다 — 화면이 갈라지지 않게.
 */
export default function VectorPage() {
  return <VectorPanel />
}
