import { dirname, join } from "node:path"

import { isSameOriginRequest } from "./inbox-controller"
import { RunCommandExecutionError } from "./run-command-runner"

export const RUN_TIMEOUT_MS = 120_000
export const RUN_MAX_BUFFER_BYTES = 1_048_576
export const RUN_STDOUT_RESPONSE_CHARS = 2_000
export const RUN_STDERR_RESPONSE_CHARS = 500
export const MAX_INGEST_URL_CHARS = 2_048

const DISALLOWED_URL_CHARACTERS =
  /[\u0000-\u001f\u007f-\u009f\u061c\u200e\u200f\u2028\u2029\u202a-\u202e\u2066-\u2069]/
const SECRET_LABEL_PATTERN =
  "[A-Z0-9_-]*(?:TOKEN|SECRET|PASSWORD|PASSWD|API[_-]?KEY|PRIVATE[_-]?KEY)[A-Z0-9_-]*"
const JSON_STYLE_SECRET = new RegExp(
  `(["']?)(${SECRET_LABEL_PATTERN})\\1\\s*:\\s*(?:"(?:\\\\.|[^"\\\\])*"|'(?:\\\\.|[^'\\\\])*'|[^,}\\r\\n]*)`,
  "gi",
)
const ASSIGNED_SECRET = new RegExp(
  `\\b(${SECRET_LABEL_PATTERN})\\s*=\\s*[^\\r\\n,;]*`,
  "gi",
)
const HTTP_URL = /https?:\/\/[^\s"'<>]+/gi
const UNC_ABSOLUTE_PATH = /\\\\[^\\\s"'<>|]+\\[^\\\s"'<>|]+(?:\\[^\\\s"'<>|]+)*/g
const WINDOWS_ABSOLUTE_PATH = /(?<![A-Za-z0-9])[A-Za-z]:[\\/](?:[^\s"'<>|]+[\\/]?)+/g
const POSIX_ABSOLUTE_PATH =
  /(^|[\s"'=(])\/(?:Users|home|root|private|tmp|var|etc|opt|usr|srv|mnt|Volumes)(?:\/[^\s"'<>|]*)?/gm

const HUMAN_GATE_MESSAGE =
  "사람 게이트 명령입니다 — 관제탑에서 실행할 수 없습니다. 터미널에서 직접 실행하세요."

export type RunCommandAction =
  | "ingest:url"
  | "ingest:all"
  | "sync:notion:pull"
  | "report:weekly"
  | "check:drift"
  | "search:memory"
  | "automation:batch"
  | "build"
  | "bot:status"
  | "git:sync"
  | "sync:notion:push"

type RunnableActionSpec = Readonly<{
  kind: "runnable"
  executable: string
  argv: readonly string[]
  input: "none" | "url"
}>

type HumanGateActionSpec = Readonly<{
  kind: "human-gate"
  humanGate: true
}>

export type RunCommandActionSpec = RunnableActionSpec | HumanGateActionSpec
export type RunCommandRegistry = Readonly<Record<RunCommandAction, RunCommandActionSpec>>

export type RunCommandInvocation = Readonly<{
  executable: string
  argv: readonly string[]
  cwd: string
  options: Readonly<{
    shell: false
    timeoutMs: number
    maxBufferBytes: number
  }>
}>

export type RunCommandOutput = Readonly<{
  stdout: string
  stderr: string
}>

export type RunCommandRunner = (invocation: RunCommandInvocation) => Promise<RunCommandOutput>

export type RunCommandDependencies = Readonly<{
  registry: RunCommandRegistry
  resolveRepoRoot: () => string
  runner: RunCommandRunner
}>

type ParsedRunCommand = Readonly<{
  action: RunCommandAction
  spec: RunCommandActionSpec
  url?: string
}>

type InputErrorCode =
  | "INVALID_CONTENT_TYPE"
  | "INVALID_JSON"
  | "INVALID_BODY"
  | "INVALID_ACTION"
  | "UNKNOWN_ACTION"
  | "ARGS_FORBIDDEN"
  | "URL_REQUIRED"
  | "INVALID_URL"

class RunCommandInputError extends Error {
  constructor(
    readonly code: InputErrorCode,
    message: string,
  ) {
    super(message)
    this.name = "RunCommandInputError"
  }
}

type PackageCommand = Readonly<{
  executable: string
  argvPrefix: readonly string[]
}>

function packageCommand(
  command: "npm" | "npx",
  platform: NodeJS.Platform,
  nodeExecutable: string,
): PackageCommand {
  if (platform !== "win32") return { executable: command, argvPrefix: [] }
  // Node 공식 계약상 Windows .cmd는 terminal 없이 execFile로 직접 실행할 수 없다.
  // cmd.exe를 열지 않고 같은 Node 설치의 JS CLI를 첫 argv로 고정해 no-shell을 보존한다.
  const cliPath = join(dirname(nodeExecutable), "node_modules", "npm", "bin", `${command}-cli.js`)
  return { executable: nodeExecutable, argvPrefix: [cliPath] }
}

function runnableNpm(command: PackageCommand, script: string): RunnableActionSpec {
  return Object.freeze({
    kind: "runnable",
    executable: command.executable,
    argv: Object.freeze([...command.argvPrefix, "run", script]),
    input: "none",
  })
}

export function createActionRegistry(
  platform: NodeJS.Platform = process.platform,
  nodeExecutable: string = process.execPath,
): RunCommandRegistry {
  const npm = packageCommand("npm", platform, nodeExecutable)
  const npx = packageCommand("npx", platform, nodeExecutable)
  return Object.freeze({
    "ingest:url": Object.freeze({
      kind: "runnable",
      executable: npx.executable,
      argv: Object.freeze([...npx.argvPrefix, "tsx", "src/ingest-url-cli.ts"]),
      input: "url",
    }),
    "ingest:all": runnableNpm(npm, "ingest:all"),
    "sync:notion:pull": runnableNpm(npm, "sync:notion:pull"),
    "report:weekly": runnableNpm(npm, "report:weekly"),
    "check:drift": runnableNpm(npm, "check:drift"),
    "search:memory": runnableNpm(npm, "search:memory"),
    "automation:batch": runnableNpm(npm, "automation:batch"),
    build: runnableNpm(npm, "build"),
    "bot:status": runnableNpm(npm, "telegram:health"),
    "git:sync": Object.freeze({ kind: "human-gate", humanGate: true }),
    "sync:notion:push": Object.freeze({ kind: "human-gate", humanGate: true }),
  })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function hasOwn(value: object, key: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(value, key)
}

function validateIngestUrl(value: unknown): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new RunCommandInputError("URL_REQUIRED", "ingest:url에는 URL 문자열이 필요합니다.")
  }
  if (
    value.length > MAX_INGEST_URL_CHARS
    || value.trim() !== value
    || DISALLOWED_URL_CHARACTERS.test(value)
  ) {
    throw new RunCommandInputError("INVALID_URL", "허용된 길이의 HTTP(S) URL이 필요합니다.")
  }

  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    throw new RunCommandInputError("INVALID_URL", "올바른 HTTP(S) URL이 필요합니다.")
  }
  if (
    (parsed.protocol !== "http:" && parsed.protocol !== "https:")
    || parsed.hostname.length === 0
    || parsed.username.length > 0
    || parsed.password.length > 0
  ) {
    throw new RunCommandInputError("INVALID_URL", "자격 증명 없는 HTTP(S) URL만 허용됩니다.")
  }
  return value
}

function parseRunCommandBody(body: unknown, registry: RunCommandRegistry): ParsedRunCommand {
  if (!isRecord(body)) {
    throw new RunCommandInputError("INVALID_BODY", "JSON 객체가 필요합니다.")
  }
  const allowedKeys = new Set(["action", "args"])
  if (Object.keys(body).some((key) => !allowedKeys.has(key))) {
    throw new RunCommandInputError("INVALID_BODY", "허용되지 않은 요청 필드가 있습니다.")
  }
  if (typeof body.action !== "string" || body.action.length === 0) {
    throw new RunCommandInputError("INVALID_ACTION", "action 문자열이 필요합니다.")
  }
  if (!hasOwn(registry, body.action)) {
    throw new RunCommandInputError("UNKNOWN_ACTION", "지원하지 않는 action입니다.")
  }

  const action = body.action as RunCommandAction
  const spec = registry[action]
  if (action === "ingest:url") {
    return { action, spec, url: validateIngestUrl(body.args) }
  }
  if (hasOwn(body, "args")) {
    throw new RunCommandInputError("ARGS_FORBIDDEN", "이 action은 args 필드를 허용하지 않습니다.")
  }
  return { action, spec }
}

function json(status: number, body: Record<string, unknown>): Response {
  return Response.json(body, { status })
}

function isJsonContentType(value: string | null): boolean {
  if (value === null) return false
  const segments = value.split(";")
  if (segments.shift()?.trim().toLowerCase() !== "application/json") return false
  if (segments.length === 0) return true
  return segments.length === 1 && /^charset\s*=\s*utf-8$/i.test(segments[0].trim())
}

function redactProcessText(value: string, cwd: string): string {
  let safe = value.split(cwd).join("[경로]")
  safe = safe.replace(/(https?:\/\/)[^/\s@]+@/gi, "$1[비공개]@")
  safe = safe.replace(/\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]+/gi, "$1 [비공개]")
  safe = safe.replace(JSON_STYLE_SECRET, "$1$2$1: [비공개]")
  safe = safe.replace(ASSIGNED_SECRET, "$1=[비공개]")

  const protectedUrls: string[] = []
  safe = safe.replace(HTTP_URL, (url) => {
    protectedUrls.push(url)
    return `\u{e000}${protectedUrls.length - 1}\u{e001}`
  })
  safe = safe.replace(UNC_ABSOLUTE_PATH, "[경로]")
  safe = safe.replace(WINDOWS_ABSOLUTE_PATH, "[경로]")
  safe = safe.replace(POSIX_ABSOLUTE_PATH, "$1[경로]")
  safe = safe.replace(/\u{e000}(\d+)\u{e001}/gu, (_placeholder, index: string) => {
    return protectedUrls[Number(index)] ?? ""
  })
  return safe
}

function boundedOutput(output: RunCommandOutput, cwd: string): RunCommandOutput {
  return {
    stdout: redactProcessText(output.stdout, cwd).slice(-RUN_STDOUT_RESPONSE_CHARS),
    stderr: redactProcessText(output.stderr, cwd).slice(-RUN_STDERR_RESPONSE_CHARS),
  }
}

function executionFailure(error: RunCommandExecutionError, action: RunCommandAction, cwd: string): Response {
  const output = boundedOutput(error.output, cwd)
  if (error.kind === "timeout") {
    return json(504, {
      ok: false,
      action,
      code: "COMMAND_TIMEOUT",
      error: "명령 실행 시간이 초과되었습니다.",
      ...output,
    })
  }
  if (error.kind === "output-limit") {
    return json(500, {
      ok: false,
      action,
      code: "COMMAND_OUTPUT_LIMIT",
      error: "명령 출력 한도를 초과했습니다.",
      ...output,
    })
  }
  return json(500, {
    ok: false,
    action,
    code: "COMMAND_FAILED",
    error: "명령 실행에 실패했습니다.",
    ...output,
  })
}

export function createRunCommandHandler(dependencies: RunCommandDependencies) {
  return async function handleRunCommand(request: Request): Promise<Response> {
    if (!isSameOriginRequest(request)) {
      return json(403, { ok: false, code: "FORBIDDEN_ORIGIN", error: "동일 출처 요청만 허용됩니다." })
    }

    if (!isJsonContentType(request.headers.get("content-type"))) {
      return json(400, {
        ok: false,
        code: "INVALID_CONTENT_TYPE",
        error: "Content-Type은 application/json이어야 합니다.",
      })
    }

    let body: unknown
    try {
      body = await request.json() as unknown
    } catch {
      return json(400, { ok: false, code: "INVALID_JSON", error: "올바른 JSON 본문이 필요합니다." })
    }

    let parsed: ParsedRunCommand
    try {
      parsed = parseRunCommandBody(body, dependencies.registry)
    } catch (error: unknown) {
      if (error instanceof RunCommandInputError) {
        return json(400, { ok: false, code: error.code, error: error.message })
      }
      return json(400, { ok: false, code: "INVALID_BODY", error: "요청 본문을 해석할 수 없습니다." })
    }

    if (parsed.spec.kind === "human-gate") {
      return json(403, {
        ok: false,
        action: parsed.action,
        humanGate: true,
        error: HUMAN_GATE_MESSAGE,
      })
    }

    let cwd: string
    try {
      cwd = dependencies.resolveRepoRoot()
    } catch (error: unknown) {
      void error
      return json(500, {
        ok: false,
        action: parsed.action,
        code: "COMMAND_CWD_UNAVAILABLE",
        error: "명령 실행 경로를 확인할 수 없습니다.",
      })
    }

    const invocation: RunCommandInvocation = {
      executable: parsed.spec.executable,
      argv: parsed.url === undefined ? [...parsed.spec.argv] : [...parsed.spec.argv, parsed.url],
      cwd,
      options: {
        shell: false,
        timeoutMs: RUN_TIMEOUT_MS,
        maxBufferBytes: RUN_MAX_BUFFER_BYTES,
      },
    }

    try {
      const output = boundedOutput(await dependencies.runner(invocation), cwd)
      return json(200, { ok: true, action: parsed.action, ...output })
    } catch (error: unknown) {
      if (error instanceof RunCommandExecutionError) {
        return executionFailure(error, parsed.action, cwd)
      }
      return json(500, {
        ok: false,
        action: parsed.action,
        code: "COMMAND_FAILED",
        error: "명령 실행에 실패했습니다.",
        stdout: "",
        stderr: "",
      })
    }
  }
}
