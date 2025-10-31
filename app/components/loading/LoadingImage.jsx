"use client";

import Image from "next/image";

export default function LoadingSplash({
  fullscreen = false,
  label = "Memuat data…",
  size = 112,
  brand = "#003A6F",
  /** Tinggi header+breadcrumb+padding konten */
  offset = 160,
}) {
  return (
    <div
      className={`loaderWrap ${fullscreen ? "fullscreen" : "inPage"}`}
      role="status"
      aria-live="polite"
      aria-label={label}
      aria-busy="true"
      style={
        fullscreen
          ? undefined
          : {
              // pastikan area konten punya tinggi cukup agar bisa center vertical
              minHeight: `calc(100dvh - ${offset}px)`,
              width: "100%",
            }
      }
    >
      <div className="logoWrap" style={{ width: size, height: size }}>
        {/* Cincin animasi */}
        <div className="ring ring1" />
        <div className="ring ring2" />
        <div className="ring ring3" />

        {/* Logo di tengah */}
        <Image
          src="/images/loading.png"
          alt="Logo"
          width={Math.round(size * 0.7)}
          height={Math.round(size * 0.7)}
          className="logo"
          priority
        />
      </div>

      <p className="label">{label}</p>

      <style jsx>{`
        .loaderWrap {
          /* Grid = center horizontal+vertical dengan simpel */
          display: grid;
          place-items: center;
          gap: 12px;
          padding: 20px;
          color: ${brand};
          text-align: center;
        }

        /* mode di dalam halaman (bukan overlay) */
        .inPage {
          position: relative;
          isolation: isolate;
        }

        /* mode overlay layar penuh */
        .fullscreen {
          position: fixed;
          inset: 0;
          z-index: 50;
          background: radial-gradient(
              1200px 600px at 50% -10%,
              ${brand}0d,
              transparent 60%
            ),
            radial-gradient(
              800px 400px at -10% 110%,
              ${brand}0a,
              transparent 60%
            ),
            #ffffff;
        }

        .logoWrap {
          position: relative;
          display: grid;
          place-items: center;
          filter: drop-shadow(0 6px 20px ${brand}26);
        }
        .logo {
          animation: float 2.4s ease-in-out infinite;
          user-select: none;
          pointer-events: none;
        }

        .ring {
          position: absolute;
          inset: 0;
          border-radius: 999px;
          border: 2px solid ${brand}20;
        }
        .ring1 {
          border-top-color: ${brand};
          animation: spin1 1.8s linear infinite;
        }
        .ring2 {
          border-right-color: ${brand};
          animation: spin2 2.6s linear infinite reverse;
          transform: scale(0.86);
        }
        .ring3 {
          border-color: ${brand}35;
          animation: pulse 2.2s ease-in-out infinite;
          transform: scale(1.18);
          box-shadow: 0 0 24px ${brand}33 inset, 0 0 28px ${brand}33;
        }

        .label {
          font-weight: 600;
          letter-spacing: 0.2px;
          opacity: 0.9;
          animation: breathe 2.8s ease-in-out infinite;
        }

        @keyframes spin1 {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes spin2 {
          from {
            transform: scale(0.86) rotate(0deg);
          }
          to {
            transform: scale(0.86) rotate(360deg);
          }
        }
        @keyframes pulse {
          0%,
          100% {
            transform: scale(1.12);
            opacity: 0.7;
          }
          50% {
            transform: scale(1.28);
            opacity: 0.25;
          }
        }
        @keyframes float {
          0%,
          100% {
            transform: translateY(-2px);
          }
          50% {
            transform: translateY(4px);
          }
        }
        @keyframes breathe {
          0%,
          100% {
            opacity: 0.55;
          }
          50% {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
