"use client";

import React, { useEffect, useRef, useState } from "react";
import "./header-user.css";
import { useHeaderUViewModel } from "./useHeaderUViewModel";

function FlagDropdown({ lang, langs, onChange, variant = "desktop" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const esc = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("click", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("keydown", esc);
    };
  }, []);

  const current = langs.find((l) => l.value === lang) || langs[0];

  return (
    <div
      ref={ref}
      className={`flagdd flagdd--${variant}`}
      role="group"
      aria-label="Language selector"
    >
      <button
        type="button"
        className={`flagdd__btn ${
          variant === "mobile" ? "flagdd__btn--mobile" : ""
        }`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((s) => !s)}
        title="Change language"
      >
        {/* left cluster: flag (+ label on mobile) */}
        <span className="flagdd__left">
          <img className="flagdd__img" src={current.flag} alt="" />
          {variant === "mobile" && (
            <span className="flagdd__current">{current.label}</span>
          )}
        </span>

        {/* right: chevron (CSS triangle) */}
        <span className="flagdd__chev" aria-hidden />
      </button>

      {open && (
        <ul className="flagdd__menu" role="listbox">
          {langs.map((opt) => (
            <li key={opt.value}>
              <button
                type="button"
                className={`flagdd__item${
                  opt.value === lang ? " is-active" : ""
                }`}
                role="option"
                aria-selected={opt.value === lang}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
              >
                <img className="flagdd__img" src={opt.flag} alt="" />
                <span className="flagdd__label">{opt.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function HeaderUser() {
  const {
    logo,
    navItems,
    isMenuOpen,
    toggleMenu,
    closeMenu,
    lang,
    langs,
    changeLang,
    langLabel, // <-- ambil label i18n
  } = useHeaderUViewModel();

  return (
    <header className="user-header">
      <div className="user-header__inner">
        {/* kiri: logo */}
        <a className="user-header__brand" href={logo.href}>
          <img src={logo.src} alt={logo.alt} />
        </a>

        {/* tengah: nav (flex:1, center) */}
        <nav
          id="user-header-nav"
          className={`user-header__nav${isMenuOpen ? " is-open" : ""}`}
          aria-label="Navigasi utama"
        >
          <ul className="user-header__nav-list">
            {navItems.map((item) => (
              <li key={item.id} className="user-header__nav-item">
                <a
                  href={item.href}
                  className={`user-header__link${
                    item.isActive ? " is-active" : ""
                  }`}
                  onClick={closeMenu}
                >
                  {item.label}
                </a>
              </li>
            ))}

            {/* mobile: flag dropdown di dalam menu */}
            <li className="user-header__nav-item flagdd__mobile-wrap">
              <div className="user-header__lang-label">{langLabel}</div>
              <FlagDropdown
                lang={lang}
                langs={langs}
                onChange={changeLang}
                variant="mobile"
              />
            </li>
          </ul>
        </nav>

        {/* kanan: flag dropdown (desktop) + hamburger */}
        <div className="user-header__right">
          <FlagDropdown
            lang={lang}
            langs={langs}
            onChange={changeLang}
            variant="desktop"
          />

          <button
            type="button"
            className={`user-header__menu-btn${isMenuOpen ? " is-active" : ""}`}
            aria-expanded={isMenuOpen}
            aria-controls="user-header-nav"
            onClick={toggleMenu}
          >
            <span />
          </button>
        </div>
      </div>

      <div
        className={`user-header__overlay${isMenuOpen ? " is-visible" : ""}`}
        role="presentation"
        onClick={closeMenu}
      />
    </header>
  );
}
