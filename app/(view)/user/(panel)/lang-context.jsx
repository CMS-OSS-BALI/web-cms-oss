// app/(view)/user/(panel)/lang-context.jsx
"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

/** Context sederhana untuk bahasa */
const LangCtx = createContext({ lang: "id", setLang: () => {} });

export function LangProvider({ initialLang = "id", children }) {
  const [lang, setLang] = useState(initialLang);

  // Sinkronkan <html lang> di client (tanpa mengubah first paint)
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("lang", lang);
    }
  }, [lang]);

  // (Opsional) kalau masih ingin ingat preferensi user di kunjungan berikutnya
  // TIDAK dipakai untuk render awal; hanya post-hydration.
  useEffect(() => {
    try {
      localStorage.setItem("oss.lang", lang);
    } catch {}
  }, [lang]);

  const value = useMemo(() => ({ lang, setLang }), [lang]);

  return <LangCtx.Provider value={value}>{children}</LangCtx.Provider>;
}

export function useLang() {
  return useContext(LangCtx);
}
