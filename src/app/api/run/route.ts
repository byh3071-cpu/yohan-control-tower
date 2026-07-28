import { NextRequest, NextResponse } from "next/server"
import { exec } from "node:child_process"
import { resolve } from "node:path"

export const dynamic = "force-dynamic"

const ROOT = resolve(/* turbopackIgnore: true */ process.cwd(), "..")

const ALLOWED_ACTIONS: Record<string, { cmd: string; cwd?: string; shell?: string }> = {
  "ingest:url": { cmd: "npx tsx src/ingest-url-cli.ts" },
  "ingest:all": { cmd: "npm run ingest:all" },
  "sync:notion:push": { cmd: "npm run sync:notion:push" },
  "sync:notion:pull": { cmd: "npm run sync:notion:pull" },
  "report:weekly": { cmd: "npm run report:weekly" },
  "check:drift": { cmd: "npm run check:drift" },
  "search:memory": { cmd: "npm run search:memory" },
  "automation:batch": { cmd: "npm run automation:batch" },
  build: { cmd: "npm run build" },
  /** Windows PowerShell 5.1은 `&&` 미지원 → CMD에서 실행 */
  "git:sync": { cmd: "git pull && git push", shell: process.platform === "win32" ? "cmd.exe" : undefined },
  "bot:status": { cmd: "npm run telegram:health" },
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

  const safeArgs = args?.replace(/[;&|`$(){}[\]<>!#]/g, "") ?? ""
  const cmd = safeArgs ? `${spec.cmd} ${safeArgs}` : spec.cmd
  const cwd = spec.cwd ?? ROOT

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
