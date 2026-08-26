import { resolveRepoRoot } from "@/lib/paths"
import { createActionRegistry, createRunCommandHandler } from "@/lib/run-command-controller"
import { createExecFileRunner } from "@/lib/run-command-runner"

export const dynamic = "force-dynamic"

const handleRunCommand = createRunCommandHandler({
  registry: createActionRegistry(),
  resolveRepoRoot,
  runner: createExecFileRunner(),
})

export async function POST(request: Request): Promise<Response> {
  return await handleRunCommand(request)
}
