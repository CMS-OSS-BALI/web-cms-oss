"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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

const { Title, Text, Paragraph } = Typography;

const PLACEHOLDER =
  "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=1200&auto=format&fit=crop";

/* ------------ tiny helpers ------------ */
function Img({ src, alt, style }) {
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
}

/** Card container: full-height & column layout */
function CardBox({ children }) {
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
}

function LikeButton({ liked, count = 0, onClick }) {
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!liked) onClick?.();
      }}
      aria-label={liked ? "Anda sudah menyukai" : "Suka"}
      title={liked ? "Anda sudah menyukai" : "Suka"}
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
}

/** POPULAR ITEM — footer meta fixed di kiri bawah; card tinggi konstan */
function PopularItem({ it, onView, onLike, hasLiked }) {
  const liked = hasLiked?.(it.id);

  return (
    <CardBox>
      <Link
        href={`/user/blog/${it.id}?menu=blog`}
        onClick={() => onView?.(it.id)}
        style={{ display: "block" }}
      >
        {/* Gambar: fixed height */}
        <div
          style={{
            borderRadius: 12,
            overflow: "hidden",
            border: "1px solid #e8eef8",
            marginBottom: 12,
            height: 180,
          }}
        >
          <Img
            src={it.image_src}
            alt={it.name}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>

        {/* Konten */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {/* Judul: clamp 2 baris */}
          <Title
            level={4}
            ellipsis={{ rows: 2, tooltip: false }}
            style={{
              margin: 0,
              fontSize: 18,
              lineHeight: 1.3,
              minHeight: 48,
            }}
          >
            {it.name}
          </Title>

          {/* Excerpt: clamp 3 baris */}
          <Paragraph
            type="secondary"
            ellipsis={{ rows: 3, tooltip: false }}
            style={{
              margin: 0,
              fontSize: 14,
              lineHeight: 1.6,
              minHeight: 68,
            }}
          >
            {it.excerpt || ""}
          </Paragraph>
        </div>
      </Link>

      {/* Spacer agar footer selalu di bawah */}
      <div style={{ flex: 1 }} />

      {/* FOOTER: kiri = timeAgo, kanan = like */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 12,
        }}
      >
        <Space size={10}>
          {it.time_ago ? <Text type="secondary">{it.time_ago}</Text> : null}
        </Space>

        <LikeButton
          liked={liked}
          count={it.likes_count ?? 0}
          onClick={() => onLike?.(it.id)}
        />
      </div>
    </CardBox>
  );
}

function RailNumber({ n }) {
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
}

/* ======= sidebar items (2 baris + ellipsis) ======= */
function TopLikeItem({ it, i, onView, onLike, hasLiked }) {
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

        {/* 2 baris + ellipsis dari description */}
        <Paragraph
          type="secondary"
          ellipsis={{ rows: 2, tooltip: false }}
          style={{
            margin: 0,
            fontSize: 12,
            lineHeight: 1.5,
          }}
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
            />
          </span>
        </Space>
      </div>
    </div>
  );
}

function LatePostItem({ it, i, onView }) {
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

        {/* 2 baris + ellipsis dari description */}
        <Paragraph
          type="secondary"
          ellipsis={{ rows: 2, tooltip: false }}
          style={{
            margin: 0,
            fontSize: 12,
            lineHeight: 1.5,
          }}
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
}

/* ------ align TOP LIKE with first Popular card on desktop ------ */
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

export default function BlogUContent({
  popular = [],
  topLikes = [],
  latePosts = [],
  loading,
  error,
  page,
  total,
  totalPages,
  goTo,
  onView,
  onLike,
  hasLiked,
}) {
  const isLg = useIsLg();
  const TOP_RAIL_OFFSET = 54;

  return (
    <div style={{ width: "100%", background: "#fff" }}>
      {/* HERO */}
      <section
        style={{
          width: "min(1140px, 92%)",
          margin: "0 auto",
          textAlign: "center",
          padding: "28px 0 16px",
          marginBottom: "50px",
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
          WELCOME TO OUR GLOBAL INSIGHTS
        </Title>
        <Paragraph style={{ marginTop: 4, marginBottom: 0, color: "#334155" }}>
          Your Gateway to Global Education & Career News
        </Paragraph>
      </section>

      {/* POPULAR + RAILS */}
      <section style={{ width: "min(1140px, 92%)", margin: "0 auto 40px" }}>
        <Row gutter={[16, 16]}>
          {/* popular cards */}
          <Col xs={24} lg={18}>
            <Title level={3} style={{ margin: "0 0 8px", fontWeight: 900 }}>
              POPULER NEWS
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
                        />
                      </div>
                    </Col>
                  ))}
            </Row>

            {/* pagination */}
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

          {/* right rails */}
          <Col xs={24} lg={6}>
            {/* Top Like */}
            <Card
              hoverable={false}
              style={{
                borderRadius: 16,
                border: "1px solid #e6edf8",
                boxShadow: "0 12px 28px rgba(8,42,116,.06)",
                marginBottom: 16,
                marginTop: isLg ? TOP_RAIL_OFFSET : 0,
              }}
              styles={{ body: { padding: 16 } }}
            >
              <Title level={4} style={{ margin: 0, fontWeight: 800 }}>
                TOP LIKE NEWS
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
                      />
                      {i < topLikes.length - 1 && (
                        <Divider style={{ margin: "10px 0" }} />
                      )}
                    </div>
                  ))}
            </Card>

            {/* Late Post */}
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
                LATE POST
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
          <div style={{ marginTop: 12, color: "#ef4444" }}>{error}</div>
        ) : null}
      </section>
    </div>
  );
}
