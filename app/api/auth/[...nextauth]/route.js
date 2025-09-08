// app/api/auth/[...nextauth]/route.js
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

export const authOptions = {
  session: { strategy: "jwt", maxAge: 60 * 60 * 2 },
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,

  providers: [
    Credentials({
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(creds) {
        const email = String(creds?.email ?? "")
          .trim()
          .toLowerCase();
        const password = String(creds?.password ?? "");
        if (!email || !password) return null;

        const admin = await prisma.admin_users.findUnique({ where: { email } });
        if (!admin || admin.deleted_at || !admin.password) return null;

        const ok = await bcrypt.compare(password, admin.password);
        if (!ok) return null; // <- PASSWORD SALAH => GAGAL LOGIN

        return {
          id: admin.id,
          email: admin.email,
          role: "admin",
          pca: admin.password_changed_at?.toISOString() ?? null,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.email = user.email;
        token.role = "admin";
        token.pca = user.pca;
      }
      return token;
    },
    async session({ session, token }) {
      session.user = {
        id: token.sub,
        email: token.email,
        role: token.role,
        passwordChangedAt: token.pca ?? null,
      };
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      try {
        if (new URL(url).origin === baseUrl) return url;
      } catch {}
      return baseUrl;
    },
  },

  pages: {
    signIn: "/admin/login-page",
    error: "/admin/login-page",
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
