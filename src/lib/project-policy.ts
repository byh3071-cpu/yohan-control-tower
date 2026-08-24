import { readFile, readdir } from "node:fs/promises"
import { basename, extname, join, relative } from "node:path"

import ts from "typescript"

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"])
const KEBAB_CASE_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const TEST_FILE_RE = /\.test\.(?:[cm]?[jt]sx?)$/i
const ROLE_SUFFIX_RE = /\.test$/i
const PRIVATE_OR_SYSTEM_PATH_RE = /^(?:[a-z]:[\\/]|\/(?:Users|home|var|etc|opt|srv|tmp)(?:\/|$))/i

export type ProjectPolicyViolationKind = "absolute-path" | "explicit-any" | "filename"

export type ProjectPolicyViolation = {
  kind: ProjectPolicyViolationKind
  file: string
  line?: number
  column?: number
  message: string
}

function normalizedFilePath(filePath: string): string {
  return filePath.replace(/\\/g, "/")
}

function sourceKind(filePath: string): ts.ScriptKind {
  const extension = extname(filePath).toLowerCase()
  if (extension === ".tsx") return ts.ScriptKind.TSX
  if (extension === ".jsx") return ts.ScriptKind.JSX
  if (extension === ".js" || extension === ".mjs" || extension === ".cjs") return ts.ScriptKind.JS
  return ts.ScriptKind.TS
}

function positionOf(sourceFile: ts.SourceFile, node: ts.Node): Pick<ProjectPolicyViolation, "column" | "line"> {
  const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile))
  return { line: position.line + 1, column: position.character + 1 }
}

function isPrivateOrSystemAbsolutePath(value: string): boolean {
  if (PRIVATE_OR_SYSTEM_PATH_RE.test(value)) return true
  return value.startsWith("\\\\") && value.length > 2 && value[2] !== "\\"
}

function isRawDriveOrPosixAbsolutePath(value: string): boolean {
  return PRIVATE_OR_SYSTEM_PATH_RE.test(value)
}

function rawLiteralValue(sourceFile: ts.SourceFile, node: ts.StringLiteral | ts.NoSubstitutionTemplateLiteral): string {
  const raw = node.getText(sourceFile)
  return raw.length >= 2 ? raw.slice(1, -1) : raw
}

export function inspectFileName(filePath: string): ProjectPolicyViolation[] {
  const extension = extname(filePath)
  const baseName = basename(filePath, extension).replace(ROLE_SUFFIX_RE, "")
  if (KEBAB_CASE_RE.test(baseName)) return []
  return [{
    kind: "filename",
    file: normalizedFilePath(filePath),
    message: `파일 기본 이름이 kebab-case가 아닙니다: ${baseName}`,
  }]
}

export function inspectTypeScriptSource(filePath: string, source: string): ProjectPolicyViolation[] {
  const normalizedPath = normalizedFilePath(filePath)
  const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, sourceKind(filePath))
  const testFixture = TEST_FILE_RE.test(normalizedPath)
  const violations: ProjectPolicyViolation[] = []

  function visit(node: ts.Node) {
    if (node.kind === ts.SyntaxKind.AnyKeyword) {
      violations.push({
        kind: "explicit-any",
        file: normalizedPath,
        ...positionOf(sourceFile, node),
        message: "명시적 TypeScript any 타입을 사용할 수 없습니다.",
      })
    }
    if (
      !testFixture
      && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
      && (isPrivateOrSystemAbsolutePath(node.text) || isRawDriveOrPosixAbsolutePath(rawLiteralValue(sourceFile, node)))
    ) {
      violations.push({
        kind: "absolute-path",
        file: normalizedPath,
        ...positionOf(sourceFile, node),
        message: "운영 소스에 개인·시스템 절대경로를 하드코딩할 수 없습니다.",
      })
    }
    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return violations
}

async function collectFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const files: string[] = []
  for (const entry of entries) {
    const entryPath = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...await collectFiles(entryPath))
    else if (entry.isFile()) files.push(entryPath)
  }
  return files
}

export async function inspectProjectPolicy(projectRoot = process.cwd()): Promise<ProjectPolicyViolation[]> {
  const sourceRoot = join(projectRoot, "src")
  const files = await collectFiles(sourceRoot)
  const violations: ProjectPolicyViolation[] = []
  for (const filePath of files) {
    const projectPath = normalizedFilePath(relative(projectRoot, filePath))
    violations.push(...inspectFileName(projectPath))
    if (!SOURCE_EXTENSIONS.has(extname(filePath).toLowerCase())) continue
    violations.push(...inspectTypeScriptSource(projectPath, await readFile(filePath, "utf8")))
  }
  return violations.sort((left, right) => {
    const byFile = left.file.localeCompare(right.file)
    if (byFile !== 0) return byFile
    const byLine = (left.line ?? 0) - (right.line ?? 0)
    if (byLine !== 0) return byLine
    return left.kind.localeCompare(right.kind)
  })
}
