import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

/* Jadikan path Supabase -> public URL */
const BUCKET = process.env.SUPABASE_BUCKET || "";
const SUPA_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const toPublicUrl = (path) => {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  if (!SUPA_URL || !BUCKET) return path;
  return `${SUPA_URL}/storage/v1/object/public/${BUCKET}/${path}`;
};

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
        if (!ok) return null;

        // Kirim field penting ke jwt
        return {
          id: admin.id,
          email: admin.email,
          name: admin.name ?? null,
          profile_photo: admin.profile_photo ?? null, // path di DB
          role: "admin",
          pca: admin.password_changed_at?.toISOString() ?? null,
        };
      },
    }),
  ],

  callbacks: {
    // Sinkronkan data user → token
    async jwt({ token, user, trigger }) {
      // Saat login pertama kali
      if (user) {
        token.sub = user.id; // id stabil
        token.email = user.email;
        token.name = user.name ?? token.name;
        token.picture = toPublicUrl(user.profile_photo || token.picture); // ← pastikan URL publik
        token.role = "admin";
        token.pca = user.pca;
      }

      // Saat session.update() dipanggil dari FE, atau jika token.picture belum URL
      const needRefresh =
        trigger === "update" ||
        !token.picture ||
        !/^https?:\/\//i.test(String(token.picture));

      if (needRefresh && token?.sub) {
        const u = await prisma.admin_users.findUnique({
          where: { id: String(token.sub) },
          select: { email: true, name: true, profile_photo: true },
        });
        if (u) {
          token.email = u.email;
          token.name = u.name ?? token.name;
          token.picture = toPublicUrl(u.profile_photo) || token.picture;
        }
      }

      return token;
    },

    // Token → session (dipakai di FE)
    async session({ session, token }) {
      session.user = {
        id: token.sub,
        email: token.email,
        name: token.name ?? session.user?.name,
        image: token.picture ?? session.user?.image, // ← public URL siap pakai
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
