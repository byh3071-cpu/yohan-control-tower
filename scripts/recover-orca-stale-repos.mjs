import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const separator = arg.indexOf("=");
    return separator === -1 ? [arg, true] : [arg.slice(0, separator), arg.slice(separator + 1)];
  }),
);

const apply = args.has("--apply");
const appData = process.env.APPDATA;
const explicitDataPath = args.get("--data");
if (!explicitDataPath && !appData) {
  throw new Error("APPDATA가 없어 Orca 데이터 경로를 해석할 수 없습니다.");
}

const dataPath = resolve(String(explicitDataPath || join(appData, "orca", "profiles", "local-default", "orca-data.json")));
if (!existsSync(dataPath)) {
  throw new Error(`Orca 데이터 파일이 없습니다: ${dataPath}`);
}

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
  const liveOrcaRoot = appData ? resolve(appData, "orca") : null;
  if (!explicitDataPath || (liveOrcaRoot && isInside(liveOrcaRoot, dataPath))) {
    throw new Error("live Orca 데이터 apply는 금지됩니다. 실행 중 상태는 공식 Orca 명령으로 정리하세요.");
  }
  if (!args.has("--confirm-offline-copy")) {
    throw new Error("격리된 offline 복사본 apply에는 --confirm-offline-copy가 필요합니다.");
  }
}

function isRepoWorktreeId(repoId, worktreeId) {
  return worktreeId === repoId || worktreeId.startsWith(`${repoId}::`);
}

function parseWorkspaceKey(value) {
  if (typeof value !== "string" || !value.startsWith("worktree:")) return null;
  const worktreeId = value.slice("worktree:".length);
  return worktreeId ? { type: "worktree", worktreeId } : null;
}

function ownerKeyBelongsToRepo(ownerKey, repoId) {
  if (isRepoWorktreeId(repoId, ownerKey)) return true;
  const parsed = parseWorkspaceKey(ownerKey);
  return parsed?.type === "worktree" && isRepoWorktreeId(repoId, parsed.worktreeId);
}

function removeRepoWorktreeRecord(record, repoId) {
  const next = { ...(record || {}) };
  for (const key of Object.keys(next)) {
    if (ownerKeyBelongsToRepo(key, repoId)) delete next[key];
  }
  return next;
}

function removeRepoFromWorkspaceSession(session, repoId) {
  if (!session) return session;
  const next = structuredClone(session);
  const removedTerminalTabIds = new Set();

  for (const [ownerKey, tabs] of Object.entries(next.tabsByWorktree || {})) {
    if (!ownerKeyBelongsToRepo(ownerKey, repoId)) continue;
    for (const tab of tabs) removedTerminalTabIds.add(tab.id);
    delete next.tabsByWorktree[ownerKey];
  }
  for (const tabId of removedTerminalTabIds) delete next.terminalLayoutsByTabId?.[tabId];

  for (const field of [
    "openFilesByWorktree",
    "activeFileIdByWorktree",
    "activeBrowserTabIdByWorktree",
    "activeTabTypeByWorktree",
    "activeTabIdByWorktree",
    "unifiedTabs",
    "tabGroups",
    "tabGroupLayouts",
    "activeGroupIdByWorktree",
    "lastVisitedAtByWorktreeId",
    "defaultTerminalTabsAppliedByWorktreeId",
    "terminalTopologyRevisionByRepoId",
  ]) {
    next[field] = removeRepoWorktreeRecord(next[field], repoId);
  }

  const removedBrowserWorkspaceIds = new Set();
  for (const [ownerKey, workspaces] of Object.entries(next.browserTabsByWorktree || {})) {
    if (!ownerKeyBelongsToRepo(ownerKey, repoId)) continue;
    for (const workspace of workspaces) removedBrowserWorkspaceIds.add(workspace.id);
    delete next.browserTabsByWorktree[ownerKey];
  }
  for (const workspaceId of removedBrowserWorkspaceIds) delete next.browserPagesByWorkspace?.[workspaceId];

  if (next.terminalSurfaceTombstonesByPaneKey) {
    next.terminalSurfaceTombstonesByPaneKey = Object.fromEntries(
      Object.entries(next.terminalSurfaceTombstonesByPaneKey).filter(
        ([, tombstone]) => !ownerKeyBelongsToRepo(tombstone.worktreeId, repoId),
      ),
    );
  }
  if (next.sleepingAgentSessionsByPaneKey) {
    next.sleepingAgentSessionsByPaneKey = Object.fromEntries(
      Object.entries(next.sleepingAgentSessionsByPaneKey).filter(
        ([, record]) => !ownerKeyBelongsToRepo(record.worktreeId, repoId),
      ),
    );
  }
  if (next.terminalPtyIncarnationsByPaneKey) {
    next.terminalPtyIncarnationsByPaneKey = Object.fromEntries(
      Object.entries(next.terminalPtyIncarnationsByPaneKey).filter(([paneKey]) => {
        const separator = paneKey.lastIndexOf(":");
        return separator < 1 || !removedTerminalTabIds.has(paneKey.slice(0, separator));
      }),
    );
  }

  if (next.activeWorktreeId && isRepoWorktreeId(repoId, next.activeWorktreeId)) next.activeWorktreeId = null;
  const activeScope = next.activeWorkspaceKey ? parseWorkspaceKey(next.activeWorkspaceKey) : null;
  if (activeScope?.type === "worktree" && isRepoWorktreeId(repoId, activeScope.worktreeId)) {
    next.activeWorkspaceKey = null;
  }
  next.activeWorktreeIdsOnShutdown = next.activeWorktreeIdsOnShutdown?.filter(
    (worktreeId) => !isRepoWorktreeId(repoId, worktreeId),
  );
  return next;
}

function pruneKeyedObject(record, predicate) {
  if (!record) return record;
  return Object.fromEntries(Object.entries(record).filter(([key]) => !predicate(key)));
}

function cleanState(state, staleRepos) {
  const next = structuredClone(state);
  const staleIds = new Set(staleRepos.map((repo) => repo.id));
  const projectIdsBefore = new Set(
    (next.projects || [])
      .filter((project) => (project.sourceRepoIds || []).some((id) => staleIds.has(id)))
      .map((project) => project.id),
  );

  next.repos = (next.repos || []).filter((repo) => !staleIds.has(repo.id));
  next.projects = (next.projects || [])
    .map((project) => ({
      ...project,
      sourceRepoIds: (project.sourceRepoIds || []).filter((id) => !staleIds.has(id)),
    }))
    .filter((project) => project.sourceRepoIds.length > 0 || !projectIdsBefore.has(project.id));
  const retainedProjectIds = new Set(next.projects.map((project) => project.id));
  next.projectHostSetups = (next.projectHostSetups || []).filter(
    (setup) => !staleIds.has(setup.id) && !staleIds.has(setup.repoId) && retainedProjectIds.has(setup.projectId),
  );

  for (const repoId of staleIds) {
    if (next.sparsePresetsByRepo) delete next.sparsePresetsByRepo[repoId];
    if (next.retiredWorktreeNamesByRepo) delete next.retiredWorktreeNamesByRepo[repoId];
    next.worktreeMeta = pruneKeyedObject(next.worktreeMeta, (key) => key.startsWith(`${repoId}::`));
    next.worktreeLineageById = pruneKeyedObject(
      next.worktreeLineageById,
      (key) => key.startsWith(`${repoId}::`) || String(next.worktreeLineageById[key]?.parentWorktreeId || "").startsWith(`${repoId}::`),
    );
    next.workspaceLineageByChildKey = Object.fromEntries(
      Object.entries(next.workspaceLineageByChildKey || {}).filter(([childKey, lineage]) => {
        return !ownerKeyBelongsToRepo(childKey, repoId) && !ownerKeyBelongsToRepo(lineage.parentWorkspaceKey, repoId);
      }),
    );
    next.workspaceSession = removeRepoFromWorkspaceSession(next.workspaceSession, repoId);
    next.workspaceSessionsByHostId = Object.fromEntries(
      Object.entries(next.workspaceSessionsByHostId || {}).map(([hostId, session]) => [
        hostId,
        removeRepoFromWorkspaceSession(session, repoId),
      ]),
    );
    next.mobileClientTabSelectionsByDeviceId = Object.fromEntries(
      Object.entries(next.mobileClientTabSelectionsByDeviceId || {})
        .map(([deviceId, selections]) => [deviceId, removeRepoWorktreeRecord(selections, repoId)])
        .filter(([, selections]) => Object.keys(selections).length > 0),
    );
  }

  if (next.ui?.setupScriptPromptDismissedRepoIds) {
    next.ui.setupScriptPromptDismissedRepoIds = next.ui.setupScriptPromptDismissedRepoIds.filter(
      (repoId) => ![...staleIds].some((staleId) => String(repoId).includes(staleId)),
    );
  }
  return next;
}

function countRepoReferences(value, repoId) {
  let count = 0;
  function walk(node) {
    if (node === null || node === undefined) return;
    if (typeof node === "string") {
      if (node.includes(repoId)) count += 1;
      return;
    }
    if (Array.isArray(node)) {
      for (const item of node) walk(item);
      return;
    }
    if (typeof node === "object") {
      for (const [key, child] of Object.entries(node)) {
        if (key.includes(repoId)) count += 1;
        walk(child);
      }
    }
  }
  walk(value);
  return count;
}

function findRepoReferencePaths(value, repoId) {
  const paths = [];
  function walk(node, path) {
    if (node === null || node === undefined) return;
    if (typeof node === "string") {
      if (node.includes(repoId)) paths.push(path);
      return;
    }
    if (Array.isArray(node)) {
      node.forEach((item, index) => walk(item, `${path}[${index}]`));
      return;
    }
    if (typeof node === "object") {
      for (const [key, child] of Object.entries(node)) {
        if (key.includes(repoId)) paths.push(`${path}.<key>`);
        walk(child, `${path}.${key}`);
      }
    }
  }
  walk(value, "$");
  return [...new Set(paths)];
}

const originalText = readFileSync(dataPath, "utf8");
const state = JSON.parse(originalText);
const staleRepos = (state.repos || [])
  .filter((repo) => !repo.connectionId && typeof repo.path === "string" && !existsSync(repo.path))
  .sort((left, right) => left.id.localeCompare(right.id));
const targetDigest = createHash("sha256")
  .update(staleRepos.map((repo) => `${repo.id}\0${repo.path}`).join("\n"))
  .digest("hex");
const cleaned = cleanState(state, staleRepos);
const summary = {
  mode: apply ? "apply" : "dry-run",
  dataFile: basename(dataPath),
  staleCount: staleRepos.length,
  targetDigest,
  staleRepos: staleRepos.map((repo) => ({ id: repo.id, name: repo.displayName, path: maskPath(repo.path) })),
  before: {
    repos: state.repos?.length || 0,
    projects: state.projects?.length || 0,
    projectHostSetups: state.projectHostSetups?.length || 0,
  },
  after: {
    repos: cleaned.repos?.length || 0,
    projects: cleaned.projects?.length || 0,
    projectHostSetups: cleaned.projectHostSetups?.length || 0,
  },
  residualReferences: staleRepos.map((repo) => ({
    id: repo.id,
    count: countRepoReferences(cleaned, repo.id),
    paths: findRepoReferencePaths(cleaned, repo.id).slice(0, 20),
  })),
};

if (!apply) {
  console.log(JSON.stringify(summary, null, 2));
  process.exit(0);
}

const expectedCount = Number(args.get("--expect-count"));
const expectedDigest = String(args.get("--expect-digest") || "");
if (!Number.isInteger(expectedCount) || expectedCount !== staleRepos.length) {
  throw new Error(`누락 저장소 개수 불일치: expected=${expectedCount}, actual=${staleRepos.length}`);
}
if (!expectedDigest || expectedDigest !== targetDigest) {
  throw new Error(`대상 digest 불일치: expected=${expectedDigest || "(empty)"}, actual=${targetDigest}`);
}
if (staleRepos.length === 0) {
  throw new Error("정리할 누락 저장소가 없습니다.");
}
if (summary.residualReferences.some((entry) => entry.count > 0)) {
  throw new Error(`정리 후 stale repo ID 참조가 남았습니다: ${JSON.stringify(summary.residualReferences)}`);
}

const backupDir = String(args.get("--backup-dir") || join(dirname(dataPath), "recovery-backups"));
mkdirSync(backupDir, { recursive: true });
const backupPath = join(backupDir, `${basename(dataPath)}.${Date.now()}.before-stale-repo-cleanup`);
copyFileSync(dataPath, backupPath);
if (statSync(backupPath).size !== Buffer.byteLength(originalText)) {
  throw new Error("백업 크기 검증에 실패했습니다.");
}

const nextText = JSON.stringify(cleaned);
JSON.parse(nextText);
const tempPath = `${dataPath}.recovery-${process.pid}.tmp`;
writeFileSync(tempPath, nextText, "utf8");
renameSync(tempPath, dataPath);
console.log(JSON.stringify({ ...summary, backupPath, writtenBytes: Buffer.byteLength(nextText) }, null, 2));
