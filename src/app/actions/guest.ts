"use server"

import { signIn } from "@/lib/auth"
import { db } from "@/lib/db"
import { hash } from "bcryptjs"

export async function createGuestAndSignIn() {
  const guestId = crypto.randomUUID().replace(/-/g, "").slice(0, 14)
  const email = `guest-${guestId}@fitsched.guest`
  const password = crypto.randomUUID()
  const hashed = await hash(password, 10)

  await db.user.create({
    data: { email, name: "Guest", password: hashed },
  })

  await signIn("credentials", { email, password, redirectTo: "/onboarding" })
}
