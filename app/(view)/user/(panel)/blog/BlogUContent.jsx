// BlogUContent.jsx
"use client";

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import useSWR from "swr";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Row,
  Col,
  Card,
  Typography,
  Skeleton,
  Space,
  Divider,
  Pagination,
} from "antd";
import { HeartOutlined, HeartFilled } from "@ant-design/icons";
import useBlogUViewModel from "./useBlogUViewModel";

const { Title, Text, Paragraph } = Typography;

/* -------------------- i18n -------------------- */
const DICT = {
  id: {
    heroTitle: "WAWASAN INTERNASIONAL, PELUANG TANPA BATAS",
    heroSubtitle:
      "Temukan inspirasi dan berita terkini dari universitas terkemuka dunia.",
    searchPlaceholder: "Cari Judul Blog",
    filter: "Filter",
    allCategories: "Semua Kategori",
    mainSection: "BERITA TERKINI",
    mostLiked: "PALING DISUKAI",
    mostRecent: "TERBARU",
    like: "Suka",
    alreadyLiked: "Anda sudah menyukai",
    categoryFallback: "Kategori",
    errorPrefix: "Terjadi kesalahan",
  },
  en: {
    heroTitle: "GLOBAL INSIGHTS, BOUNDLESS OPPORTUNITIES",
    heroSubtitle:
      "Discover inspiration and the latest news from top universities worldwide.",
    searchPlaceholder: "Search Blog Title",
    filter: "Filter",
    allCategories: "All Categories",
    mainSection: "LATEST NEWS",
    mostLiked: "MOST LIKED",
    mostRecent: "MOST RECENT",
    like: "Like",
    alreadyLiked: "You already liked this",
    categoryFallback: "Category",
    errorPrefix: "Something went wrong",
  },
};
const tOf = (locale) => {
  const key = (locale || "id").toLowerCase();
  const dict = DICT[key] || DICT.en;
  return (k) => dict[k] ?? DICT.en[k] ?? k;
};

/* -------------------- shared helpers -------------------- */
const PLACEHOLDER =
  "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=1200&auto=format&fit=crop";

const swrFetcher = (url) =>
  fetch(url, { headers: { "cache-control": "no-store" } }).then((r) => {
    if (!r.ok) throw new Error(`Failed to load ${url} (${r.status})`);
    return r.json();
  });

const Img = React.memo(function Img({ src, alt, style }) {
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={src || PLACEHOLDER}
      alt={alt || ""}
      style={style}
      onError={(e) => {
        e.currentTarget.onerror = null;
        e.currentTarget.src = PLACEHOLDER;
      }}
    />
  );
});

const CardBox = React.memo(function CardBox({ children }) {
  return (
    <Card
      hoverable
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        borderRadius: 16,
        border: "1px solid #e6edf8",
        boxShadow: "0 12px 28px rgba(8,42,116,.08)",
      }}
      styles={{
        body: {
          padding: 16,
          display: "flex",
          flexDirection: "column",
          flex: 1,
        },
      }}
    >
      {children}
    </Card>
  );
});

const LikeButton = React.memo(function LikeButton({
  liked,
  count = 0,
  onClick,
  labels = { like: "Suka", alreadyLiked: "Anda sudah menyukai" },
}) {
  const handleClick = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!liked) onClick?.();
    },
    [liked, onClick]
  );

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={liked}
      aria-label={liked ? labels.alreadyLiked : labels.like}
      title={liked ? labels.alreadyLiked : labels.like}
      disabled={liked}
      style={{
        background: "transparent",
        border: "none",
        cursor: liked ? "not-allowed" : "pointer",
        display: "flex",
        alignItems: "center",
        gap: 6,
        opacity: liked ? 0.75 : 1,
      }}
    >
      {liked ? (
        <HeartFilled style={{ color: "#ef4444" }} />
      ) : (
        <HeartOutlined style={{ opacity: 0.7 }} />
      )}
      <Text type="secondary" style={{ fontSize: 12 }}>
        {count}
      </Text>
    </button>
  );
});

const PopularItem = React.memo(function PopularItem({
  it,
  onView,
  onLike,
  hasLiked,
  t, // translator
}) {
  const liked = hasLiked?.(it.id);
  const href = `/user/blog/${it.id}?menu=blog`;
  const categoryLabel =
    it.category_name ||
    it.category_slug ||
    (it.category_id ? t("categoryFallback") : "");

  return (
    <CardBox>
      <div
        style={{
          position: "relative",
          margin: "-16px -16px 12px",
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          overflow: "hidden",
          aspectRatio: "16 / 10",
        }}
      >
        <Link
          href={href}
          onClick={() => onView?.(it.id)}
          style={{ display: "block", width: "100%", height: "100%" }}
        >
          <Img
            src={it.image_src}
            alt={it.name || "Blog"}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </Link>

        {categoryLabel ? (
          <span
            style={{
              position: "absolute",
              left: 12,
              top: 12,
              padding: "4px 10px",
              borderRadius: 999,
              background: "rgba(15, 46, 120, 0.88)",
              color: "#fff",
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: ".02em",
              textTransform: "uppercase",
            }}
          >
            {categoryLabel}
          </span>
        ) : null}
      </div>

      <Link
        href={href}
        onClick={() => onView?.(it.id)}
        style={{ color: "inherit" }}
      >
        <Title
          level={4}
          style={{ margin: "0 0 6px", fontWeight: 800, lineHeight: 1.3 }}
        >
          {it.name || "-"}
        </Title>
      </Link>

      <Paragraph
        type="secondary"
        style={{ marginBottom: 16, flex: 1, fontSize: 14, lineHeight: 1.7 }}
      >
        {it.excerpt || ""}
      </Paragraph>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginTop: "auto",
        }}
      >
        <Text type="secondary" style={{ fontSize: 12 }}>
          {it.time_ago || "-"}
        </Text>
        <span
          style={{
            width: 4,
            height: 4,
            borderRadius: "50%",
            background: "#cbd5f5",
          }}
        />
        <Text type="secondary" style={{ fontSize: 12 }}>
          {it.read_str || ""}
        </Text>
        <span style={{ marginLeft: "auto" }}>
          <LikeButton
            liked={liked}
            count={it.likes_count ?? 0}
            onClick={() => onLike?.(it.id)}
            labels={{ like: t("like"), alreadyLiked: t("alreadyLiked") }}
          />
        </span>
      </div>
    </CardBox>
  );
});

/* ------------------------ Search + Filter (UI) ------------------------ */
const SUI = {
  wrap: {
    width: "min(1140px, 92%)",
    margin: "0 auto 24px",
    display: "flex",
    gap: 12,
    alignItems: "center",
  },
  shell: {
    flex: 1,
    height: 48,
    display: "grid",
    gridTemplateColumns: "44px 1fr 44px",
    alignItems: "center",
    borderRadius: 999,
    background: "#e9f1ff",
    border: "3px solid #0b3e91",
    padding: "0 4px",
  },
  iconBtn: {
    width: 44,
    height: 44,
    display: "grid",
    placeItems: "center",
    background: "transparent",
    border: "none",
    cursor: "pointer",
  },
  input: {
    width: "100%",
    height: "100%",
    border: "none",
    outline: "none",
    background: "transparent",
    fontSize: 16,
    padding: "0 6px",
    color: "#0b3e91",
    fontWeight: 600,
  },
  filterBtn: {
    height: 48,
    minWidth: 120,
    padding: "0 18px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    borderRadius: 999,
    background: "#0b3e91",
    color: "#fff",
    border: "3px solid #0b3e91",
    cursor: "pointer",
    userSelect: "none",
  },
  ddWrap: { position: "relative" },
  dd: {
    position: "absolute",
    top: "calc(100% + 8px)",
    right: 0,
    width: 260,
    background: "#fff",
    border: "1px solid #e6edf8",
    borderRadius: 12,
    boxShadow: "0 16px 36px rgba(8,42,116,.14)",
    zIndex: 30,
    padding: 8,
  },
  ddItem: {
    width: "100%",
    textAlign: "left",
    background: "transparent",
    border: "none",
    padding: "10px 12px",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 700,
    color: "#0b3e91",
  },
};

function SearchAndFilter({ locale = "id", onApplied }) {
  const t = useMemo(() => tOf(locale), [locale]);
  const router = useRouter();
  const [q, setQ] = useState("");
  const [catId, setCatId] = useState("");
  const [catSlug, setCatSlug] = useState("");
  const [catName, setCatName] = useState("");
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  // init from URL
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    setQ(sp.get("q") || "");
    setCatId(sp.get("categoryId") || "");
    setCatSlug(sp.get("categorySlug") || "");
  }, []);

  // fetch categories
  const catUrl = useMemo(() => {
    const p = new URLSearchParams({
      page: "1",
      perPage: "100",
      sort: "sort:asc",
      locale,
      fallback: "id",
    });
    return `/api/blog-categories?${p.toString()}`;
  }, [locale]);

  const { data: catData } = useSWR(catUrl, swrFetcher, {
    revalidateOnFocus: false,
    keepPreviousData: true,
  });

  const categories = useMemo(() => {
    const rows = Array.isArray(catData?.data) ? catData.data : [];
    return rows.map((r) => ({
      id: String(r.id),
      slug: String(r.slug || "").toLowerCase(),
      name: r.name || r.slug || "-",
    }));
  }, [catData]);

  useEffect(() => {
    if (!catId && !catSlug) return setCatName("");
    const found =
      categories.find((c) => c.id === String(catId)) ||
      categories.find((c) => c.slug === String(catSlug).toLowerCase());
    setCatName(found?.name || "");
  }, [catId, catSlug, categories]);

  // close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (!open || !boxRef.current) return;
      if (!boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // apply (kirim id & slug supaya pasti nyangkut)
  const apply = useCallback(
    (overrides = {}) => {
      const nextQ = overrides.q ?? q;
      const nextCatId = overrides.categoryId ?? catId;
      const nextCatSlug = overrides.categorySlug ?? catSlug;

      if (onApplied) {
        onApplied({
          q: nextQ,
          categoryId: nextCatId,
          categorySlug: nextCatSlug,
        });
        return;
      }

      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        nextQ ? url.searchParams.set("q", nextQ) : url.searchParams.delete("q");
        nextCatId
          ? url.searchParams.set("categoryId", String(nextCatId))
          : url.searchParams.delete("categoryId");
        nextCatSlug
          ? url.searchParams.set("categorySlug", String(nextCatSlug))
          : url.searchParams.delete("categorySlug");
        router?.replace?.(url.pathname + "?" + url.searchParams.toString());
      }
    },
    [q, catId, catSlug, onApplied, router]
  );

  const selectCategory = useCallback(
    (cat) => {
      setCatId(cat.id);
      setCatSlug(cat.slug);
      setCatName(cat.name);
      setOpen(false);
      apply({ categoryId: cat.id, categorySlug: cat.slug });
    },
    [apply]
  );

  const clearCategory = useCallback(() => {
    setCatId("");
    setCatSlug("");
    setCatName("");
    setOpen(false);
    apply({ categoryId: "", categorySlug: "" });
  }, [apply]);

  return (
    <div style={SUI.wrap} ref={boxRef}>
      {/* Search pill */}
      <div style={SUI.shell}>
        <button
          type="button"
          aria-label={t("searchPlaceholder")}
          style={SUI.iconBtn}
          onClick={() => apply()}
        >
          <svg
            viewBox="0 0 24 24"
            width="22"
            height="22"
            fill="none"
            stroke="#0b3e91"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </button>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && apply()}
          placeholder={t("searchPlaceholder")}
          aria-label={t("searchPlaceholder")}
          style={SUI.input}
        />
        <div />
      </div>

      {/* Filter pill + dropdown */}
      <div style={SUI.ddWrap}>
        <button
          type="button"
          style={SUI.filterBtn}
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <span style={{ fontWeight: 900, letterSpacing: ".02em" }}>
            {catName || t("filter")}
          </span>
          <svg
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="none"
            stroke="#fff"
            strokeWidth="2"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>

        {open && (
          <div role="listbox" style={SUI.dd}>
            <button
              style={{ ...SUI.ddItem, color: "#0f172a" }}
              onClick={clearCategory}
            >
              {t("allCategories")}
            </button>
            <div
              style={{ height: 1, background: "#eef2ff", margin: "6px 0" }}
            />
            {categories.map((c) => {
              const active =
                c.id === String(catId) ||
                c.slug === String(catSlug || "").toLowerCase();
              return (
                <button
                  key={c.id}
                  style={{
                    ...SUI.ddItem,
                    background: active ? "#eff6ff" : "transparent",
                  }}
                  onClick={() => selectCategory(c)}
                >
                  {c.name}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ----------------------------- rails components ----------------------------- */
const RailNumber = React.memo(function RailNumber({ n }) {
  return (
    <div
      style={{
        fontWeight: 900,
        fontSize: 28,
        color: "#cbd7f0",
        width: 48,
        textAlign: "right",
        lineHeight: 1,
      }}
    >
      {n}
    </div>
  );
});

const TopLikeItem = React.memo(function TopLikeItem({
  it,
  i,
  onView,
  onLike,
  hasLiked,
  t,
}) {
  const liked = hasLiked?.(it.id);
  return (
    <div style={{ display: "flex", gap: 12, padding: "12px 0" }}>
      <RailNumber n={String(i + 1).padStart(2, "0")} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <Link
          href={`/user/blog/${it.id}?menu=blog`}
          onClick={() => onView?.(it.id)}
        >
          <Text strong style={{ display: "block", marginBottom: 4 }}>
            {it.name}
          </Text>
        </Link>
        <Paragraph
          type="secondary"
          ellipsis={{ rows: 2, tooltip: false }}
          style={{ margin: 0, fontSize: 12, lineHeight: 1.5 }}
        >
          {it.excerpt || ""}
        </Paragraph>
        <Space size={8} style={{ marginTop: 6 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {it.time_ago || "-"}
          </Text>
          <span style={{ marginLeft: "auto" }}>
            <LikeButton
              liked={liked}
              count={it.likes_count ?? 0}
              onClick={() => onLike?.(it.id)}
              labels={{ like: t("like"), alreadyLiked: t("alreadyLiked") }}
            />
          </span>
        </Space>
      </div>
    </div>
  );
});

const LatePostItem = React.memo(function LatePostItem({ it, i, onView }) {
  return (
    <div style={{ display: "flex", gap: 12, padding: "12px 0" }}>
      <RailNumber n={String(i + 1).padStart(2, "0")} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <Link
          href={`/user/blog/${it.id}?menu=blog`}
          onClick={() => onView?.(it.id)}
        >
          <Text strong style={{ display: "block", marginBottom: 4 }}>
            {it.name}
          </Text>
        </Link>
        <Paragraph
          type="secondary"
          ellipsis={{ rows: 2, tooltip: false }}
          style={{ margin: 0, fontSize: 12, lineHeight: 1.5 }}
        >
          {it.excerpt || ""}
        </Paragraph>
        <Space size={8} style={{ marginTop: 6 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {it.time_ago || "-"}
          </Text>
        </Space>
      </div>
    </div>
  );
});

/* ------------------------------ media hook ------------------------------ */
function useIsLg() {
  const [isLg, setIsLg] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(min-width: 992px)");
    const handler = () => setIsLg(mql.matches);
    handler();
    mql.addEventListener?.("change", handler);
    return () => mql.removeEventListener?.("change", handler);
  }, []);
  return isLg;
}

/* --------------------------------- page --------------------------------- */
export default function BlogUContent({ locale = "id" }) {
  const t = useMemo(() => tOf(locale), [locale]);
  const router = useRouter();
  const isLg = useIsLg();

  const [q, setQ] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categorySlug, setCategorySlug] = useState("");

  // init from URL
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    setQ(sp.get("q") || "");
    setCategoryId(sp.get("categoryId") || "");
    setCategorySlug(sp.get("categorySlug") || "");
  }, []);

  const {
    popular,
    topLikes,
    latePosts,
    loading,
    error,
    page,
    total,
    totalPages,
    goTo,
    setPage,
    onView,
    onLike,
    hasLiked,
  } = useBlogUViewModel({ locale, perPage: 6, q, categoryId, categorySlug });

  const handleApplied = useCallback(
    ({ q: nextQ, categoryId: nextCatId, categorySlug: nextCatSlug }) => {
      setQ(nextQ || "");
      setCategoryId(nextCatId || "");
      setCategorySlug(nextCatSlug || "");
      setPage(1);

      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        nextQ ? url.searchParams.set("q", nextQ) : url.searchParams.delete("q");
        nextCatId
          ? url.searchParams.set("categoryId", String(nextCatId))
          : url.searchParams.delete("categoryId");
        nextCatSlug
          ? url.searchParams.set("categorySlug", String(nextCatSlug))
          : url.searchParams.delete("categorySlug");
        router.replace(url.pathname + "?" + url.searchParams.toString());
      }
    },
    [router, setPage]
  );

  return (
    <div style={{ width: "100%", background: "#fff" }}>
      {/* HERO */}
      <section
        style={{
          width: "min(1140px, 92%)",
          margin: "0 auto",
          textAlign: "center",
          padding: "28px 0 16px",
          marginBottom: "10px",
          marginTop: "-50px",
        }}
      >
        <Title
          level={2}
          style={{
            margin: 0,
            marginBottom: 6,
            fontWeight: 900,
            fontSize: 32,
            lineHeight: 1.2,
          }}
        >
          {t("heroTitle")}
        </Title>
        <Paragraph style={{ marginTop: 4, marginBottom: 0, color: "#334155" }}>
          {t("heroSubtitle")}
        </Paragraph>
      </section>

      {/* SEARCH + FILTER */}
      <SearchAndFilter locale={locale} onApplied={handleApplied} />

      {/* LISTS */}
      <section style={{ width: "min(1140px, 92%)", margin: "0 auto 40px" }}>
        <Row gutter={[16, 16]}>
          {/* Popular */}
          <Col xs={24} lg={18}>
            <Title level={3} style={{ margin: "0 0 8px", fontWeight: 900 }}>
              {t("mainSection")}
            </Title>
            <div
              style={{
                width: 180,
                height: 3,
                background:
                  "linear-gradient(90deg, #0b3e91 0%, #5aa6ff 60%, transparent 100%)",
                borderRadius: 999,
                marginBottom: 16,
              }}
            />
            <Row gutter={[16, 16]}>
              {loading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <Col key={i} xs={24} md={12} style={{ display: "flex" }}>
                      <div style={{ width: "100%" }}>
                        <Skeleton active paragraph={{ rows: 8 }} />
                      </div>
                    </Col>
                  ))
                : popular.map((it) => (
                    <Col
                      key={it.id}
                      xs={24}
                      md={12}
                      style={{ display: "flex" }}
                    >
                      <div style={{ width: "100%" }}>
                        <PopularItem
                          it={it}
                          onView={onView}
                          onLike={onLike}
                          hasLiked={hasLiked}
                          t={t}
                        />
                      </div>
                    </Col>
                  ))}
            </Row>

            <div
              style={{
                marginTop: 18,
                display: "flex",
                justifyContent: "center",
              }}
            >
              <Pagination
                current={page}
                total={total}
                pageSize={6}
                showSizeChanger={false}
                onChange={(p) => goTo(p)}
              />
            </div>
          </Col>

          {/* Rails */}
          <Col xs={24} lg={6}>
            <Card
              hoverable={false}
              style={{
                borderRadius: 16,
                border: "1px solid #e6edf8",
                boxShadow: "0 12px 28px rgba(8,42,116,.06)",
                marginBottom: 16,
                marginTop: isLg ? 54 : 0,
              }}
              styles={{ body: { padding: 16 } }}
            >
              <Title level={4} style={{ margin: 0, fontWeight: 800 }}>
                {t("mostLiked")}
              </Title>
              <div
                style={{
                  width: 150,
                  height: 3,
                  background:
                    "linear-gradient(90deg, #0b3e91 0%, #5aa6ff 60%, transparent 100%)",
                  borderRadius: 999,
                  margin: "8px 0 6px",
                }}
              />
              {loading
                ? [0, 1, 2].map((i) => (
                    <div key={i}>
                      <Skeleton active paragraph={{ rows: 2 }} />
                      {i < 2 && <Divider style={{ margin: "10px 0" }} />}
                    </div>
                  ))
                : topLikes.map((it, i) => (
                    <div key={it.id}>
                      <TopLikeItem
                        it={it}
                        i={i}
                        onView={onView}
                        onLike={onLike}
                        hasLiked={hasLiked}
                        t={t}
                      />
                      {i < topLikes.length - 1 && (
                        <Divider style={{ margin: "10px 0" }} />
                      )}
                    </div>
                  ))}
            </Card>

            <Card
              hoverable={false}
              style={{
                borderRadius: 16,
                border: "1px solid #e6edf8",
                boxShadow: "0 12px 28px rgba(8,42,116,.06)",
              }}
              styles={{ body: { padding: 16 } }}
            >
              <Title level={4} style={{ margin: 0, fontWeight: 800 }}>
                {t("mostRecent")}
              </Title>
              <div
                style={{
                  width: 120,
                  height: 3,
                  background:
                    "linear-gradient(90deg, #0b3e91 0%, #5aa6ff 60%, transparent 100%)",
                  borderRadius: 999,
                  margin: "8px 0 6px",
                }}
              />
              {loading
                ? [0, 1, 2].map((i) => (
                    <div key={i}>
                      <Skeleton active paragraph={{ rows: 2 }} />
                      {i < 2 && <Divider style={{ margin: "10px 0" }} />}
                    </div>
                  ))
                : latePosts.map((it, i) => (
                    <div key={it.id}>
                      <LatePostItem it={it} i={i} onView={onView} />
                      {i < latePosts.length - 1 && (
                        <Divider style={{ margin: "10px 0" }} />
                      )}
                    </div>
                  ))}
            </Card>
          </Col>
        </Row>

        {error ? (
          <div style={{ marginTop: 12, color: "#ef4444" }}>
            {t("errorPrefix")}: {error}
          </div>
        ) : null}
      </section>
    </div>
  );
}
