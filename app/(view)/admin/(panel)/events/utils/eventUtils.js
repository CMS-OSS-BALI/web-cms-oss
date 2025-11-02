// app/(view)/admin/(panel)/events/utils/eventUtils.js

export const fmtDateId = (dLike) => {
  if (!dLike && dLike !== 0) return "—";
  let ts = null;
  if (typeof dLike === "number") ts = dLike < 1e12 ? dLike * 1000 : dLike;
  else ts = new Date(String(dLike)).getTime();
  if (Number.isNaN(ts)) return "—";
  return new Date(ts).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const fmtIDR = (n) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(
    Math.round(Number(n || 0))
  );

export const toTs = (v) => {
  if (v == null) return null;
  const n = Number(v);
  if (!Number.isNaN(n)) return n < 1e12 ? n * 1000 : n;
  const t = new Date(String(v)).getTime();
  return Number.isNaN(t) ? null : t;
};

export const numFormatter = (val) => {
  if (val == null || val === "") return "";
  const s = String(val).replace(/\D/g, "");
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

export const numParser = (val) => (!val ? "" : val.replace(/\./g, ""));

export const isImg = (f) =>
  ["image/jpeg", "image/png", "image/webp"].includes(f?.type || "");

export const tooBig = (f, mb = 10) => (f?.size || 0) / 1024 / 1024 > mb;

export const stripTags = (s) => (s ? String(s).replace(/<[^>]*>/g, "") : "");

export const normalizeEvent = (src = {}) => {
  const get = (...keys) => {
    for (const k of keys) {
      if (k.includes(".")) {
        const parts = k.split(".");
        let cur = src;
        let ok = true;
        for (const p of parts) {
          cur = cur?.[p];
          if (cur == null) {
            ok = false;
            break;
          }
        }
        if (ok) return cur;
      } else if (src?.[k] != null) return src[k];
    }
    return undefined;
  };

  const pricing_type = String(
    get("pricing_type", "pricingType") || "FREE"
  ).toUpperCase();

  return {
    banner_url: get("banner_url", "bannerUrl", "banner", "image_url") || "",
    title_id: get("title_id", "title") || "",
    description_id: get("description_id", "description") || "",
    start_at: get("start_at", "start_ts", "start"),
    end_at: get("end_at", "end_ts", "end"),
    location: get("location", "venue", "place") || "",
    category_id: get("category_id"),
    category_name:
      get("category_name", "category.name", "category.label") || "—",
    is_published: !!get("is_published", "published", "isPublished"),
    capacity: get("capacity", "quota", "max_capacity") ?? null,
    pricing_type,
    ticket_price:
      pricing_type === "PAID"
        ? Number(get("ticket_price", "ticketPrice", "price") ?? 0)
        : 0,
    booth_price: Number(get("booth_price", "boothPrice") ?? 0),
    booth_quota: get("booth_quota", "boothQuota") ?? null,
  };
};
