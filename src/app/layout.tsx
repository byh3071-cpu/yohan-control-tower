import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '요한 관제탑 — 벡터 인프라',
  description: '노션 SoT → Qdrant 벡터 인덱스 인제스트 관제탑 (localhost:3001)',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  )
}
