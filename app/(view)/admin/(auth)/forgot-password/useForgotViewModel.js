"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function useForgotViewModel() {
  const router = useRouter();
  const qs = useSearchParams();

  const [email, setEmail] = useState(qs.get("email") || "");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef(null);

  const isValidEmail = useMemo(
    () => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()),
    [email]
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  function startCooldown(sec = 60) {
    if (timerRef.current) clearInterval(timerRef.current);
    setCooldown(sec);
    timerRef.current = setInterval(() => {
      setCooldown((s) => {
        if (s <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }

  async function onSubmit(e) {
    e?.preventDefault?.();
    if (loading || !isValidEmail) return;

    setLoading(true);
    setMsg("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      if (res.ok) {
        setMsg("Jika email terdaftar, kode telah dikirim. Periksa inbox/Spam.");
        startCooldown(60);

        // langsung ke halaman reset (prefill email)
        const q = new URLSearchParams({
          email: email.trim().toLowerCase(),
          sent: "1",
        }).toString();
        router.replace(`/admin/reset-password?${q}`);
      } else {
        const j = await res.json().catch(() => ({}));
        setMsg(j?.message || "Terjadi kesalahan.");
      }
    } catch {
      setMsg("Terjadi kesalahan jaringan.");
    } finally {
      setLoading(false);
    }
  }

  const disabled = loading || cooldown > 0 || !isValidEmail;

  return { email, setEmail, loading, msg, cooldown, disabled, onSubmit };
}
