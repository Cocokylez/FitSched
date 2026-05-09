import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { compare } from "bcryptjs";
import { db } from "./db";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(db),
  secret: process.env.AUTH_SECRET!,
  debug: true,
  cookies: {
    pkceCodeVerifier: {
      name: "__Secure-authjs.pkce.code_verifier",
      options: {
        httpOnly: true,
        sameSite: "none" as const,
        path: "/",
        secure: true,
      },
    },
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        name: { label: "Name", type: "text" },
        action: { label: "Action", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        if (credentials.action === "register") {
          const existing = await db.user.findUnique({
            where: { email: credentials.email as string },
          });
          if (existing) throw new Error("Email already registered");

          const { hash } = require("bcryptjs");
          const hashed = await hash(credentials.password as string, 12);

          const user = await db.user.create({
            data: {
              email: credentials.email as string,
              name: (credentials.name as string) || null,
              password: hashed,
            },
          });
          return user;
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email as string },
        });
        if (!user || !user.password) return null;

        const valid = await compare(
          credentials.password as string,
          user.password
        );
        if (!valid) return null;

        return user;
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  callbacks: {
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub as string;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    },
  },
});