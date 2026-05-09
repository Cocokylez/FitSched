import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { compare, hash } from "bcryptjs"
import { db } from "./db"

export const authOptions = {
  adapter: PrismaAdapter(db),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        name: { label: "Name", type: "text" },
        action: { label: "Action", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        if (credentials.action === "register") {
          const existing = await db.user.findUnique({
            where: { email: credentials.email as string },
          })
          if (existing) throw new Error("Email already registered")

          const hashed = await hash(credentials.password as string, 12)
          const user = await db.user.create({
            data: {
              email: credentials.email as string,
              name: (credentials.name as string) || null,
              password: hashed,
            },
          })
          return user
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email as string },
        })
        if (!user || !user.password) return null

        const valid = await compare(
          credentials.password as string,
          user.password
        )
        if (!valid) return null

        return user
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt" as const,
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
  secret: process.env.NEXTAUTH_SECRET,
}

export default NextAuth(authOptions)