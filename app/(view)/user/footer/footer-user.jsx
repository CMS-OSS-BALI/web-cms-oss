// FooterUser.jsx
"use client";
import React from "react";
import Link from "next/link";
import "./footer-user.css";
import useFooterUViewModel from "./useFooterUViewModel";

/* ---------- Icons ---------- */
function Icon({ name }) {
  switch (name) {
    case "location":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 2C7.86 2 4.5 5.36 4.5 9.5c0 5.32 6.59 11.75 6.88 12.04a1.5 1.5 0 0 0 2.24 0c.29-.29 6.88-6.72 6.88-12.04C19.5 5.36 16.14 2 12 2zm0 10.25A2.75 2.75 0 1 1 12 6.75a2.75 2.75 0 0 1 0 5.5z" />
        </svg>
      );
    case "phone":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.02-.24c1.12.37 2.33.57 3.57.57a1 1 0 0 1 1 1V20a2 2 0 0 1-2 2C10.07 22 2 13.93 2 4a2 2 0 0 1 2-2h2.49a1 1 0 0 1 1 1c0 1.24.2 2.45.57 3.57a1 1 0 0 1-.24 1.02l-2.2 2.2z" />
        </svg>
      );
    case "email":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z" />
        </svg>
      );
    case "instagram":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7zm5 3.5A5.5 5.5 0 1 1 6.5 13 5.51 5.51 0 0 1 12 7.5zm0 2A3.5 3.5 0 1 0 15.5 13 3.5 3.5 0 0 0 12 9.5zm5.75-2.75a1.25 1.25 0 1 1-1.25 1.25 1.25 1.25 0 0 1 1.25-1.25z" />
        </svg>
      );
    case "whatsapp":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20.52 3.48A11.85 11.85 0 0 0 12.06 0C5.44 0 .08 5.36.08 11.97A11.9 11.9 0 0 0 2.2 18.5L0 24l5.67-2.15a11.94 11.94 0 0 0 6.39 1.84h.01c6.61 0 11.97-5.36 11.97-11.97a11.86 11.86 0 0 0-3.52-8.24zM12.07 21.5h-.01a9.5 9.5 0 0 1-4.84-1.33l-.35-.2-3.37 1.27.9-3.24-.21-.33a9.46 9.46 0 0 1-1.48-5.07A9.56 9.56 0 0 1 12.06 2.5a9.42 9.42 0 0 1 9.47 9.47 9.56 9.56 0 0 1-9.46 9.53zm5.42-7.24c-.3-.15-1.77-.87-2.04-.97s-.47-.15-.67.15-.77.97-.95 1.17-.35.22-.65.07a7.79 7.79 0 0 1-2.29-1.41 8.62 8.62 0 0 1-1.59-1.96c-.17-.3 0-.46.13-.61.14-.14.3-.35.44-.52s.2-.3.3-.49a.55.55 0 0 0-.03-.52c-.08-.15-.67-1.62-.92-2.22s-.49-.5-.67-.5h-.57a1.1 1.1 0 0 0-.79.37c-.27.3-1.04 1.02-1.04 2.48s1.06 2.88 1.21 3.08a15.6 15.6 0 0 0 3.64 3.64c.5.29.88.46 1.18.58.5.2.95.17 1.31.1.4-.06 1.24-.51 1.42-1s.18-.91.12-1.01-.27-.15-.57-.3z" />
        </svg>
      );
    case "youtube":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M23.5 6.18a3 3 0 0 0-2.1-2.12C19.3 3.5 12 3.5 12 3.5s-7.3 0-9.4.56A3 3 0 0 0 .5 6.18 31.14 31.14 0 0 0 0 12a31.14 31.14 0 0 0 .5 5.82 3 3 0 0 0 2.1 2.12C4.7 20.5 12 20.5 12 20.5s7.3 0 9.4-.56a3 3 0 0 0 2.1-2.12A31.14 31.14 0 0 0 24 12a31.14 31.14 0 0 0-.5-5.82zM9.75 15.5v-7L15.5 12l-5.75 3.5z" />
        </svg>
      );
    default:
      return null;
  }
}

/* ---------- Smart Link (pakai <Link> untuk internal) ---------- */
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

/* ---------- Footer Component ---------- */
export default function FooterUser() {
  const { logo, contacts, navSections, socials, copyright } =
    useFooterUViewModel();

  return (
    <footer className="oss-footer">
      <div className="oss-footer__top container">
        {/* Brand + Contacts */}
        <div className="oss-footer__col">
          <div className="oss-footer__brand">
            <img src={logo.src} alt={logo.alt} />
          </div>

          <ul className="oss-footer__contact">
            {contacts.map((c, idx) => (
              <li key={idx}>
                <span className="ico">
                  <Icon name={c.icon} />
                </span>
                {c.text}
              </li>
            ))}
          </ul>
        </div>

        {/* Dynamic Sections */}
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

      {/* Bottom */}
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
