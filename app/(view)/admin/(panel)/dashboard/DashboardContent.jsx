"use client";

import Link from "next/link";
import { ConfigProvider, Button, Tag } from "antd";

/**
 * Desktop-only placeholder "Akan segera hadir" (admin).
 * Props: { vm } dari useDashboardViewModel
 */
export default function DashboardContent({ vm }) {
  const { T, tokens } = vm;
  const { shellW, blue, text, headerH } = tokens;

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: blue,
          colorText: text,
          fontFamily:
            '"Poppins", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
          borderRadius: 14,
        },
      }}
    >
      <section
        style={{
          width: "100vw",
          marginLeft: "calc(50% - 50vw)",
          marginRight: "calc(50% - 50vw)",
          marginTop: -headerH,
          paddingTop: headerH,
          background:
            "linear-gradient(180deg, #f8fbff 0%, #eef5ff 40%, #ffffff 100%)",
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
        }}
      >
        <div
          style={{
            width: shellW,
            margin: "0 auto",
            display: "grid",
            gap: 24,
            gridTemplateColumns: "1fr",
            padding: "24px 0 40px",
          }}
        >
          {/* INFO CARD */}
          <div
            style={{
              background: "#fff",
              border: "1px solid #e6eeff",
              boxShadow: "0 8px 30px rgba(11, 86, 201, 0.08)",
              borderRadius: 20,
              padding: "28px 28px 26px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginBottom: 10,
              }}
            >
              <Tag
                color="blue"
                style={{ padding: "6px 10px", fontWeight: 600 }}
              >
                {T.badge}
              </Tag>
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: 30,
                lineHeight: 1.15,
                color: "#0b3e91",
                fontWeight: 800,
              }}
            >
              {T.title}
            </h1>

            <p
              style={{
                margin: "10px auto 22px",
                maxWidth: 760,
                fontSize: 16,
                color: "#334155",
              }}
            >
              {T.sub}
            </p>

            <div
              style={{
                display: "flex",
                gap: 12,
                justifyContent: "center",
                flexWrap: "nowrap", // desktop only
              }}
            >
              <Link href="/user/landing-page">
                <Button size="large">{T.backHome}</Button>
              </Link>

              <a
                href="mailto:info@oss.example?subject=Notifikasi%20Dashboard&body=Tolong%20beri%20tahu%20saat%20dashboard%20sudah%20siap."
                style={{ textDecoration: "none" }}
              >
                <Button size="large" type="primary">
                  {T.notify}
                </Button>
              </a>
            </div>
          </div>

          {/* PLACEHOLDER GRID: 3 kolom fixed (non-responsive) */}
          <div
            aria-hidden
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 14,
              opacity: 0.55,
            }}
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                style={{
                  height: 140,
                  background:
                    "repeating-linear-gradient(135deg, #e8efff 0, #e8efff 8px, #f3f7ff 8px, #f3f7ff 16px)",
                  borderRadius: 16,
                  border: "1px dashed #cbd5e1",
                }}
              />
            ))}
          </div>
        </div>
      </section>
    </ConfigProvider>
  );
}
