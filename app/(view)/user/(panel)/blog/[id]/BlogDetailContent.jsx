// BlogDetailContent.jsx
"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { message } from "antd";
import {
  FacebookFilled,
  InstagramOutlined,
  WhatsAppOutlined,
} from "@ant-design/icons";

/* ===== util: simple media hook ===== */
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

const ROOT = "blog-detail-page";

/** Gaya ringkas + responsif */
const PAGE_BG =
  "linear-gradient(180deg, #FFFFFF 0%, #ECF3FF 22%, #FFFFFF 100%)";

const styles = {
  page: {
    width: "100%",
    minHeight: "100%",
    background: PAGE_BG,
  },
  container: {
    width: "100%",
    margin: "0 auto",
    padding: "0 clamp(20px, 5vw, 80px)",
    boxSizing: "border-box",
  },
  contentInner: {
    width: "min(1240px, 100%)",
    margin: "0 auto",
  },
  visualInner: {
    width: "min(1440px, 100%)",
    margin: "0 auto",
    padding: "0 clamp(18px, 5vw, 56px)",
    boxSizing: "border-box",
  },

  headSpace: { height: 10 },

  titleWrap: {
    textAlign: "center",
    margin: "20px 0 8px",
    marginTop: "-20px",
  },
  titleMain: {
    fontSize: "clamp(22px, 5vw, 40px)",
    fontWeight: 900,
    letterSpacing: "0.05em",
    color: "#0B3E91",
    margin: 0,
    lineHeight: 1.15,
  },
  titleSub: {
    fontSize: "clamp(14px, 3.2vw, 18px)",
    fontWeight: 600,
    letterSpacing: "0.03em",
    color: "#0B3E91",
    margin: "6px 0 0",
  },

  visualBlock: {
    background: PAGE_BG,
    padding: "clamp(12px, 3vw, 18px) 0 clamp(18px, 4vw, 28px)",
    marginTop: 10,
    marginBottom: 8,
  },
  heroImg: {
    display: "block",
    width: "100%",
    height: "auto",
    borderRadius: 18,
    boxShadow: "0 18px 40px rgba(13, 52, 116, .18)",
  },

  mainRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: 32,
    marginTop: 24,
    marginBottom: 24,
  },
  leftCol: {
    flex: "1 1 0",
    minWidth: 0,
  },

  article: {
    fontSize: "clamp(14px, 3.2vw, 16px)",
    lineHeight: 1.9,
    color: "#0e1726",
    textAlign: "justify",
  },
  articleInner: {},
  articleP: {
    margin: "0 0 16px",
    textAlign: "justify",
    textJustify: "inter-word",
    hyphens: "auto",
  },

  rightCol: {
    flex: "0 0 340px",
    maxWidth: 360,
    width: "100%",
  },
  leadCard: {
    width: "100%",
    background: "#ffffff",
    borderRadius: 14,
    padding: "16px 18px 18px",
    boxShadow: "0 24px 50px rgba(15,37,67,0.18)",
    border: "1px solid #E3EDFF",
  },
  leadFieldGroup: {
    marginBottom: 10,
  },
  leadLabel: {
    display: "block",
    fontSize: 12,
    fontWeight: 600,
    color: "#0F172A",
    marginBottom: 4,
  },
  leadButtonWrap: { marginTop: 4 },
  leadHelper: {
    marginTop: 6,
    fontSize: 11,
    color: "#94A3B8",
  },

  metaRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
    alignItems: "center",
    marginTop: 4,
  },
  metaLabel: {
    fontWeight: 800,
    letterSpacing: ".04em",
    fontSize: "clamp(12px, 2.8vw, 13px)",
    color: "#0B3E91",
  },
  sourceLink: {
    color: "#114A9C",
    wordBreak: "break-word",
    fontSize: "clamp(12px, 2.8vw, 14px)",
  },
  shareWrap: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
    flexWrap: "wrap",
  },
  shareLink: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "clamp(34px, 7.8vw, 40px)",
    height: "clamp(34px, 7.8vw, 40px)",
    borderRadius: "50%",
    background: "#f1f5ff",
    color: "#0B3E91",
    textDecoration: "none",
    transition: "transform .2s ease, opacity .2s ease",
    cursor: "pointer",
  },
  shareIcon: { fontSize: "clamp(16px, 3.6vw, 18px)", opacity: 0.9 },
};

export default function BlogDetailContent({
  loading,
  error,
  titleMain,
  titleSub,
  image,
  html,
  source,
  form,
  submitting,
  onChange,
  submitLead,
  formText, // dari view model (multilingual)
}) {
  const [shareUrl, setShareUrl] = useState("");
  const isNarrow = useIsNarrow(900);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const url = window.location.href.split("#")[0];
      setShareUrl(url);
    }
  }, []);

  const shareTitle = useMemo(() => {
    const t = [titleMain, titleSub].filter(Boolean).join(" — ");
    return t || "OSS Bali News";
  }, [titleMain, titleSub]);

  const openPopup = useCallback((url) => {
    const w = 600;
    const h = 540;
    const y = typeof window !== "undefined" ? (window.outerHeight - h) / 2 : 0;
    const x = typeof window !== "undefined" ? (window.outerWidth - w) / 2 : 0;
    window.open(
      url,
      "_blank",
      `noopener,noreferrer,width=${w},height=${h},left=${x},top=${y}`
    );
  }, []);

  const onShareFacebook = useCallback(() => {
    if (!shareUrl) return;
    const u = encodeURIComponent(shareUrl);
    const q = encodeURIComponent(shareTitle);
    const url = `https://www.facebook.com/sharer/sharer.php?u=${u}&quote=${q}`;
    openPopup(url);
  }, [shareUrl, shareTitle, openPopup]);

  const onShareWhatsApp = useCallback(() => {
    if (!shareUrl) return;
    const text = encodeURIComponent(`${shareTitle}\n${shareUrl}`);
    const url = `https://wa.me/?text=${text}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }, [shareUrl, shareTitle]);

  const onShareInstagram = useCallback(async () => {
    if (!shareUrl) return;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: shareTitle, url: shareUrl });
        return;
      } catch {
        // ignore
      }
    }
    try {
      await navigator.clipboard.writeText(`${shareTitle} — ${shareUrl}`);
      message.success("Link berita disalin. Tempel di Instagram bio/story.");
    } catch {
      message.info("Salin link: " + shareUrl);
    }
  }, [shareUrl, shareTitle]);

  if (loading) {
    return (
      <div style={{ ...styles.page, padding: "40px 0" }}>
        <div style={styles.container}>
          <div style={styles.contentInner}>Loading…</div>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div style={{ ...styles.page, padding: "40px 0" }}>
        <div style={styles.container} role="alert" aria-live="assertive">
          <div style={styles.contentInner}>
            <strong style={{ color: "#ef4444" }}>Gagal memuat:</strong> {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={ROOT} style={styles.page}>
      <div
        style={{ ...styles.headSpace, ...(isNarrow ? { height: 6 } : null) }}
      />

      {/* ===== Title ===== */}
      <section style={styles.container}>
        <div style={styles.contentInner}>
          <div
            style={{
              ...styles.titleWrap,
              ...(isNarrow ? { marginTop: 0 } : null),
            }}
          >
            {titleMain ? <h1 style={styles.titleMain}>{titleMain}</h1> : null}
            {titleSub ? <h2 style={styles.titleSub}>{titleSub}</h2> : null}
          </div>
        </div>
      </section>

      {/* ===== Visual ===== */}
      <section style={styles.visualBlock}>
        <div style={styles.visualInner}>
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image}
              alt={titleMain || ""} title={titleMain || ""}
              loading="lazy"
              style={{
                ...styles.heroImg,
                ...(isNarrow ? { borderRadius: 12 } : null),
              }}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.style.display = "none";
              }}
            />
          ) : null}
        </div>
      </section>

      {/* ===== Konten + Form ===== */}
      <section style={styles.container}>
        <div style={styles.contentInner}>
          <div
            style={{
              ...styles.mainRow,
              ...(isNarrow ? { flexDirection: "column", gap: 22 } : null),
            }}
          >
            {/* LEFT: Article */}
            <div style={styles.leftCol}>
              <article style={styles.article}>
                <div
                  className="articleInner"
                  style={styles.articleInner}
                  dangerouslySetInnerHTML={{ __html: html || "" }}
                />
              </article>
            </div>

            {/* RIGHT: Lead form */}
            <aside
              style={{
                ...styles.rightCol,
                ...(isNarrow ? { maxWidth: "100%" } : null),
              }}
            >
              <div style={styles.leadCard}>
                <form onSubmit={submitLead} noValidate>
                  {/* full name */}
                  <div style={styles.leadFieldGroup}>
                    <label style={styles.leadLabel} htmlFor="full_name">
                      {formText.fullNameLabel}
                    </label>
                    <input
                      id="full_name"
                      name="full_name"
                      className={`${ROOT}__lead-input`}
                      placeholder={formText.fullNamePlaceholder}
                      value={form.full_name}
                      onChange={onChange}
                    />
                  </div>

                  {/* domicile */}
                  <div style={styles.leadFieldGroup}>
                    <label style={styles.leadLabel} htmlFor="domicile">
                      {formText.domicileLabel}
                    </label>
                    <input
                      id="domicile"
                      name="domicile"
                      className={`${ROOT}__lead-input`}
                      placeholder={formText.domicilePlaceholder}
                      value={form.domicile}
                      onChange={onChange}
                    />
                  </div>

                  {/* whatsapp */}
                  <div style={styles.leadFieldGroup}>
                    <label style={styles.leadLabel} htmlFor="whatsapp">
                      {formText.whatsappLabel}
                    </label>
                    <input
                      id="whatsapp"
                      name="whatsapp"
                      className={`${ROOT}__lead-input`}
                      placeholder={formText.whatsappPlaceholder}
                      value={form.whatsapp}
                      onChange={onChange}
                    />
                  </div>

                  {/* email */}
                  <div style={styles.leadFieldGroup}>
                    <label style={styles.leadLabel} htmlFor="email">
                      {formText.emailLabel}
                    </label>
                    <input
                      id="email"
                      name="email"
                      className={`${ROOT}__lead-input`}
                      placeholder={formText.emailPlaceholder}
                      value={form.email}
                      onChange={onChange}
                    />
                  </div>

                  {/* education_last */}
                  <div style={styles.leadFieldGroup}>
                    <label style={styles.leadLabel} htmlFor="education_last">
                      {formText.educationLabel}
                    </label>
                    <input
                      id="education_last"
                      name="education_last"
                      className={`${ROOT}__lead-input`}
                      placeholder={formText.educationPlaceholder}
                      value={form.education_last}
                      onChange={onChange}
                    />
                  </div>

                  {/* referral_code */}
                  <div style={styles.leadFieldGroup}>
                    <label style={styles.leadLabel} htmlFor="referral_code">
                      {formText.referralLabel}
                    </label>
                    <input
                      id="referral_code"
                      name="referral_code"
                      className={`${ROOT}__lead-input`}
                      placeholder={formText.referralPlaceholder}
                      value={form.referral_code}
                      onChange={onChange}
                    />
                  </div>

                  <div style={styles.leadButtonWrap}>
                    <button
                      type="submit"
                      className={`${ROOT}__lead-button`}
                      disabled={submitting}
                    >
                      {submitting
                        ? formText.buttonSubmitting
                        : formText.buttonSubmit}
                    </button>
                  </div>

                  <p style={styles.leadHelper}>{formText.helperText}</p>
                </form>
              </div>
            </aside>
          </div>

          {/* Source (opsional) */}
          {source ? (
            <div style={{ ...styles.metaRow, marginTop: 8 }}>
              <div style={styles.metaLabel}>SUMBER:</div>
              <a
                href={
                  /^https?:\/\//i.test(source) ? source : `https://${source}`
                }
                target="_blank"
                rel="noreferrer"
                style={styles.sourceLink}
              >
                {source}
              </a>
            </div>
          ) : null}

          {/* Share */}
          <div style={{ marginTop: 16, marginBottom: 12 }}>
            <div style={styles.metaLabel}>SHARE BERITA</div>
            <div style={styles.shareWrap}>
              {/* Facebook */}
              <a
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.preventDefault();
                  onShareFacebook();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") onShareFacebook();
                }}
                title="Share to Facebook"
                aria-label="Facebook"
                style={styles.shareLink}
              >
                <FacebookFilled style={styles.shareIcon} />
              </a>

              {/* Instagram */}
              <a
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.preventDefault();
                  onShareInstagram();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") onShareInstagram();
                }}
                title="Share to Instagram"
                aria-label="Instagram"
                style={styles.shareLink}
              >
                <InstagramOutlined style={styles.shareIcon} />
              </a>

              {/* WhatsApp */}
              <a
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.preventDefault();
                  onShareWhatsApp();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") onShareWhatsApp();
                }}
                title="Share to WhatsApp"
                aria-label="WhatsApp"
                style={styles.shareLink}
              >
                <WhatsAppOutlined style={styles.shareIcon} />
              </a>
            </div>
          </div>
        </div>
      </section>

      <div style={{ height: 28 }} />

      {/* ====== Global tweaks ====== */}
      <style jsx global>{`
        .${ROOT} .articleInner img,
        .${ROOT} .articleInner video {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
        }
        .${ROOT} .articleInner iframe {
          max-width: 100%;
          width: 100% !important;
          border: 0;
          min-height: clamp(220px, 40vw, 420px);
        }
        .${ROOT} .articleInner table {
          display: block;
          width: 100%;
          overflow: auto;
          border-collapse: collapse;
        }
        .${ROOT} .articleInner th,
        .${ROOT} .articleInner td {
          border: 1px solid #e5e7eb;
          padding: 8px 10px;
          font-size: 14px;
        }
        .${ROOT} .articleInner pre,
        .${ROOT} .articleInner code {
          white-space: pre-wrap;
          word-break: break-word;
        }
        .${ROOT} .articleInner h1,
        .${ROOT} .articleInner h2,
        .${ROOT} .articleInner h3,
        .${ROOT} .articleInner h4,
        .${ROOT} .articleInner h5,
        .${ROOT} .articleInner h6 {
          line-height: 1.25;
          margin: 16px 0 8px;
          color: #0b3e91;
        }
        .${ROOT} .articleInner p {
          margin: 0 0 16px;
        }
        .${ROOT} .articleInner ul,
        .${ROOT} .articleInner ol {
          padding-left: 18px;
          margin: 0 0 16px;
        }

        .${ROOT}__lead-input {
          width: 100%;
          box-sizing: border-box;
          border-radius: 6px;
          border: 1px solid #e2e8f0;
          background: #f9fbff;
          padding: 8px 10px;
          font-size: 13px;
          outline: none;
          transition: border-color 0.18s ease, box-shadow 0.18s ease,
            background 0.18s ease;
        }
        .${ROOT}__lead-input::placeholder {
          color: #cbd5f5;
        }
        .${ROOT}__lead-input:focus {
          border-color: #0b56c9;
          box-shadow: 0 0 0 1px rgba(11, 86, 201, 0.18);
          background: #ffffff;
        }

        .${ROOT}__lead-button {
          width: 100%;
          border: none;
          border-radius: 6px;
          padding: 9px 14px;
          font-size: 14px;
          font-weight: 600;
          color: #ffffff;
          background: #0b56c9;
          box-shadow: 0 12px 30px rgba(11, 86, 201, 0.45);
          cursor: pointer;
          transition: transform 0.15s ease, box-shadow 0.15s ease,
            background 0.15s ease;
        }
        .${ROOT}__lead-button:hover:not(:disabled) {
          background: #084a94;
          transform: translateY(-1px);
          box-shadow: 0 16px 34px rgba(11, 86, 201, 0.5);
        }
        .${ROOT}__lead-button:active:not(:disabled) {
          transform: translateY(0);
          box-shadow: 0 10px 24px rgba(11, 86, 201, 0.42);
        }
        .${ROOT}__lead-button:disabled {
          opacity: 0.65;
          cursor: default;
          box-shadow: none;
        }

        @media (max-width: 768px) {
          .${ROOT} .articleInner th,
          .${ROOT} .articleInner td {
            font-size: 13px;
            padding: 6px 8px;
          }
        }
      `}</style>
    </div>
  );
}
