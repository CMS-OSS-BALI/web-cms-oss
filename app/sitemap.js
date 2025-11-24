// app/sitemap.js
import { BASE_URL } from "./seo.config";
import prisma from "@/lib/prisma";

/**
 * Regenerasi sitemap tiap 24 jam (server-side)
 * Jika kamu ingin full-static, hapus ekspor revalidate ini.
 */
export const revalidate = 60 * 60 * 24;

export default async function sitemap() {
  const base = BASE_URL.replace(/\/+$/, "");
  const now = new Date();

  // ====== Static routes utama (tanpa query) ======
  const core = [
    { path: "/", priority: 1.0, change: "daily" },
    { path: "/user/layanan", priority: 0.9, change: "weekly" },
    { path: "/user/events", priority: 0.9, change: "daily" },
    { path: "/user/mitra-dalam-negeri", priority: 0.8, change: "weekly" },
    { path: "/user/college", priority: 0.8, change: "weekly" },
    { path: "/user/blog", priority: 0.8, change: "daily" },
    { path: "/user/aboutus", priority: 0.6, change: "monthly" },
    { path: "/user/career", priority: 0.6, change: "monthly" },
  ];

  // Helper alternates: ID = canonical; EN = ?lang=en
  const withAlternates = (url) => ({
    languages: {
      "id-ID": url,
      "en-US": `${url}?lang=en`,
      "x-default": url,
    },
  });

  // Map static entries → MetadataRoute.Sitemap shape
  const staticEntries = core.map(({ path, priority, change }) => {
    const url = `${base}${path}`;
    return {
      url,
      lastModified: now,
      changeFrequency: change,
      priority,
      alternates: withAlternates(url),
    };
  });

  // ====== Dynamic entries: blog detail & event detail ======
  const dynamicEntries = [];

  try {
    const posts = await prisma.blog.findMany({
      where: { deleted_at: null },
      select: { id: true, updated_at: true },
      orderBy: { updated_at: "desc" },
    });
    for (const p of posts) {
      const slug = p.id;
      const url = `${base}/user/blog/${slug}`;
      dynamicEntries.push({
        url,
        lastModified: p.updated_at ? new Date(p.updated_at) : now,
        changeFrequency: "weekly",
        priority: 0.7,
        alternates: withAlternates(url),
      });
    }
  } catch {
    // ignore but keep static entries
  }

  try {
    const events = await prisma.events.findMany({
      where: { deleted_at: null, is_published: true },
      select: { id: true, updated_at: true },
      orderBy: { updated_at: "desc" },
    });
    for (const e of events) {
      const slug = e.id;
      const url = `${base}/user/events/${slug}`;
      dynamicEntries.push({
        url,
        lastModified: e.updated_at ? new Date(e.updated_at) : now,
        changeFrequency: "daily",
        priority: 0.7,
        alternates: withAlternates(url),
      });
    }
  } catch {
    // ignore
  }

  return [...staticEntries, ...dynamicEntries];
}
