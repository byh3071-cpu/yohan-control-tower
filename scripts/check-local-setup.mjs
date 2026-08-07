#!/usr/bin/env node

import { existsSync, statSync } from "node:fs"
import { dirname, isAbsolute, join } from "node:path"
import nextEnv from "@next/env"

const { loadEnvConfig } = nextEnv

loadEnvConfig(process.cwd())

let failed = false
const pass = (label) => console.log(`✓ ${label}`)
const warn = (label) => console.log(`△ ${label}`)
const fail = (label) => {
  failed = true
  console.log(`✗ ${label}`)
}
const isDirectory = (path) => {
  try {
    return statSync(path).isDirectory()
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return false
    throw error
  }
}

const vhkExecutable = join(process.cwd(), "node_modules", ".bin", process.platform === "win32" ? "vhk.cmd" : "vhk")
if (existsSync(vhkExecutable)) pass("프로젝트 고정 VHK 실행기")
else fail("프로젝트 고정 VHK 실행기 — npm install 필요")

const brainRoot = process.env.YOHAN_OS_ROOT?.trim()
if (!brainRoot) fail("YOHAN_OS_ROOT — 미설정")
else if (!isAbsolute(brainRoot)) fail("YOHAN_OS_ROOT — 절대경로 필요")
else if (!isDirectory(brainRoot) || !isDirectory(join(brainRoot, "memory"))) fail("YOHAN_OS_ROOT — brain/memory 구조 확인 필요")
else if (!existsSync(join(brainRoot, "memory", "core", "core-ruleset.yaml"))) fail("YOHAN_OS_ROOT — CORE-RULES 원본 확인 필요")
else pass("YOHAN_OS_ROOT")

const reposRoot = process.env.YOHAN_REPOS_ROOT?.trim()
if (!reposRoot) fail("YOHAN_REPOS_ROOT — 미설정")
else if (!isAbsolute(reposRoot)) fail("YOHAN_REPOS_ROOT — 절대경로 필요")
else if (!isDirectory(reposRoot)) fail("YOHAN_REPOS_ROOT — 디렉터리 확인 필요")
else pass("YOHAN_REPOS_ROOT")

const calendarRoot = process.env.YOHAN_CALENDAR_ROOT?.trim()
if (!calendarRoot) fail("YOHAN_CALENDAR_ROOT — 미설정")
else if (!isAbsolute(calendarRoot)) fail("YOHAN_CALENDAR_ROOT — 절대경로 필요")
else if (existsSync(calendarRoot) && !isDirectory(calendarRoot)) fail("YOHAN_CALENDAR_ROOT — 파일이 아닌 디렉터리 필요")
else if (!existsSync(calendarRoot) && !isDirectory(dirname(calendarRoot))) fail("YOHAN_CALENDAR_ROOT — 상위 디렉터리 확인 필요")
else if (!existsSync(calendarRoot)) warn("YOHAN_CALENDAR_ROOT — 첫 일정 저장 때 생성 예정")
else pass("YOHAN_CALENDAR_ROOT")

if (process.env.NOTION_TOKEN?.trim()) pass("NOTION_TOKEN — 설정됨(값 비표시)")
else warn("NOTION_TOKEN — 미설정, Notion 인제스트만 비활성")

if (failed) {
  console.log("\n로컬 준비 미완료 — .env.example을 참고해 .env.local을 수정하세요.")
  process.exit(1)
}

console.log("\n로컬 핵심 준비 완료 — npm run dev로 시작할 수 있습니다.")
