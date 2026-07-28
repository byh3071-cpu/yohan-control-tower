import { NextRequest, NextResponse } from "next/server"
import { exec } from "node:child_process"
import { resolveRepoRoot } from "@/lib/paths"

export const dynamic = "force-dynamic"

type ActionSpec = {
  cmd: string
  /**
   * 실행 루트. 현재 11종 전부 brain 레포 명령이라 단일 리터럴이다(ARCHITECTURE §6-③).
   * 옵셔널·기본값·암묵 폴백을 두지 않는다 — 이관 전 `resolve(cwd, "..")` 가
   * `brain/dashboard` 안에서만 우연히 맞았고, 옮겨오면 `yohan-ecosystem/` 을 가리켜
   * 11개 액션이 전부 엉뚱한 디렉토리에서 실행됐다.
   */
  root: "brain"
  shell?: string
  /**
   * 사람 게이트 — 되돌리기 어렵거나 외부로 나가는 명령. 서버가 403 으로 거부한다.
   * RULES.md §보안("main 직 push·발송은 사람 승인 후에만")의 코드 레벨 집행.
   * 열려면 이 플래그만 지우면 된다(오너 판정 사항).
   */
  humanGate?: true
}

const ALLOWED_ACTIONS: Record<string, ActionSpec> = {
  "ingest:url": { cmd: "npx tsx src/ingest-url-cli.ts", root: "brain" },
  "ingest:all": { cmd: "npm run ingest:all", root: "brain" },
  "sync:notion:pull": { cmd: "npm run sync:notion:pull", root: "brain" },
  "report:weekly": { cmd: "npm run report:weekly", root: "brain" },
  "check:drift": { cmd: "npm run check:drift", root: "brain" },
  "search:memory": { cmd: "npm run search:memory", root: "brain" },
  "automation:batch": { cmd: "npm run automation:batch", root: "brain" },
  build: { cmd: "npm run build", root: "brain" },
  "bot:status": { cmd: "npm run telegram:health", root: "brain" },

  // ── 사람 게이트 (2026-07-28 오너 판정) ──
  /** `git pull && git push` = main 직 push. Windows PowerShell 5.1 은 `&&` 미지원 → CMD. */
  "git:sync": {
    cmd: "git pull && git push",
    root: "brain",
    shell: process.platform === "win32" ? "cmd.exe" : undefined,
    humanGate: true,
  },
  /** 노션으로 나가는 외부 발송. */
  "sync:notion:push": { cmd: "npm run sync:notion:push", root: "brain", humanGate: true },
}

function runCmd(cmd: string, cwd: string, shell?: string): Promise<{ stdout: string; stderr: string }> {
  const shellOpt =
    shell !== undefined
      ? shell
      : process.platform === "win32"
        ? "powershell.exe"
        : undefined
  return new Promise((resolve, reject) => {
    exec(cmd, { cwd, timeout: 120_000, ...(shellOpt ? { shell: shellOpt } : {}) }, (err, stdout, stderr) => {
      if (err) reject({ stdout, stderr, message: err.message })
      else resolve({ stdout, stderr })
    })
  })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const action = body.action as string
  const args = body.args as string | undefined

  if (!action) {
    return NextResponse.json({ error: "action required" }, { status: 400 })
  }

  const spec = ALLOWED_ACTIONS[action]
  if (!spec) {
    return NextResponse.json({ error: `unknown action: ${action}` }, { status: 400 })
  }

  if (spec.humanGate) {
    return NextResponse.json(
      {
        ok: false,
        action,
        humanGate: true,
        error: "사람 게이트 명령입니다 — 관제탑에서 실행할 수 없습니다. 터미널에서 직접 실행하세요.",
      },
      { status: 403 }
    )
  }

  // TODO(보안): args 가 블록리스트 필터다. 액션별 허용 패턴(allowlist)으로 좁히거나
  // args 를 아예 받지 않는 편이 RULES.md §보안의 allowlist 원칙에 맞다.
  const safeArgs = args?.replace(/[;&|`$(){}[\]<>!#]/g, "") ?? ""
  const cmd = safeArgs ? `${spec.cmd} ${safeArgs}` : spec.cmd

  // lazy 호출 — resolveRepoRoot() 는 env 미설정 시 throw 한다. 모듈 로드가 아니라
  // 요청 처리 중에 불러야 앱 기동 자체는 살아 있다.
  let cwd: string
  try {
    cwd = resolveRepoRoot()
  } catch (e) {
    return NextResponse.json(
      { ok: false, action, error: e instanceof Error ? e.message : "repo root 해석 실패" },
      { status: 500 }
    )
  }

  try {
    const { stdout, stderr } = await runCmd(cmd, cwd, spec.shell)
    return NextResponse.json({ ok: true, action, stdout: stdout.slice(-2000), stderr: stderr.slice(-500) })
  } catch (e: unknown) {
    const err = e as { stdout?: string; stderr?: string; message?: string }
    return NextResponse.json({
      ok: false,
      action,
      error: err.message ?? "unknown",
      stdout: (err.stdout ?? "").slice(-2000),
      stderr: (err.stderr ?? "").slice(-500),
    }, { status: 500 })
  }
}
