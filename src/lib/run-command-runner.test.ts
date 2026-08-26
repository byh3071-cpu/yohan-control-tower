import assert from "node:assert/strict"
import test from "node:test"

import {
  createExecFileRunner,
  RunCommandExecutionError,
  type ExecFileAdapter,
} from "./run-command-runner"
import type { RunCommandInvocation } from "./run-command-controller"

const INVOCATION: RunCommandInvocation = {
  executable: "C:\\nodejs\\node.exe",
  argv: ["C:\\nodejs\\node_modules\\npm\\bin\\npm-cli.js", "run", "build"],
  cwd: "C:\\brain-fixture",
  options: {
    shell: false,
    timeoutMs: 120_000,
    maxBufferBytes: 1_048_576,
  },
}

test("execFile adapter에 executable·argv·cwd·no-shell·resource caps를 정확히 전달한다", async () => {
  let captured: Parameters<ExecFileAdapter> | undefined
  const adapter: ExecFileAdapter = (executable, argv, options, callback) => {
    captured = [executable, argv, options, callback]
    callback(null, "stdout", "stderr")
  }
  const runner = createExecFileRunner(adapter)

  const output = await runner(INVOCATION)
  assert.deepEqual(output, { stdout: "stdout", stderr: "stderr" })
  assert.ok(captured)
  assert.equal(captured[0], "C:\\nodejs\\node.exe")
  assert.deepEqual(captured[1], ["C:\\nodejs\\node_modules\\npm\\bin\\npm-cli.js", "run", "build"])
  assert.deepEqual(captured[2], {
    cwd: "C:\\brain-fixture",
    encoding: "utf8",
    maxBuffer: 1_048_576,
    shell: false,
    timeout: 120_000,
    windowsHide: true,
  })
})

test("execFile 오류를 failed·timeout·output-limit로 정규화한다", async () => {
  const cases = [
    { error: Object.assign(new Error("raw command"), { code: 1 }), kind: "failed" },
    { error: Object.assign(new Error("timed out"), { killed: true, signal: null }), kind: "timeout" },
    { error: Object.assign(new Error("stdout maxBuffer length exceeded"), { code: "ERR_CHILD_PROCESS_STDIO_MAXBUFFER" }), kind: "output-limit" },
  ] as const

  for (const entry of cases) {
    const adapter: ExecFileAdapter = (_executable, _argv, _options, callback) => {
      callback(entry.error, "partial-out", "partial-err")
    }
    const runner = createExecFileRunner(adapter)

    await assert.rejects(
      runner(INVOCATION),
      (error: unknown) => {
        assert.ok(error instanceof RunCommandExecutionError)
        assert.equal(error.kind, entry.kind)
        assert.deepEqual(error.output, { stdout: "partial-out", stderr: "partial-err" })
        return true
      },
    )
  }
})
