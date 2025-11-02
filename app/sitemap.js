// app/sitemap.js
import { BASE_URL } from "./seo.config";

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

  // ====== (Opsional) Dynamic entries: blog detail, event detail, dsb. ======
  // Supaya aman di berbagai mode deploy, kita pakai try/catch & fallback kosong.
  // Sesuaikan endpoint dan properti slug/updatedAt sesuai API kamu.
  const dynamicEntries = [];

  // Contoh: blog posts
  try {
    // Ganti ke endpoint kamu yang stabil (hindari query yang berat)
    // Jika tidak ingin fetch saat build, hapus blok ini.
    // NOTE: gunakan endpoint tanpa autentikasi & output minimal untuk sitemap.
    const res = await fetch(`${base}/api/blog/public-list`, {
      // Pastikan tidak cache terlalu agresif oleh CDN:
      // next: { revalidate } tidak dipakai di file JS murni, jadi rely ke export revalidate di atas
      headers: { "x-sitemap": "1" },
    });
    if (res.ok) {
      const posts = await res.json(); // ekspektasi: [{slug, updatedAt}] atau serupa
      for (const p of Array.isArray(posts) ? posts : []) {
        const slug = p.slug || p.path || p.id;
        if (!slug) continue;
        const url = `${base}/user/blog/${slug}`;
        dynamicEntries.push({
          url,
          lastModified: p.updatedAt ? new Date(p.updatedAt) : now,
          changeFrequency: "weekly",
          priority: 0.7,
          alternates: withAlternates(url),
        });
      }
    }
  } catch {
    // diam saja; fallback ke staticEntries
  }

  // Contoh: event detail
  try {
    const res = await fetch(`${base}/api/events/public-list`, {
      headers: { "x-sitemap": "1" },
    });
    if (res.ok) {
      const events = await res.json(); // ekspektasi: [{slug, updatedAt}] atau serupa
      for (const e of Array.isArray(events) ? events : []) {
        const slug = e.slug || e.path || e.id;
        if (!slug) continue;
        const url = `${base}/user/events/${slug}`;
        dynamicEntries.push({
          url,
          lastModified: e.updatedAt ? new Date(e.updatedAt) : now,
          changeFrequency: "daily",
          priority: 0.7,
          alternates: withAlternates(url),
        });
      }
    }
  } catch {
    // ignore
  }

  return [...staticEntries, ...dynamicEntries];
}
