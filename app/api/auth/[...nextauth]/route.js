// app/api/auth/[...nextauth]/route.js
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

/* =========================
   OSS public URL helpers
========================= */
const PUBLIC_PREFIX = "cms-oss";

function computePublicBase() {
  const base = (process.env.OSS_STORAGE_BASE_URL || "").replace(/\/+$/, "");
  if (!base) return "";
  try {
    const u = new URL(base);
    const host = u.host.replace(/^storage\./, "cdn.");
    return `${u.protocol}//${host}`;
  } catch {
    return base;
  }
}

function ensurePrefixedKey(key) {
  const clean = String(key || "").replace(/^\/+/, "");
  return clean.startsWith(PUBLIC_PREFIX + "/")
    ? clean
    : `${PUBLIC_PREFIX}/${clean}`;
}

/** key/path/URL -> selalu URL publik OSS */
function toPublicUrl(keyOrUrl) {
  if (!keyOrUrl) return "";
  const s = String(keyOrUrl).trim();
  if (/^https?:\/\//i.test(s)) return s; // sudah URL
  const cdn = computePublicBase();
  const path = ensurePrefixedKey(s);
  const base =
    cdn || (process.env.OSS_STORAGE_BASE_URL || "").replace(/\/+$/, "");
  if (!base) return `/${path}`;
  return `${base}/public/${path}`;
}

/* ===== PCA revalidate interval (detik) ===== */
const PCA_REVALIDATE_SEC = parseInt(
  process.env.NEXTAUTH_PCA_REVALIDATE_SEC || "300",
  10
);

/** Ambil timestamp PCA user admin dalam ms. */
async function getAdminPCA(adminId) {
  if (!adminId) return 0;
  try {
    const row = await prisma.admin_users.findUnique({
      where: { id: String(adminId) },
      select: { password_changed_at: true, updated_at: true },
    });
    if (!row) return 0;
    const src = row.password_changed_at ?? row.updated_at ?? null;
    const d = src ? new Date(src) : null;
    return d && !isNaN(d.getTime()) ? d.getTime() : 0;
  } catch {
    return 0;
  }
}

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

        // Kirim field penting ke JWT; profile_photo disalurkan apa adanya
        return {
          id: admin.id,
          email: admin.email,
          name: admin.name ?? null,
          profile_photo: admin.profile_photo ?? null, // bisa key/path/URL
          role: "admin",
          // PCA as ISO; JWT callback akan override ke ms & set TTL
          pca: admin.password_changed_at?.toISOString() ?? null,
        };
      },
    }),
  ],

  callbacks: {
    /** Sinkronkan user -> token & revalidasi PCA berkala */
    async jwt({ token, user, trigger }) {
      // Pertama kali login
      if (user) {
        token.sub = user.id;
        token.email = user.email;
        token.name = user.name ?? token.name;
        token.picture = toPublicUrl(user.profile_photo || token.picture);
        token.role = "admin";

        // Simpan PCA (ms) + jadwal cek berikutnya
        const pcaMs = await getAdminPCA(user.id);
        token.pca = pcaMs; // number (ms)
        token.forceReauth = false;
        const now = Date.now();
        token.pcaCheckedAt = now;
        token.pcaNextCheck = now + PCA_REVALIDATE_SEC * 1000;
        return token;
      }

      // Refresh ringan saat session.update() atau picture belum berupa URL
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

      // Revalidasi PCA periodik
      const now = Date.now();
      const due = (token.pcaNextCheck || 0) <= now;
      if (due && token.sub) {
        const pcaDb = await getAdminPCA(token.sub);
        const pcaTok = Number(token.pca || 0);
        if (pcaDb > pcaTok) {
          // Password diganti setelah token terbentuk -> paksa relogin
          token.forceReauth = true;
        } else {
          token.pca = pcaDb; // sinkronisasi
          token.forceReauth = false;
        }
        token.pcaCheckedAt = now;
        token.pcaNextCheck = now + PCA_REVALIDATE_SEC * 1000;
      }

      return token;
    },

    /** Token -> session (dipakai di FE) */
    async session({ session, token }) {
      session.user = {
        id: token.sub,
        email: token.email,
        name: token.name ?? session.user?.name,
        image: token.picture ?? session.user?.image,
        role: token.role,
      };
      // expose PCA & flag agar UI bisa auto-logout
      session.pca = Number(token.pca || 0);
      session.forceReauth = !!token.forceReauth;
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
