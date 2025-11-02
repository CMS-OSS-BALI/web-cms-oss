// app/robots.js
import { BASE_URL } from "./seo.config";

export default function robots() {
  const base = BASE_URL.replace(/\/+$/, "");

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/api", // API tidak perlu diindeks
          "/_next", // asset internal
          "/static", // jika ada
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
