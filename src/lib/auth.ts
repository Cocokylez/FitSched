import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { compare, hash } from "bcryptjs"
import { db } from "./db"
import { cleanText, logSecurityEvent } from "./security"

function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase().slice(0, 254) : ""
}

function normalizePassword(value: unknown) {
  return typeof value === "string" ? value : ""
}

const providers: any[] = [
  CredentialsProvider({
    name: "credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
      name: { label: "Name", type: "text" },
      action: { label: "Action", type: "text" },
    },
    async authorize(credentials) {
      const email = normalizeEmail(credentials?.email)
      const password = normalizePassword(credentials?.password)
      const action = typeof credentials?.action === "string" ? credentials.action : "login"

      if (!email || !password || password.length > 128) return null

      if (action === "register") {
        if (password.length < 8) {
          logSecurityEvent("weak_registration_password")
          return null
        }

        const existing = await db.user.findUnique({
          where: { email },
        })
        if (existing) throw new Error("Unable to create account")

        const hashed = await hash(password, 12)
        const user = await db.user.create({
          data: {
            email,
            name: cleanText(credentials.name, 80) || null,
            password: hashed,
          },
        })
        return user
      }

      const user = await db.user.findUnique({
        where: { email },
      })
      if (!user || !user.password) {
        logSecurityEvent("failed_credentials_login")
        return null
      }

      const valid = await compare(password, user.password)
      if (!valid) {
        logSecurityEvent("failed_credentials_login")
        return null
      }

      return user
    },
  }),
]

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    })
  )
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  adapter: PrismaAdapter(db),
  providers,
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  callbacks: {
    async session({ session, token }: any) {
      if (token && session.user) {
        session.user.id = token.sub
      }
      return session
    },
    async jwt({ token, user }: any) {
      if (user) {
        token.sub = user.id
      }
      return token
    },
  },
})
