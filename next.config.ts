import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Cloud Agent 포트 포워딩은 localhost와 127.0.0.1을 오간다. HMR·dev 자산을 막지 않는다.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
}

export default nextConfig
