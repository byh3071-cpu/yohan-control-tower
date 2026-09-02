import type { NextConfig } from "next"

import { configuredPreviewHostname } from "./src/lib/request-guard"

const previewHost = configuredPreviewHostname()

const nextConfig: NextConfig = {
  // Cloud Agent 포트 포워딩은 localhost와 127.0.0.1을 오간다. HMR·dev 자산을 막지 않는다.
  // YOHAN_PREVIEW_HOST가 있으면 그 hostname만 추가로 연다(터널 와일드카드 금지).
  allowedDevOrigins: ["127.0.0.1", "localhost", ...(previewHost ? [previewHost] : [])],
}

export default nextConfig
