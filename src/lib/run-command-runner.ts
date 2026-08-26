import { execFile } from "node:child_process"

import type { RunCommandInvocation, RunCommandOutput, RunCommandRunner } from "./run-command-controller"

type ExecFileAdapterError = Error & Readonly<{
  code?: string | number | null
  killed?: boolean
  signal?: NodeJS.Signals | string | null
}>

type ExecFileAdapterOptions = Readonly<{
  cwd: string
  encoding: "utf8"
  maxBuffer: number
  shell: false
  timeout: number
  windowsHide: true
}>

type ExecFileAdapterCallback = (
  error: ExecFileAdapterError | null,
  stdout: string,
  stderr: string,
) => void

export type ExecFileAdapter = (
  executable: string,
  argv: readonly string[],
  options: ExecFileAdapterOptions,
  callback: ExecFileAdapterCallback,
) => void

export type RunCommandFailureKind = "failed" | "timeout" | "output-limit"

export class RunCommandExecutionError extends Error {
  constructor(
    readonly kind: RunCommandFailureKind,
    readonly output: RunCommandOutput,
  ) {
    super("run command execution failed")
    this.name = "RunCommandExecutionError"
  }
}

const nodeExecFileAdapter: ExecFileAdapter = (executable, argv, options, callback) => {
  execFile(executable, [...argv], options, (error, stdout, stderr) => {
    callback(error, stdout, stderr)
  })
}

function classifyExecFileError(error: ExecFileAdapterError): RunCommandFailureKind {
  if (error.code === "ERR_CHILD_PROCESS_STDIO_MAXBUFFER") return "output-limit"
  // Windows TerminateProcess 경로는 signal이 null일 수 있다. 이 runner에는 timeout 외
  // AbortSignal/외부 kill 입력이 없으므로 maxBuffer를 먼저 제외한 killed는 timeout이다.
  if (error.killed === true) return "timeout"
  return "failed"
}

export function createExecFileRunner(adapter: ExecFileAdapter = nodeExecFileAdapter): RunCommandRunner {
  return async function runWithExecFile(invocation: RunCommandInvocation): Promise<RunCommandOutput> {
    return await new Promise<RunCommandOutput>((resolve, reject) => {
      adapter(
        invocation.executable,
        invocation.argv,
        {
          cwd: invocation.cwd,
          encoding: "utf8",
          maxBuffer: invocation.options.maxBufferBytes,
          shell: false,
          timeout: invocation.options.timeoutMs,
          windowsHide: true,
        },
        (error, stdout, stderr) => {
          if (error) {
            reject(new RunCommandExecutionError(classifyExecFileError(error), { stdout, stderr }))
            return
          }
          resolve({ stdout, stderr })
        },
      )
    })
  }
}
