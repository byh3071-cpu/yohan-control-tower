/**
 * 옵시디언 그래프뷰식 2D 포스 시뮬레이션 (d3-force 동작 재현, 외부 의존성 없음).
 * - 링크 스프링(차수 bias) · 다체 반발(1/d) · 중심 인력 · alpha 감쇠/재가열(d3 동일 공식).
 * - 파라미터 범위는 옵시디언 "힘" 패널과 동일: 중심 0~1 · 반발 0~20 · 링크 0~1 · 거리 30~500.
 */

export interface SimNode {
  id: string
  degree: number
  x: number
  y: number
  vx: number
  vy: number
  /** 드래그 중 고정 좌표 (d3 fx/fy 동작) */
  fx: number | null
  fy: number | null
}

export interface SimLink<N extends SimNode = SimNode> {
  source: N
  target: N
  /** d3 link force와 동일: source 차수 / (source+target 차수) */
  bias: number
}

export interface ForceParams {
  /** 중심 힘 0~1 */
  center: number
  /** 반발 힘 0~20 */
  repel: number
  /** 링크 힘 0~1 */
  link: number
  /** 링크 거리 30~500 */
  linkDistance: number
}

export const DEFAULT_FORCE_PARAMS: ForceParams = {
  center: 0.4,
  repel: 10,
  link: 1,
  linkDistance: 250,
}

const ALPHA_MIN = 0.001
/** d3 기본값: 300틱에 alphaMin 도달 */
const ALPHA_DECAY = 1 - Math.pow(ALPHA_MIN, 1 / 300)
const VELOCITY_DECAY = 0.4
/** 반발 슬라이더(0~20) → 다체 힘 스케일 */
const REPEL_SCALE = 150

function jiggle(): number {
  return (Math.random() - 0.5) * 1e-3
}

export class ForceSim2D<N extends SimNode = SimNode> {
  nodes: N[] = []
  links: SimLink<N>[] = []
  params: ForceParams = { ...DEFAULT_FORCE_PARAMS }
  alpha = 1
  alphaTarget = 0

  get active(): boolean {
    return this.alpha >= ALPHA_MIN || this.alphaTarget >= ALPHA_MIN
  }

  /** 드래그 시작 0.3 / 종료 0 (d3 관례) */
  setAlphaTarget(t: number) {
    this.alphaTarget = t
  }

  /** 구조·파라미터 변경 후 재가열 */
  poke(alpha = 0.6) {
    this.alpha = Math.max(this.alpha, alpha)
  }

  tick(): boolean {
    if (!this.active) return false
    this.alpha += (this.alphaTarget - this.alpha) * ALPHA_DECAY
    const a = this.alpha
    const { center, repel, link, linkDistance } = this.params
    const nodes = this.nodes
    const n = nodes.length

    for (const l of this.links) {
      const s = l.source
      const t = l.target
      let dx = t.x + t.vx - s.x - s.vx || jiggle()
      let dy = t.y + t.vy - s.y - s.vy || jiggle()
      const dist = Math.sqrt(dx * dx + dy * dy)
      const k = ((dist - linkDistance) / dist) * a * link
      dx *= k
      dy *= k
      t.vx -= dx * l.bias
      t.vy -= dy * l.bias
      s.vx += dx * (1 - l.bias)
      s.vy += dy * (1 - l.bias)
    }

    const repelK = repel * REPEL_SCALE
    if (repelK > 0) {
      for (let i = 0; i < n; i++) {
        const ni = nodes[i]
        for (let j = i + 1; j < n; j++) {
          const nj = nodes[j]
          let dx = nj.x - ni.x
          let dy = nj.y - ni.y
          let d2 = dx * dx + dy * dy
          if (d2 === 0) {
            dx = jiggle()
            dy = jiggle()
            d2 = dx * dx + dy * dy
          }
          // 근접 폭주 방지 하한
          if (d2 < 100) d2 = 100
          const w = (repelK * a) / d2
          const fx = dx * w
          const fy = dy * w
          ni.vx -= fx
          ni.vy -= fy
          nj.vx += fx
          nj.vy += fy
        }
      }
    }

    const centerK = center * 0.1 * a
    for (const node of nodes) {
      node.vx -= node.x * centerK
      node.vy -= node.y * centerK
    }

    for (const node of nodes) {
      if (node.fx != null) {
        node.x = node.fx
        node.vx = 0
      } else {
        node.vx *= 1 - VELOCITY_DECAY
        node.x += node.vx
      }
      if (node.fy != null) {
        node.y = node.fy
        node.vy = 0
      } else {
        node.vy *= 1 - VELOCITY_DECAY
        node.y += node.vy
      }
    }
    return true
  }
}
