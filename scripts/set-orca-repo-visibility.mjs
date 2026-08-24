import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const separator = arg.indexOf("=");
    return separator === -1 ? [arg, true] : [arg.slice(0, separator), arg.slice(separator + 1)];
  }),
);
const appData = process.env.APPDATA;
if (!appData) throw new Error("APPDATA가 없어 Orca 데이터 경로를 해석할 수 없습니다.");

const explicitDataPath = args.get("--data");
const dataPath = resolve(String(explicitDataPath || join(appData, "orca", "profiles", "local-default", "orca-data.json")));
const repoId = String(args.get("--repo-id") || "");
const expectedBefore = String(args.get("--expect-before") || "");
const value = String(args.get("--value") || "");
const apply = args.has("--apply");

function isInside(parent, target) {
  const relation = relative(parent, target);
  return relation === "" || (!relation.startsWith("..") && !isAbsolute(relation));
}

function maskPath(value) {
  const profile = process.env.USERPROFILE;
  if (profile && isInside(resolve(profile), resolve(value))) {
    return `%USERPROFILE%${resolve(value).slice(resolve(profile).length)}`;
  }
  return isAbsolute(value) ? `%ABSOLUTE_PATH%/${basename(value)}` : value;
}

if (apply) {
  const liveOrcaRoot = resolve(appData, "orca");
  if (!explicitDataPath || isInside(liveOrcaRoot, dataPath)) {
    throw new Error("live Orca 데이터 apply는 금지됩니다. visibility 변경은 Orca가 제공하는 공식 경로로 수행하세요.");
  }
  if (!args.has("--confirm-offline-copy")) {
    throw new Error("격리된 offline 복사본 apply에는 --confirm-offline-copy가 필요합니다.");
  }
}

if (!repoId || !["hide", "show"].includes(expectedBefore) || !["hide", "show"].includes(value)) {
  throw new Error("--repo-id, --expect-before=hide|show, --value=hide|show가 필요합니다.");
}
if (!existsSync(dataPath)) throw new Error(`Orca 데이터 파일이 없습니다: ${dataPath}`);

const originalText = readFileSync(dataPath, "utf8");
const state = JSON.parse(originalText);
const matches = (state.repos || []).filter((repo) => repo.id === repoId);
if (matches.length !== 1) throw new Error(`repo ID가 정확히 하나가 아닙니다: ${repoId}, count=${matches.length}`);
const repo = matches[0];
if (!existsSync(repo.path)) throw new Error(`존재하지 않는 repo에는 visibility를 설정하지 않습니다: ${repo.path}`);
if (repo.externalWorktreeVisibility !== expectedBefore) {
  throw new Error(
    `기대 visibility 불일치: expected=${expectedBefore}, actual=${repo.externalWorktreeVisibility}`,
  );
}

const summary = {
  mode: apply ? "apply" : "dry-run",
  dataFile: basename(dataPath),
  repo: { id: repo.id, name: repo.displayName, path: maskPath(repo.path) },
  before: repo.externalWorktreeVisibility,
  after: value,
};
if (!apply) {
  console.log(JSON.stringify(summary, null, 2));
  process.exit(0);
}

const backupDir = String(args.get("--backup-dir") || join(dirname(dataPath), "recovery-backups"));
mkdirSync(backupDir, { recursive: true });
const backupPath = join(backupDir, `${basename(dataPath)}.${Date.now()}.before-repo-visibility`);
copyFileSync(dataPath, backupPath);
if (statSync(backupPath).size !== Buffer.byteLength(originalText)) {
  throw new Error("백업 크기 검증에 실패했습니다.");
}

repo.externalWorktreeVisibility = value;
const nextText = JSON.stringify(state);
JSON.parse(nextText);
const tempPath = `${dataPath}.visibility-${process.pid}.tmp`;
writeFileSync(tempPath, nextText, "utf8");
renameSync(tempPath, dataPath);
console.log(JSON.stringify({ ...summary, backupPath, writtenBytes: Buffer.byteLength(nextText) }, null, 2));
