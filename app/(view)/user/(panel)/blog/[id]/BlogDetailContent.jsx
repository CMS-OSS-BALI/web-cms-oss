"use client";

import React from "react";
import { FacebookFilled, InstagramOutlined, WhatsAppOutlined } from "@ant-design/icons";

/** Gaya ringkas sesuai screenshot */
const styles = {
  page: { width: "100%", background: "#fff" },
  container: { width: "min(980px, 92%)", margin: "0 auto" },

  // header spacing
  headSpace: { height: 10 },

  titleWrap: { textAlign: "center", margin: "20px 0 8px", marginTop: "-20px" },
  titleMain: {
    fontSize: "clamp(24px, 5vw, 40px)",
    fontWeight: 900,
    letterSpacing: "0.05em",
    color: "#0B3E91",
    margin: 0,
  },
  titleSub: {
    fontSize: "clamp(16px, 3.2vw, 22px)",
    fontWeight: 800,
    letterSpacing: "0.03em",
    color: "#0B3E91",
    margin: "6px 0 0",
  },

  // area gambar dengan latar gradient lembut
  visualBlock: {
    background: "linear-gradient(180deg, #EAF4FF 0%, rgba(234,244,255,0) 60%)",
    padding: "18px 0 28px",
    marginTop: 10,
    marginBottom: 8,
  },
  heroImg: {
    display: "block",
    width: "100%",
    height: "auto",
    borderRadius: 4,
    boxShadow: "0 10px 30px rgba(13, 52, 116, .12)",
  },

  // “News Description”
  sectionHeadingWrap: { textAlign: "center", margin: "22px 0 8px" },
  sectionHeading: {
    fontWeight: 900,
    letterSpacing: "0.08em",
    color: "#0B3E91",
    margin: 0,
  },
  sectionUnderline: {
    width: 160,
    height: 3,
    background: "#2A66C5",
    margin: "8px auto 0",
    borderRadius: 2,
    opacity: 0.9,
  },

  // body
  article: {
    marginTop: 18,
    fontSize: 16,
    lineHeight: 1.9,
    color: "#0e1726",
    textAlign: "justify",
  },
  articleInner: {
    // agar HTML kamu rapi
  },
  articleP: {
    margin: "0 0 16px",
    textAlign: "justify",
    textJustify: "inter-word",
    hyphens: "auto",
  },

  // source & share
  metaRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 16,
    alignItems: "center",
    marginTop: 18,
  },
  metaLabel: { fontWeight: 800, letterSpacing: ".04em" },
  sourceLink: { color: "#114A9C", wordBreak: "break-word" },
  shareWrap: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
  },
  shareLink: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 36,
    height: 36,
    borderRadius: "50%",
    background: "#f1f5ff",
    color: "#0B3E91",
    textDecoration: "none",
    transition: "transform .2s ease, opacity .2s ease",
  },
  shareIcon: { fontSize: 18, opacity: 0.9 },
};

export default function BlogDetailContent({
  loading,
  error,
  titleMain,
  titleSub,
  image,
  html,
  source,
}) {
  if (loading) {
    return (
      <div style={{ ...styles.page, padding: "40px 0" }}>
        <div style={styles.container}>Loading…</div>
      </div>
    );
  }
  if (error) {
    return (
      <div style={{ ...styles.page, padding: "40px 0" }}>
        <div style={styles.container} role="alert" aria-live="assertive">
          <strong style={{ color: "#ef4444" }}>Gagal memuat:</strong> {error}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.headSpace} />

      <section style={styles.container}>
        {/* Title */}
        <div style={styles.titleWrap}>
          {titleMain ? <h1 style={styles.titleMain}>{titleMain}</h1> : null}
          {titleSub ? <h2 style={styles.titleSub}>{titleSub}</h2> : null}
        </div>
      </section>

      {/* Visual */}
      <section style={styles.visualBlock}>
        <div style={styles.container}>
          {image ? (
            <img src={image} alt={titleMain || ""} style={styles.heroImg} />
          ) : null}
        </div>
      </section>

      {/* News Description */}
      <section style={styles.container}>
        <div style={styles.sectionHeadingWrap}>
          <h3 style={styles.sectionHeading}>NEWS DESCRIPTION</h3>
          <div style={styles.sectionUnderline} />
        </div>

        <article style={styles.article}>
          <div
            style={styles.articleInner}
            // konten HTML dari CMS
            dangerouslySetInnerHTML={{ __html: html || "" }}
          />
        </article>

        {/* Source (opsional) */}
        {source ? (
          <div style={styles.metaRow}>
            <div style={styles.metaLabel}>SUMBER:</div>
            <a
              href={/^https?:\/\//i.test(source) ? source : `https://${source}`}
              target="_blank"
              rel="noreferrer"
              style={styles.sourceLink}
            >
              {source}
            </a>
          </div>
        ) : null}

        {/* Share (dummy—ganti dengan real link kalau perlu) */}
        <div style={{ marginTop: 16 }}>
          <div style={styles.metaLabel}>SHARE BERITA</div>
          <div style={styles.shareWrap}>
            <a
              href="#"
              title="Share to Facebook"
              aria-label="Facebook"
              style={styles.shareLink}
            >
              <FacebookFilled style={styles.shareIcon} />
            </a>
            <a
              href="#"
              title="Share to Instagram"
              aria-label="Instagram"
              style={styles.shareLink}
            >
              <InstagramOutlined style={styles.shareIcon} />
            </a>
            <a
              href="#"
              title="Share to WhatsApp"
              aria-label="WhatsApp"
              style={styles.shareLink}
            >
              <WhatsAppOutlined style={styles.shareIcon} />
            </a>
          </div>
        </div>
      </section>

      <div style={{ height: 28 }} />
    </div>
  );
}
