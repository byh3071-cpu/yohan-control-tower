"use client"

import { Canvas, useFrame } from "@react-three/fiber"
import { OrbitControls, Stars, Html } from "@react-three/drei"
import { useMemo, useRef, useState, Suspense, useEffect, type MutableRefObject } from "react"
import * as THREE from "three"
import {
  CATEGORY_GLOW_COLORS,
  type ConstellationData,
  type ConstellationEdgePayload,
  type ConstellationNodePayload,
} from "@/lib/constellation"
import type { DocCategory } from "@/lib/types"
import { computePulledPositions } from "@/lib/constellation-gravity"

function useNodeMap(nodes: ConstellationNodePayload[]) {
  return useMemo(() => new Map(nodes.map((n) => [n.relPath, n])), [nodes])
}

function classifyEdges(
  edges: ConstellationEdgePayload[],
  nodeByPath: Map<string, ConstellationNodePayload>,
  filter: DocCategory | "all"
) {
  const bright: ConstellationEdgePayload[] = []
  const dim: ConstellationEdgePayload[] = []
  for (const e of edges) {
    const da = nodeByPath.get(e.from)
    const db = nodeByPath.get(e.to)
    if (!da || !db) continue
    const isBright =
      filter === "all" || (da.category === filter && db.category === filter)
    if (isBright) bright.push(e)
    else dim.push(e)
  }
  return { bright, dim }
}

function AnimatedEdgeLayer({
  edges,
  nodeByPath,
  pulledMap,
  gravityBlend,
  color,
  opacity,
}: {
  edges: ConstellationEdgePayload[]
  nodeByPath: Map<string, ConstellationNodePayload>
  pulledMap: Map<string, { x: number; y: number; z: number }>
  gravityBlend: MutableRefObject<number>
  color: string
  opacity: number
}) {
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const a = new Float32Array(Math.max(6, edges.length * 6))
    g.setAttribute("position", new THREE.BufferAttribute(a, 3))
    g.setDrawRange(0, edges.length * 2)
    return g
  }, [edges.length])

  useEffect(() => () => geometry.dispose(), [geometry])

  useFrame(() => {
    const position = geometry.getAttribute("position") as THREE.BufferAttribute
    const arr = position.array as Float32Array
    const b = gravityBlend.current
    let i = 0
    for (const e of edges) {
      const na = nodeByPath.get(e.from)
      const nb = nodeByPath.get(e.to)
      const pa = pulledMap.get(e.from)
      const pb = pulledMap.get(e.to)
      if (!na || !nb || !pa || !pb) continue
      arr[i++] = THREE.MathUtils.lerp(na.x, pa.x, b)
      arr[i++] = THREE.MathUtils.lerp(na.y, pa.y, b)
      arr[i++] = THREE.MathUtils.lerp(na.z, pa.z, b)
      arr[i++] = THREE.MathUtils.lerp(nb.x, pb.x, b)
      arr[i++] = THREE.MathUtils.lerp(nb.y, pb.y, b)
      arr[i++] = THREE.MathUtils.lerp(nb.z, pb.z, b)
    }
    position.needsUpdate = true
  })

  if (edges.length === 0) return null

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color={color} transparent opacity={opacity} />
    </lineSegments>
  )
}

function ConstellationEdgesLive({
  data,
  nodeByPath,
  filter,
  pulledMap,
  gravityBlend,
}: {
  data: ConstellationData
  nodeByPath: Map<string, ConstellationNodePayload>
  filter: DocCategory | "all"
  pulledMap: Map<string, { x: number; y: number; z: number }>
  gravityBlend: MutableRefObject<number>
}) {
  const { bright, dim } = useMemo(
    () => classifyEdges(data.edges, nodeByPath, filter),
    [data.edges, nodeByPath, filter]
  )

  return (
    <group>
      {bright.length > 0 && (
        <AnimatedEdgeLayer
          edges={bright}
          nodeByPath={nodeByPath}
          pulledMap={pulledMap}
          gravityBlend={gravityBlend}
          color="#64748b"
          opacity={filter === "all" ? 0.35 : 0.5}
        />
      )}
      {dim.length > 0 && (
        <AnimatedEdgeLayer
          edges={dim}
          nodeByPath={nodeByPath}
          pulledMap={pulledMap}
          gravityBlend={gravityBlend}
          color="#475569"
          opacity={0.09}
        />
      )}
    </group>
  )
}

/** D-4: 카테고리별 성운(낮은 폴리 + 가산 블렌딩). 드로우콜 6개 수준 — 인스턴스 미사용. */
function GalaxyNebulae({
  galaxies,
  filter,
  enabled,
}: {
  galaxies: ConstellationData["galaxies"]
  filter: DocCategory | "all"
  enabled: boolean
}) {
  if (!enabled) return null

  return (
    <group>
      {galaxies.map((g) => {
        if (g.count < 1) return null
        const col = CATEGORY_GLOW_COLORS[g.category]
        const dim = filter !== "all" && g.category !== filter
        const radius = 5.2 + Math.min(8.2, Math.sqrt(g.count) * 0.76)
        return (
          <mesh
            key={g.category}
            position={[g.x, g.y + 0.4, g.z]}
            scale={[radius, radius * 0.5, radius]}
            renderOrder={-2}
          >
            <sphereGeometry args={[1, 16, 12]} />
            <meshBasicMaterial
              color={col}
              transparent
              opacity={dim ? 0.014 : 0.05}
              depthWrite={false}
              depthTest
              blending={THREE.AdditiveBlending}
              toneMapped={false}
            />
          </mesh>
        )
      })}
    </group>
  )
}

function StarNode({
  node,
  filter,
  selected,
  onSelect,
  onHover,
  graphPop,
  pulledMap,
  gravityBlend,
  tipOpen,
}: {
  node: ConstellationNodePayload
  filter: DocCategory | "all"
  selected: string | null
  onSelect: (relPath: string) => void
  onHover: (n: ConstellationNodePayload | null) => void
  graphPop: MutableRefObject<number>
  pulledMap: Map<string, { x: number; y: number; z: number }>
  gravityBlend: MutableRefObject<number>
  tipOpen: boolean
}) {
  const mesh = useRef<THREE.Mesh>(null)
  const dim = filter !== "all" && node.category !== filter
  const base = 0.14 + Math.min(0.38, node.degree * 0.028)
  const pull = pulledMap.get(node.relPath)!

  useFrame((st) => {
    if (!mesh.current) return
    const b = gravityBlend.current
    mesh.current.position.x = THREE.MathUtils.lerp(node.x, pull.x, b)
    mesh.current.position.y = THREE.MathUtils.lerp(node.y, pull.y, b)
    mesh.current.position.z = THREE.MathUtils.lerp(node.z, pull.z, b)
    const pulse = 1 + Math.sin(st.clock.elapsedTime * 2.2 + node.relPath.length * 0.07) * 0.045
    const sel = selected === node.relPath ? 1.14 : 1
    mesh.current.scale.setScalar(base * pulse * sel * (dim ? 0.62 : 1) * graphPop.current)
  })

  const col = useMemo(() => new THREE.Color(node.color), [node.color])

  return (
    <mesh
      ref={mesh}
      position={[node.x, node.y, node.z]}
      onClick={(e) => {
        e.stopPropagation()
        onSelect(node.relPath)
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        onHover(node)
        document.body.style.cursor = "pointer"
      }}
      onPointerOut={() => {
        onHover(null)
        document.body.style.cursor = "default"
      }}
    >
      <sphereGeometry args={[1, 20, 20]} />
      <meshStandardMaterial
        color={col}
        emissive={col}
        emissiveIntensity={dim ? 0.12 : 0.55}
        roughness={0.35}
        metalness={0.2}
        transparent={dim}
        opacity={dim ? 0.35 : 1}
      />
      {tipOpen && (
        <Html position={[0, 1.35, 0]} center style={{ pointerEvents: "none" }} distanceFactor={14}>
          <div className="max-w-[220px] rounded-lg border border-border bg-card/95 px-2.5 py-1.5 text-[11px] text-card-foreground shadow-lg backdrop-blur-sm">
            <p className="font-medium leading-snug line-clamp-3">{node.title}</p>
            {node.date && (
              <p className="mt-0.5 text-[10px] text-muted-foreground">{node.date}</p>
            )}
            <p className="mt-0.5 text-[10px] text-muted-foreground truncate">{node.relPath}</p>
          </div>
        </Html>
      )}
    </mesh>
  )
}

function Scene({
  data,
  filter,
  selectedRelPath,
  onSelectDoc,
  asOfYmd,
  hubGravity,
  nebula,
}: {
  data: ConstellationData
  filter: DocCategory | "all"
  selectedRelPath: string | null
  onSelectDoc: (relPath: string) => void
  asOfYmd: string | null
  hubGravity: boolean
  nebula: boolean
}) {
  const nodeByPath = useNodeMap(data.nodes)
  const [hover, setHover] = useState<ConstellationNodePayload | null>(null)
  const graphPop = useRef(1)
  const gravityBlend = useRef(0)
  const gravityTarget = useRef(0)

  const pulledMap = useMemo(
    () =>
      computePulledPositions(data.nodes, data.edges, {
        strength: hubGravity ? 0.47 : 0.26,
      }),
    [data.nodes, data.edges, hubGravity]
  )

  useEffect(() => {
    gravityTarget.current = hubGravity ? 1 : 0
  }, [hubGravity])

  useFrame((_, delta) => {
    graphPop.current = THREE.MathUtils.lerp(graphPop.current, 1, Math.min(1, delta * 5))
    const gb = hubGravity ? 2.05 : 3.1
    gravityBlend.current = THREE.MathUtils.lerp(
      gravityBlend.current,
      gravityTarget.current,
      Math.min(1, delta * gb)
    )
  })

  useEffect(() => {
    if (asOfYmd) graphPop.current = 0.84
  }, [asOfYmd])

  return (
    <>
      <color attach="background" args={["#0a0d12"]} />
      {nebula && <fogExp2 attach="fog" args={["#0a0d12", 0.009]} />}
      <ambientLight intensity={0.35} />
      <pointLight position={[40, 50, 30]} intensity={1.1} color="#e2e8f0" />
      <pointLight position={[-35, 20, -20]} intensity={0.4} color="#818cf8" />

      <GalaxyNebulae galaxies={data.galaxies} filter={filter} enabled={nebula} />

      <Suspense fallback={null}>
        <Stars
          radius={120}
          depth={40}
          count={nebula ? 3200 : 4200}
          factor={3}
          saturation={0}
          fade
          speed={0.3}
        />
      </Suspense>

      <ConstellationEdgesLive
        data={data}
        nodeByPath={nodeByPath}
        filter={filter}
        pulledMap={pulledMap}
        gravityBlend={gravityBlend}
      />

      {data.galaxies.map((g) => (
        <Html
          key={g.category}
          position={[g.x, 5.2, g.z]}
          center
          style={{ pointerEvents: "none" }}
          distanceFactor={22}
        >
          <div className="rounded-md border border-border/80 bg-background/85 px-2 py-0.5 text-[10px] font-medium text-foreground shadow-md backdrop-blur-sm whitespace-nowrap">
            {g.label} <span className="text-muted-foreground">· {g.count}</span>
          </div>
        </Html>
      ))}

      {data.nodes.map((node) => (
        <StarNode
          key={node.relPath}
          node={node}
          filter={filter}
          selected={selectedRelPath}
          onSelect={onSelectDoc}
          onHover={setHover}
          graphPop={graphPop}
          pulledMap={pulledMap}
          gravityBlend={gravityBlend}
          tipOpen={hover?.relPath === node.relPath}
        />
      ))}

      <OrbitControls
        enablePan
        minDistance={10}
        maxDistance={95}
        maxPolarAngle={Math.PI / 2 + 0.12}
        target={[0, 0, 0]}
      />
    </>
  )
}

export interface ConstellationViewProps {
  data: ConstellationData
  filterCategory: DocCategory | "all"
  selectedRelPath: string | null
  onSelectDoc: (relPath: string) => void
  asOfYmd?: string | null
  /** 허브(연결 많은 노드) 쪽으로 이웃 노드가 부드럽게 모임 */
  hubGravity?: boolean
  /** D-4 은하 성운 + 원거리 Fog(끄면 별만 선명) */
  nebula?: boolean
  className?: string
}

export function ConstellationView({
  data,
  filterCategory,
  selectedRelPath,
  onSelectDoc,
  asOfYmd = null,
  hubGravity = false,
  nebula = true,
  className,
}: ConstellationViewProps) {
  return (
    <div className={className ?? "min-h-0 w-full flex-1"} style={{ minHeight: 360 }}>
      <Canvas
        camera={{ position: [0, 26, 44], fov: 52, near: 0.1, far: 260 }}
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 2]}
      >
        <Scene
          data={data}
          filter={filterCategory}
          selectedRelPath={selectedRelPath}
          onSelectDoc={onSelectDoc}
          asOfYmd={asOfYmd}
          hubGravity={hubGravity}
          nebula={nebula}
        />
      </Canvas>
    </div>
  )
}
