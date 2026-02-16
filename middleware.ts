import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // 1. CookieからsessionIdを取得
  const sessionId = request.cookies.get("sessionId")?.value

  if (!sessionId) {
    // 未ログイン → /login へリダイレクト
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // 注記: 実際のセッション検証（DB チェック）は
  // SessionGuard 経由で Client Component 内で実行される
  // ミドルウェアは Cookie 存在チェックのみを行い、
  // edge runtime での Prisma Client 使用を回避している

  // 2. Cookie が存在する → ページ表示を許可
  // (詳細な検証はページロード時に SessionGuard で実行)
  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!login|_next|favicon.ico|.*\\..*).*)"],
}
