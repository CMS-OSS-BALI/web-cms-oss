"use client";

import Link from "next/link";
import styles from "./footer.module.css";

/**
 * Props:
 * - links?: Array<{ href: string; label: string }>
 * - className?: string  (opsional penambah kelas dari luar)
 */
export default function Footer({ links = [], className = "" }) {
  const year = new Date().getFullYear();
  const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "OSS Bali";
  const brand = `${appName} • Admin Panel`;

  const isExternal = (href = "") => /^https?:\/\//i.test(href);

  return (
    <footer className={`${styles.wrap} ${className}`} role="contentinfo">
      <div className={styles.row}>
        <span className={styles.left}>
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
                      className={styles.link}
                    >
                      {label}
                    </a>
                  ) : (
                    <Link href={href} className={styles.link}>
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
