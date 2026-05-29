"use server"

import { cookies } from "next/headers"
import { db } from "@/lib/db"
import { hash } from "bcryptjs"

export async function createGuestAndSignIn() {
  const guestId = crypto.randomUUID().replace(/-/g, "").slice(0, 14)
  const email = `guest-${guestId}@fitsched.guest`
  const password = crypto.randomUUID()
  const hashed = await hash(password, 10)

  const user = await db.user.create({
    data: { email, name: "Guest", password: hashed },
  })

  const sessionToken = crypto.randomUUID()
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

  await db.session.create({
    data: { sessionToken, userId: user.id, expires },
  })

  // Auth.js v5 uses __Secure- prefix on HTTPS (production), plain name on HTTP (dev)
  const authUrl = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? ""
  const secure = authUrl.startsWith("https://")
  const cookieName = secure ? "__Secure-authjs.session-token" : "authjs.session-token"

  const cookieStore = await cookies()
  cookieStore.set(cookieName, sessionToken, {
    expires,
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
  })

}
