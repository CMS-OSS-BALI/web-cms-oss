"use client";
import React from "react";
import Link from "next/link";
import "./footer-user.css";
import useFooterUViewModel from "./useFooterUViewModel";

/* ========== Icon Pack (SVG inline, ringan & bisa diwarnai via CSS) ========== */
function Icon({ name }) {
  switch (name) {
    case "location":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 2a7.5 7.5 0 0 0-7.5 7.5C4.5 15 12 22 12 22s7.5-7 7.5-12.5A7.5 7.5 0 0 0 12 2zm0 10a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" />
        </svg>
      );
    case "phone":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6.6 10.8a15 15 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25c1.1.4 2.3.6 3.6.6a1 1 0 0 1 1 1V20a2 2 0 0 1-2 2C10.1 22 2 13.9 2 4a2 2 0 0 1 2-2h2.5a1 1 0 0 1 1 1c0 1.2.2 2.4.6 3.6a1 1 0 0 1-.25 1L6.6 10.8z" />
        </svg>
      );
    case "email":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 3.8-8 5-8-5V6l8 5 8-5v1.8z" />
        </svg>
      );
    case "instagram":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm5 4.5A5.5 5.5 0 1 0 17.5 12 5.5 5.5 0 0 0 12 6.5zm6.5-.75a1.25 1.25 0 1 0 1.25 1.25A1.25 1.25 0 0 0 18.5 5.75z" />
        </svg>
      );
    case "facebook":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M13 22v-8h3l.5-4H13V7.3c0-1.1.3-1.8 1.9-1.8H17V2.1C16.6 2 15.4 2 14 2c-3 0-5 1.8-5 5v3H6v4h3v8h4z" />
        </svg>
      );
    // di FooterUser.jsx, dalam function Icon({ name }) { switch (name) { ... } }
    case "whatsapp":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20.52 3.48A11.85 11.85 0 0 0 12.06 0C5.44 0 .08 5.36.08 11.97A11.9 11.9 0 0 0 2.2 18.5L0 24l5.67-2.15a11.94 11.94 0 0 0 6.39 1.84h.01c6.61 0 11.97-5.36 11.97-11.97a11.86 11.86 0 0 0-3.52-8.24zM12.07 21.5h-.01a9.5 9.5 0 0 1-4.84-1.33l-.35-.2-3.37 1.27.9-3.24-.21-.33a9.46 9.46 0 0 1-1.48-5.07A9.56 9.56 0 0 1 12.06 2.5a9.42 9.42 0 0 1 9.47 9.47 9.56 9.56 0 0 1-9.46 9.53zm5.42-7.24c-.3-.15-1.77-.87-2.04-.97s-.47-.15-.67.15-.77.97-.95 1.17-.35.22-.65.07a7.79 7.79 0 0 1-2.29-1.41 8.62 8.62 0 0 1-1.59-1.96c-.17-.3 0-.46.13-.61.14-.14.3-.35.44-.52s.2-.3.3-.49a.55.55 0 0 0-.03-.52c-.08-.15-.67-1.62-.92-2.22s-.49-.5-.67-.5h-.57a1.1 1.1 0 0 0-.79.37c-.27.3-1.04 1.02-1.04 2.48s1.06 2.88 1.21 3.08a15.6 15.6 0 0 0 3.64 3.64c.5.29.88.46 1.18.58.5.2.95.17 1.31.1.4-.06 1.24-.51 1.42-1s.18-.91.12-1.01-.27-.15-.57-.3z" />
        </svg>
      );

    case "tiktok":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M15.5 2h2a6 6 0 0 0 3.5 3.5v2A8 8 0 0 1 16 6.4v7.2a6.1 6.1 0 1 1-2-4.4v2.7a3.1 3.1 0 1 0 1 2.3V2z" />
        </svg>
      );
    case "linkedin":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4.98 3.5A2.5 2.5 0 1 0 5 8.5a2.5 2.5 0 0 0-.02-5zM3 9h4v12H3zm6 0h3.8v1.7h.1A4.2 4.2 0 0 1 21 14.6V21h-4v-5.1c0-1.2 0-2.7-1.7-2.7s-2 1.3-2 2.6V21H9z" />
        </svg>
      );
    case "youtube":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M23.5 6.2A3 3 0 0 0 21.4 4C19.3 3.5 12 3.5 12 3.5S4.7 3.5 2.6 4A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8A3 3 0 0 0 2.6 20c2.1.6 9.4.6 9.4.6s7.3 0 9.4-.6a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.8 15.5v-7L15.5 12 9.8 15.5z" />
        </svg>
      );
    default:
      return null;
  }
}

/* Link pintar: internal pakai <Link/>, eksternal pakai <a/> */
function SmartLink({ href, children, className, ariaLabel }) {
  const isInternal = href && href.startsWith("/");
  if (isInternal) {
    return (
      <Link href={href} className={className} aria-label={ariaLabel}>
        {children}
      </Link>
    );
  }
  return (
    <a
      href={href || "#"}
      className={className}
      aria-label={ariaLabel}
      target={href?.startsWith("#") ? undefined : "_blank"}
      rel={href?.startsWith("#") ? undefined : "noopener noreferrer"}
    >
      {children}
    </a>
  );
}

export default function FooterUser({ initialLang = "id" }) {
  const { logo, contacts, navSections, socials, copyright } =
    useFooterUViewModel({ initialLang });

  return (
    <footer className="oss-footer" role="contentinfo">
      <div className="oss-footer__top container">
        {/* Brand + Kontak */}
        <div className="oss-footer__col">
          <div className="oss-footer__brand">
            <img src={logo.src} alt={logo.alt} loading="lazy" />
          </div>

          <ul className="oss-footer__contact">
            {contacts.map((c, idx) => (
              <li key={idx}>
                <span className="ico" aria-hidden="true">
                  <Icon name={c.icon} />
                </span>
                <span className="txt">{c.text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Section links */}
        {navSections.map((sec) => (
          <div className="oss-footer__col" key={sec.title}>
            <h4>{sec.title}</h4>
            <ul className="oss-footer__links">
              {sec.links.map((l) => (
                <li key={l.label}>
                  <SmartLink href={l.href}>{l.label}</SmartLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Divider tipis sesuai desain */}
      <div className="oss-footer__divider" />

      {/* Bottom row */}
      <div className="oss-footer__bottom">
        <div className="container oss-footer__bottom-inner">
          <div className="oss-footer__copy">{copyright}</div>

          <div className="oss-footer__socials">
            {socials.map((s) => (
              <SmartLink
                key={s.icon}
                href={s.href}
                ariaLabel={s.ariaLabel}
                className="social-btn"
              >
                <Icon name={s.icon} />
              </SmartLink>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
