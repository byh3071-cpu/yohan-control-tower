#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { closeSync, existsSync, openSync, readSync, readdirSync, statSync } from "node:fs";
import { basename, isAbsolute, join, resolve } from "node:path";

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const separator = arg.indexOf("=");
    return separator === -1 ? [arg, true] : [arg.slice(0, separator), arg.slice(separator + 1)];
  }),
);

const appData = process.env.APPDATA;
const defaultOrcaRoot = appData ? join(appData, "orca") : null;
const orcaRootInput = args.get("--orca-root") || defaultOrcaRoot;
if (!orcaRootInput) throw new Error("APPDATA 또는 --orca-root가 필요합니다.");
const orcaRoot = resolve(String(orcaRootInput));
const windowMinutes = numberArg("--window-minutes", 10, 0);
const warningBytes = numberArg("--warn-mb", 64, 0) * 1024 * 1024;
const criticalBytes = numberArg("--critical-mb", 128, 0) * 1024 * 1024;
const traceTailBytes = numberArg("--trace-tail-mb", 8, 0) * 1024 * 1024;
const now = args.has("--now") ? new Date(String(args.get("--now"))) : new Date();
const strict = args.has("--strict");
const jsonOnly = args.has("--json");
const skipMemory = args.has("--skip-memory");

if (!existsSync(orcaRoot)) {
  throw new Error(`Orca 데이터 루트를 찾을 수 없습니다: ${orcaRoot}`);
}
if (Number.isNaN(now.getTime())) throw new Error("--now는 유효한 ISO-8601 시각이어야 합니다.");
if (warningBytes >= criticalBytes) throw new Error("--warn-mb는 --critical-mb보다 작아야 합니다.");

function numberArg(name, fallback, minimum) {
  const raw = args.get(name);
  const value = raw === undefined ? fallback : Number(raw);
  if (!Number.isFinite(value) || value <= minimum) throw new Error(`${name} 값이 유효하지 않습니다.`);
  return value;
}

function walkFiles(root, predicate) {
  if (!existsSync(root)) return [];
  const files = [];
  const pending = [root];
  while (pending.length > 0) {
    const current = pending.pop();
    let entries;
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const entryPath = join(current, entry.name);
      if (entry.isDirectory()) pending.push(entryPath);
      else if (entry.isFile() && predicate(entryPath)) files.push(entryPath);
    }
  }
  return files;
}

function maskPath(value) {
  if (!value) return value;
  const roots = [
    [process.env.USERPROFILE, "%USERPROFILE%"],
    [process.cwd(), "%PROJECT_ROOT%"],
  ];
  for (const [root, marker] of roots) {
    if (!root) continue;
    const normalizedRoot = String(root).replace(/[\\/]+$/, "");
    const lowerValue = value.toLowerCase();
    const lowerRoot = normalizedRoot.toLowerCase();
    if (lowerValue === lowerRoot || lowerValue.startsWith(`${lowerRoot}\\`) || lowerValue.startsWith(`${lowerRoot}/`)) {
      return `${marker}${value.slice(normalizedRoot.length)}`;
    }
  }
  return isAbsolute(value) ? `%ABSOLUTE_PATH%/${basename(value)}` : value;
}

function severityRank(severity) {
  return { healthy: 0, warning: 1, critical: 2, unavailable: 0 }[severity] ?? 0;
}

function maxSeverity(...values) {
  return values.reduce((highest, current) =>
    severityRank(current) > severityRank(highest) ? current : highest, "healthy");
}

function formatMb(bytes) {
  return Math.round((bytes / (1024 * 1024)) * 100) / 100;
}

function inspectRollouts() {
  const sessionsRoot = join(orcaRoot, "codex-runtime-home", "home", "sessions");
  const files = walkFiles(sessionsRoot, (filePath) => filePath.toLowerCase().endsWith(".jsonl"));
  const entries = files
    .map((filePath) => {
      const stat = statSync(filePath);
      return {
        file: basename(filePath),
        sizeBytes: stat.size,
        sizeMb: formatMb(stat.size),
        modifiedAt: stat.mtime.toISOString(),
      };
    })
    .sort((left, right) => right.sizeBytes - left.sizeBytes);
  const criticalCount = entries.filter((entry) => entry.sizeBytes >= criticalBytes).length;
  const warningCount = entries.filter(
    (entry) => entry.sizeBytes >= warningBytes && entry.sizeBytes < criticalBytes,
  ).length;
  return {
    status: criticalCount > 0 ? "critical" : warningCount > 0 ? "warning" : "healthy",
    scannedFileCount: files.length,
    warningThresholdMb: formatMb(warningBytes),
    criticalThresholdMb: formatMb(criticalBytes),
    warningCount,
    criticalCount,
    largest: entries.slice(0, 10),
    contentRead: false,
  };
}

function unixNanoToMilliseconds(value) {
  try {
    return Number(BigInt(String(value)) / 1_000_000n);
  } catch {
    return null;
  }
}

function inspectMissingCwdErrors() {
  const tracePath = join(orcaRoot, "logs", "main.trace.ndjson");
  if (!existsSync(tracePath)) {
    return {
      status: "unavailable",
      traceFile: basename(tracePath),
      windowMinutes,
      recentCount: 0,
      missingCwds: [],
      reason: "trace file not found",
    };
  }

  const cutoff = now.getTime() - windowMinutes * 60 * 1000;
  const traceStat = statSync(tracePath);
  const bytesToRead = Math.min(traceStat.size, Math.ceil(traceTailBytes));
  const startOffset = traceStat.size - bytesToRead;
  const buffer = Buffer.alloc(bytesToRead);
  const handle = openSync(tracePath, "r");
  try {
    readSync(handle, buffer, 0, bytesToRead, startOffset);
  } finally {
    closeSync(handle);
  }
  let traceText = buffer.toString("utf8");
  if (startOffset > 0) {
    const firstNewline = traceText.indexOf("\n");
    traceText = firstNewline === -1 ? "" : traceText.slice(firstNewline + 1);
  }
  const counts = new Map();
  let recentCount = 0;
  let latestAt = null;
  let oldestObservedAt = null;
  for (const line of traceText.split(/\r?\n/)) {
    if (!line.trim()) continue;
    let event;
    try {
      event = JSON.parse(line);
    } catch {
      continue;
    }
    const at = unixNanoToMilliseconds(event.startTimeUnixNano);
    if (at !== null) oldestObservedAt = oldestObservedAt === null || at < oldestObservedAt ? at : oldestObservedAt;
    if (!line.includes("spawn git ENOENT")) continue;
    if (at === null || at < cutoff || at > now.getTime() + 5 * 60 * 1000) continue;
    const cwd = typeof event.attributes?.cwd === "string" ? event.attributes.cwd : "(unknown)";
    if (cwd !== "(unknown)" && existsSync(cwd)) continue;
    recentCount += 1;
    latestAt = latestAt === null || at > latestAt ? at : latestAt;
    counts.set(cwd, (counts.get(cwd) || 0) + 1);
  }
  const missingCwds = [...counts.entries()]
    .map(([cwd, count]) => ({ cwd: maskPath(cwd), count }))
    .sort((left, right) => right.count - left.count || left.cwd.localeCompare(right.cwd))
    .slice(0, 20);
  const coverageIncomplete = startOffset > 0 && (oldestObservedAt === null || oldestObservedAt > cutoff);
  const eventStatus = recentCount >= 10 ? "critical" : recentCount > 0 ? "warning" : "healthy";
  return {
    status: coverageIncomplete ? maxSeverity(eventStatus, "warning") : eventStatus,
    traceFile: basename(tracePath),
    traceBytes: traceStat.size,
    scannedBytes: bytesToRead,
    coverageIncomplete,
    windowMinutes,
    recentCount,
    latestAt: latestAt === null ? null : new Date(latestAt).toISOString(),
    missingCwds,
  };
}

function inspectWindowsCommit() {
  if (skipMemory || process.platform !== "win32") {
    return { status: "unavailable", reason: skipMemory ? "skipped" : "Windows only" };
  }
  try {
    const command = [
      "$ErrorActionPreference='Stop'",
      "$sample=(Get-Counter '\\Memory\\% Committed Bytes In Use').CounterSamples[0]",
      "[double]$sample.CookedValue|ConvertTo-Json -Compress",
    ].join("; ");
    const raw = execFileSync(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-Command", command],
      { encoding: "utf8", windowsHide: true, timeout: 15_000 },
    );
    const percent = Math.round(Number(JSON.parse(raw.trim())) * 100) / 100;
    if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
      throw new Error(`Windows commit 비율이 유효하지 않습니다: ${percent}`);
    }
    return {
      status: percent >= 95 ? "critical" : percent >= 85 ? "warning" : "healthy",
      committedPercent: percent,
    };
  } catch (error) {
    return { status: "unavailable", reason: error instanceof Error ? error.message : String(error) };
  }
}

const rollouts = inspectRollouts();
const missingCwdErrors = inspectMissingCwdErrors();
const windowsCommit = inspectWindowsCommit();
const status = maxSeverity(rollouts.status, missingCwdErrors.status, windowsCommit.status);
const exitCodeWouldBe = status === "critical" ? 3 : status === "warning" ? 2 : 0;
const result = {
  status,
  checkedAt: now.toISOString(),
  orcaRoot: maskPath(orcaRoot),
  rollouts,
  missingCwdErrors,
  windowsCommit,
  exitCodeWouldBe,
  strict,
};

if (jsonOnly) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(`Agent session health: ${status.toUpperCase()}`);
  console.log(
    `- rollouts: ${rollouts.status} (critical ${rollouts.criticalCount}, warning ${rollouts.warningCount}, scanned ${rollouts.scannedFileCount}; content not read)`,
  );
  console.log(
    `- missing cwd ENOENT: ${missingCwdErrors.status} (${missingCwdErrors.recentCount} in ${windowMinutes}m)`,
  );
  console.log(
    `- Windows commit: ${windowsCommit.status}${windowsCommit.committedPercent === undefined ? "" : ` (${windowsCommit.committedPercent}%)`}`,
  );
  for (const entry of rollouts.largest.filter((item) => item.sizeBytes >= warningBytes)) {
    console.log(`  rollout ${entry.sizeMb}MB ${entry.file}`);
  }
  for (const entry of missingCwdErrors.missingCwds) {
    console.log(`  missing cwd x${entry.count}: ${entry.cwd}`);
  }
  if (!strict && exitCodeWouldBe !== 0) {
    console.log(`- strict mode exit code would be ${exitCodeWouldBe}; use --strict for automation.`);
  }
}

process.exit(strict ? exitCodeWouldBe : 0);
