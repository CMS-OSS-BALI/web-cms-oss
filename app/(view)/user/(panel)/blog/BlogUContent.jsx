// BlogUContent.jsx
"use client";

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  memo,
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

/* -------------------- shared helpers -------------------- */
const PLACEHOLDER =
  "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=1200&auto=format&fit=crop";

const swrFetcher = (url) =>
  fetch(url, { headers: { "cache-control": "no-store" } }).then((r) => {
    if (!r.ok) throw new Error(`Failed to load ${url} (${r.status})`);
    return r.json();
  });

/* ================== ANIMATION HOOKS (reveal + hero bob) ================== */
function useRevealOnScroll(deps = []) {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const prefersReduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const markVisible = (els) =>
      els.forEach((el) => el.classList.add("is-visible"));

    if (prefersReduce) {
      markVisible(Array.from(document.querySelectorAll(".reveal")));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.16, rootMargin: "0px 0px -10% 0px" }
    );

    const observeAll = () => {
      document
        .querySelectorAll(".reveal:not(.is-visible)")
        .forEach((el) => io.observe(el));
    };

    observeAll();

    // SWR / pagination menambah DOM -> observe lagi
    const mo = new MutationObserver(observeAll);
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, deps);
}

/* -------------------- image, card, like button -------------------- */
const Img = memo(function Img({ src, alt, style }) {
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

const CardBox = memo(function CardBox({ children, className, style, ...rest }) {
  return (
    <Card
      hoverable
      className={className}
      {...rest}
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        borderRadius: 16,
        border: "1px solid #e6edf8",
        boxShadow: "0 12px 28px rgba(8,42,116,.08)",
        ...style,
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

const LikeButton = memo(function LikeButton({
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
      className="like-btn"
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

const PopularItem = memo(function PopularItem({
  it,
  onView,
  onLike,
  hasLiked,
  t,
  rvd = "0ms",
}) {
  const liked = hasLiked?.(it.id);
  const href = `/user/blog/${it.id}?menu=blog`;
  const categoryLabel =
    it.category_name ||
    it.category_slug ||
    (it.category_id ? t("categoryFallback") : "");

  return (
    <CardBox
      className="reveal blog-card"
      data-anim="zoom"
      style={{ ["--rvd"]: rvd }}
    >
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
          style={{
            margin: "0 0 6px",
            fontWeight: 800,
            lineHeight: 1.3,
            fontSize: "clamp(16px, 2.6vw, 20px)",
          }}
        >
          {it.name || "-"}
        </Title>
      </Link>

      <Paragraph
        type="secondary"
        style={{
          marginBottom: 16,
          flex: 1,
          fontSize: "clamp(13px, 2.4vw, 14px)",
          lineHeight: 1.7,
        }}
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

/** brand tokens */
const BRAND = {
  blueDark: "#0b3e91",
  blueHero: "#004A9E",
  blueSoft: "#e9f1ff",
  ink: "#0f172a",
  white: "#ffffff",
};

const SUI = {
  wrap: {
    width: "min(1220px, 92%)",
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
    background: BRAND.blueSoft,
    border: `3px solid ${BRAND.blueDark}`,
    padding: "0 4px",
    minWidth: 0,
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
    color: BRAND.blueDark,
    fontWeight: 600,
    minWidth: 0,
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
    background: BRAND.white,
    color: BRAND.blueDark,
    border: `3px solid ${BRAND.blueDark}`,
    boxShadow: "0 8px 18px rgba(11,62,145,.15)",
    cursor: "pointer",
    userSelect: "none",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  ddWrap: { position: "relative", flex: "0 0 auto" },
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
    maxHeight: 360,
    overflow: "auto",
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
    color: BRAND.blueDark,
  },
};

/* ------------ media hooks ------------ */
function useIsNarrow(breakpoint = 768) {
  const [isNarrow, setIsNarrow] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia(`(max-width:${breakpoint}px)`);
    const apply = () => setIsNarrow(mql.matches);
    apply();
    mql.addEventListener?.("change", apply);
    return () => mql.removeEventListener?.("change", apply);
  }, [breakpoint]);
  return isNarrow;
}

/* ---------- Search + Filter (FULL with state/effects) ---------- */
function SearchAndFilter({ locale = "id", onApplied, t }) {
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
      categories.find((c) => c.slug === String(catSlug || "").toLowerCase());
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

  // apply query (notify parent & update URL)
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

  // responsive & no-wrap line
  const isNarrow = useIsNarrow(768);
  const isTiny = useIsNarrow(380);

  const wrapStyle = {
    ...SUI.wrap,
    flexWrap: "nowrap",
    gap: isTiny ? 6 : isNarrow ? 8 : 12,
    alignItems: "center",
    minWidth: 0,
  };

  const shellStyle = {
    ...SUI.shell,
    flex: "1 1 auto",
    minWidth: 0,
    ...(isNarrow
      ? {
          height: 44,
          border: `2px solid ${BRAND.blueDark}`,
          gridTemplateColumns: isTiny ? "36px 1fr 0px" : "40px 1fr 8px",
        }
      : null),
  };

  const filterBtnStyle = {
    ...SUI.filterBtn,
    ...(isTiny
      ? { height: 40, minWidth: 78, padding: "0 10px", gap: 6, fontSize: 14 }
      : isNarrow
      ? { height: 44, minWidth: 100, padding: "0 14px", gap: 8 }
      : null),
  };

  const ddStyle = {
    ...SUI.dd,
    ...(isTiny
      ? { width: "min(360px, 92vw)", left: 0, right: "auto" }
      : isNarrow
      ? { width: "min(420px, 96vw)", right: "auto", left: 0 }
      : null),
  };

  return (
    <div
      style={wrapStyle}
      ref={boxRef}
      className="reveal"
      data-anim="down"
      // stagger kecil saat masuk
      css-module-ignore=""
      // eslint-disable-next-line react/no-unknown-property
      style={{ ...wrapStyle, ["--rvd"]: "40ms" }}
    >
      {/* Search pill */}
      <div className="search-pill" style={shellStyle}>
        <button
          type="button"
          aria-label={t("searchPlaceholder")}
          style={SUI.iconBtn}
          onClick={() => apply()}
        >
          <svg
            viewBox="0 0 24 24"
            width={isTiny ? 18 : 22}
            height={isTiny ? 18 : 22}
            fill="none"
            stroke={BRAND.blueDark}
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
          style={{ ...SUI.input, fontSize: isTiny ? 14 : 16 }}
        />
        <div />
      </div>

      {/* Filter pill + dropdown */}
      <div style={SUI.ddWrap}>
        <button
          type="button"
          style={filterBtnStyle}
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className="filter-pill"
        >
          <span style={{ fontWeight: 900, letterSpacing: ".02em" }}>
            {catName || t("filter")}
          </span>
          <svg
            viewBox="0 0 24 24"
            width={isTiny ? 16 : 18}
            height={isTiny ? 16 : 18}
            fill="none"
            stroke={BRAND.blueDark}
            strokeWidth="2"
            style={{ marginLeft: 8 }}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>

        {open && (
          <div role="listbox" style={ddStyle} className="dropdown-zoom-in">
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
const RailNumber = memo(function RailNumber({ n }) {
  return (
    <div
      style={{
        fontWeight: 900,
        fontSize: "clamp(18px, 3.5vw, 28px)",
        color: "#cbd7f0",
        width: 48,
        textAlign: "right",
        lineHeight: 1,
        flexShrink: 0,
      }}
    >
      {n}
    </div>
  );
});

const TopLikeItem = memo(function TopLikeItem({
  it,
  i,
  onView,
  onLike,
  hasLiked,
  t,
}) {
  const liked = hasLiked?.(it.id);
  return (
    <div
      className="reveal"
      data-anim="up"
      style={{ ["--rvd"]: `${(i % 6) * 70}ms` }}
    >
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
            <span style={{ marginLeft: "auto" }} />
            <LikeButton
              liked={liked}
              count={it.likes_count ?? 0}
              onClick={() => onLike?.(it.id)}
              labels={{ like: t("like"), alreadyLiked: t("alreadyLiked") }}
            />
          </Space>
        </div>
      </div>
    </div>
  );
});

const LatePostItem = memo(function LatePostItem({ it, i, onView }) {
  return (
    <div
      className="reveal"
      data-anim="up"
      style={{ ["--rvd"]: `${(i % 6) * 70}ms` }}
    >
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
  const router = useRouter();
  const isLg = useIsLg();
  const isNarrow = useIsNarrow(768);

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
    t,
    popular,
    topLikes,
    latePosts,
    loading,
    error,
    page,
    total,
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

  /* ====== INIT REVEAL OBSERVER ====== */
  useRevealOnScroll([
    popular.length,
    topLikes.length,
    latePosts.length,
    page,
    q,
    categoryId,
    categorySlug,
  ]);

  /* ================= HERO ================= */
  const HERO = {
    section: {
      width: "100%",
      background: BRAND.blueHero,
      color: "#ffffff",
      position: "relative",
      overflow: "hidden",
      marginBottom: "clamp(28px, 5vw, 50px)",
    },
    wrap: {
      width: "min(1220px, 92%)",
      margin: "0 auto",
      paddingTop: "clamp(14px, 2.8vw, 22px)",
      paddingBottom: isNarrow ? 26 : 36,
      position: "relative",
      zIndex: 1,
    },
    grid: {
      display: "grid",
      gridTemplateColumns: isNarrow ? "1fr" : "1.15fr 0.85fr",
      alignItems: "center",
      gap: isNarrow ? 14 : 24,
      minHeight: isNarrow ? 260 : 380,
    },
    copy: {
      maxWidth: 740,
      paddingRight: isNarrow ? 0 : 12,
      zIndex: 2,
    },
    title: {
      margin: 0,
      marginBottom: 10,
      fontWeight: 900,
      lineHeight: 1.15,
      fontSize: "clamp(26px, 5.2vw, 44px)",
      color: "#fff",
    },
    subtitle: {
      marginTop: 6,
      marginBottom: 0,
      color: "rgba(255,255,255,.92)",
      fontSize: "clamp(13px, 2.2vw, 16px)",
      lineHeight: 1.9,
      letterSpacing: ".01em",
    },
    mascotCol: {
      position: "relative",
      display: "grid",
      alignItems: "center",
      justifyItems: "end",
      minHeight: isNarrow ? 160 : 300,
      paddingRight: isNarrow ? 0 : 8,
    },
    mascot: {
      width: isNarrow ? "78%" : "92%",
      maxWidth: 540,
      height: "auto",
      objectFit: "contain",
      pointerEvents: "none",
      userSelect: "none",
      transform: isNarrow ? "translateY(4px)" : "translate(2px, 6px)",
    },
  };

  return (
    <div
      data-shell="full"
      data-page="blog"
      style={{ width: "100%", background: "#fff" }}
    >
      {/* HERO */}
      <section style={HERO.section}>
        <div style={HERO.wrap}>
          <SearchAndFilter locale={locale} onApplied={handleApplied} t={t} />

          <div style={HERO.grid}>
            <div style={HERO.copy}>
              <Title
                level={2}
                className="reveal"
                data-anim="down"
                style={{ ...HERO.title, ["--rvd"]: "40ms" }}
              >
                {t("heroTitle")}
              </Title>
              <Paragraph
                className="reveal"
                data-anim="up"
                style={{ ...HERO.subtitle, ["--rvd"]: "120ms" }}
              >
                {t("heroSubtitle")}
              </Paragraph>
            </div>

            <div style={HERO.mascotCol} aria-hidden="true">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/maskot-terbang.svg"
                alt=""
                className="hero-mascot--bob reveal"
                data-anim="right"
                style={{ ...HERO.mascot, ["--rvd"]: "160ms" }}
                loading="eager"
              />
            </div>
          </div>
        </div>
      </section>

      {/* LISTS */}
      <section
        style={{
          width: "min(1220px, 92%)",
          margin: "0 auto clamp(28px, 5vw, 40px)",
        }}
      >
        <Row gutter={[16, 16]}>
          {/* Popular */}
          <Col xs={24} lg={18}>
            <Title
              level={3}
              className="reveal"
              data-anim="left"
              style={{
                margin: "0 0 8px",
                fontWeight: 900,
                fontSize: "clamp(18px, 4.4vw, 24px)",
                ["--rvd"]: "40ms",
              }}
            >
              {t("mainSection")}
            </Title>
            <div
              className="reveal"
              data-anim="right"
              style={{
                width: isNarrow ? 140 : 180,
                height: 3,
                background:
                  "linear-gradient(90deg, #0b3e91 0%, #5aa6ff 60%, transparent 100%)",
                borderRadius: 999,
                marginBottom: 16,
                ["--rvd"]: "80ms",
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
                : popular.map((it, idx) => (
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
                          rvd={`${(idx % 6) * 60}ms`}
                        />
                      </div>
                    </Col>
                  ))}
            </Row>

            <div
              className="reveal"
              data-anim="up"
              style={{
                marginTop: 18,
                display: "flex",
                justifyContent: "center",
                ["--rvd"]: "120ms",
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
              className="reveal"
              data-anim="left"
              style={{
                borderRadius: 16,
                border: "1px solid #e6edf8",
                boxShadow: "0 12px 28px rgba(8,42,116,.06)",
                marginBottom: 16,
                marginTop: isLg ? 54 : 0,
                ["--rvd"]: "80ms",
              }}
              styles={{ body: { padding: 16 } }}
            >
              <Title
                level={4}
                style={{
                  margin: 0,
                  fontWeight: 800,
                  fontSize: "clamp(16px, 3.8vw, 20px)",
                }}
              >
                {t("mostLiked")}
              </Title>
              <div
                style={{
                  width: isNarrow ? 120 : 150,
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
              className="reveal"
              data-anim="left"
              style={{
                borderRadius: 16,
                border: "1px solid #e6edf8",
                boxShadow: "0 12px 28px rgba(8,42,116,.06)",
                ["--rvd"]: "120ms",
              }}
              styles={{ body: { padding: 16 } }}
            >
              <Title
                level={4}
                style={{
                  margin: 0,
                  fontWeight: 800,
                  fontSize: "clamp(16px, 3.8vw, 20px)",
                }}
              >
                {t("mostRecent")}
              </Title>
              <div
                style={{
                  width: isNarrow ? 100 : 120,
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

      {/* ========== GLOBAL ANIMATION STYLES ========== */}
      <style jsx global>{`
        /* Reveal utilities */
        .reveal {
          opacity: 0;
          transform: var(--reveal-from, translate3d(0, 14px, 0));
          transition: opacity 700ms ease,
            transform 700ms cubic-bezier(0.21, 1, 0.21, 1);
          transition-delay: var(--rvd, 0ms);
          will-change: opacity, transform;
        }
        .reveal[data-anim="up"] {
          --reveal-from: translate3d(0, 18px, 0);
        }
        .reveal[data-anim="down"] {
          --reveal-from: translate3d(0, -18px, 0);
        }
        .reveal[data-anim="left"] {
          --reveal-from: translate3d(-18px, 0, 0);
        }
        .reveal[data-anim="right"] {
          --reveal-from: translate3d(18px, 0, 0);
        }
        .reveal[data-anim="zoom"] {
          --reveal-from: scale(0.96);
        }
        .reveal.is-visible {
          opacity: 1;
          transform: none;
        }
        @media (prefers-reduced-motion: reduce) {
          .reveal {
            transition: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
          .hero-mascot--bob {
            animation: none !important;
          }
        }

        /* Micro-motion */
        @keyframes y-bob {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-4px);
          }
        }
        .hero-mascot--bob {
          animation: y-bob 3.5s ease-in-out infinite;
          will-change: transform;
        }

        /* Cards hover delight */
        .blog-card {
          transition: transform 0.18s ease, box-shadow 0.18s ease;
          will-change: transform;
        }
        @media (hover: hover) {
          .blog-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 16px 34px rgba(8, 42, 116, 0.14);
          }
          .like-btn:not([disabled]):hover {
            transform: translateY(-1px);
          }
        }
        .like-btn:active {
          transform: scale(0.96);
        }

        /* Dropdown appear */
        .dropdown-zoom-in {
          animation: dropdownIn 180ms ease;
          transform-origin: top right;
        }
        @keyframes dropdownIn {
          from {
            opacity: 0;
            transform: scale(0.96);
          }
          to {
            opacity: 1;
            transform: none;
          }
        }

        /* Search/Filter focus ring */
        .search-pill:focus-within {
          box-shadow: 0 0 0 3px rgba(90, 166, 255, 0.35);
        }
        .filter-pill:focus-visible {
          outline: 3px solid #5aa8ff;
          outline-offset: 3px;
          border-radius: 999px;
        }
      `}</style>
    </div>
  );
}
