"use client";

import Link from "next/link";
import styles from "./footer.module.css";

/**
 * Props:
 * - links?: Array<{ href: string; label: string }>
 * - className?: string
 * - variant?: "light" | "dark"   // optional, default "light"
 */
export default function Footer({
  links = [],
  className = "",
  variant = "light",
}) {
  const year = new Date().getFullYear();
  const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "OSS Bali";
  const brand = `${appName} • Admin Panel`;
  const isExternal = (href = "") => /^https?:\/\//i.test(href);

  const rowClass =
    variant === "dark" ? `${styles.row} ${styles.rowDark}` : styles.row;
  const leftClass =
    variant === "dark" ? `${styles.left} ${styles.leftDark}` : styles.left;
  const linkClass =
    variant === "dark" ? `${styles.link} ${styles.linkDark}` : styles.link;

  return (
    <footer className={`${styles.wrap} ${className}`} role="contentinfo">
      <div className={rowClass}>
        <span className={leftClass}>
          © {year} {brand}
        </span>

        {links.length > 0 && (
          <nav aria-label="Footer links">
            <ul className={styles.right}>
              {links.map(({ href, label }, i) => (
                <li key={`${href}-${i}`}>
                  {isExternal(href) ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={linkClass}
                    >
                      {label}
                    </a>
                  ) : (
                    <Link href={href} className={linkClass}>
                      {label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>
    </footer>
  );
}
