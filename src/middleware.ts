import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

export default auth(async (req) => {
  const path = req.nextUrl.pathname
  const isAuth = !!req.auth?.user?.id

  if (!isAuth && path === "/onboarding") {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  if (isAuth && ["/schedule", "/workout", "/ai"].includes(path)) {
    try {
      const res = await fetch(`${req.nextUrl.origin}/api/onboarding`, {
        headers: { cookie: req.headers.get("cookie") || "" },
      })
      const data = await res.json()
      if (!data.onboardingCompleted) {
        return NextResponse.redirect(new URL("/onboarding", req.url))
      }
    } catch {
      return NextResponse.next()
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/schedule", "/workout", "/ai", "/settings", "/onboarding"],
}
