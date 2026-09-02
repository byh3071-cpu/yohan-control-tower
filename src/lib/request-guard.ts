export type HostEnv = Record<string, string | undefined>

export const PREVIEW_HOST_ENV = "YOHAN_PREVIEW_HOST"

export const LOOPBACK_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]"])

/**
 * Cloud Agent 미리보기용 단일 호스트. 와일드카드·URL·포트는 무시한다.
 * 기본값은 비어 있고, 이때 신뢰 경계는 loopback만이다.
 */
export function configuredPreviewHostname(env: HostEnv = process.env): string | null {
  const raw = env[PREVIEW_HOST_ENV]?.trim().toLowerCase() ?? ""
  if (!raw) return null
  if (raw.includes("/") || raw.includes("*") || raw.includes(",") || raw.includes(":") || raw.includes(" ")) {
    return null
  }
  if (LOOPBACK_HOSTNAMES.has(raw)) return null
  return raw
}

export function isTrustedHostname(hostname: string, env: HostEnv = process.env): boolean {
  const normalized = hostname.trim().toLowerCase()
  if (LOOPBACK_HOSTNAMES.has(normalized)) return true
  const preview = configuredPreviewHostname(env)
  return preview !== null && normalized === preview
}

/** Next가 `-H 0.0.0.0`으로 떠도 request.url 호스트는 바인드 주소가 된다. Host 헤더와 혼동하지 않는다. */
export function isServerRequestHostname(hostname: string, env: HostEnv = process.env): boolean {
  return hostname.trim().toLowerCase() === "0.0.0.0" || isTrustedHostname(hostname, env)
}

export function parseRequestHosts(request: Request): { requestUrl: URL; expectedUrl: URL } | null {
  try {
    const requestUrl = new URL(request.url)
    const host = request.headers.get("host")
    const expectedUrl = host ? new URL(`${requestUrl.protocol}//${host}`) : requestUrl
    return { requestUrl, expectedUrl }
  } catch {
    return null
  }
}

/**
 * loopback은 프로토콜까지 같은 origin만 인정한다.
 * 미리보기 호스트는 TLS 종료(https 터널 → http origin) 때문에 hostname만 대조한다.
 */
export function originMatchesExpected(originHeader: string, expectedUrl: URL, env: HostEnv = process.env): boolean {
  try {
    const originUrl = new URL(originHeader)
    if (LOOPBACK_HOSTNAMES.has(expectedUrl.hostname)) {
      return originUrl.origin === expectedUrl.origin
    }
    const preview = configuredPreviewHostname(env)
    if (!preview) return false
    return originUrl.hostname.toLowerCase() === expectedUrl.hostname.toLowerCase()
      && expectedUrl.hostname.toLowerCase() === preview
  } catch {
    return false
  }
}
