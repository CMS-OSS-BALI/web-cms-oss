"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function useResetViewModel() {
  const router = useRouter();
  const qs = useSearchParams();

  const [email, setEmail] = useState(qs.get("email") || "");
  const [code, setCode] = useState("");
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const onChangeCode = (e) => {
    const onlyDigits = e.target.value.replace(/\D/g, "").slice(0, 4);
    setCode(onlyDigits);
  };

  async function onSubmit(e) {
    e?.preventDefault?.();
    setMsg("");

    if (pwd.length < 8) {
      setMsg("Password minimal 8 karakter.");
      return;
    }
    if (pwd !== pwd2) {
      setMsg("Konfirmasi password tidak sama.");
      return;
    }
    if (!/^\d{4}$/.test(code)) {
      setMsg("Kode harus 4 digit angka.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          code,
          new_password: pwd,
        }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setMsg(j?.message || "Gagal reset password.");
        return;
      }

      try {
        new BroadcastChannel("auth").postMessage("logout");
      } catch {}
      router.replace("/admin/login-page?reason=reset");
    } catch {
      setMsg("Terjadi kesalahan jaringan.");
    } finally {
      setLoading(false);
    }
  }

  const resendHref = `/admin/forgot-password${
    email ? `?email=${encodeURIComponent(email.trim().toLowerCase())}` : ""
  }`;

  return {
    email,
    setEmail,
    code,
    onChangeCode,
    pwd,
    setPwd,
    pwd2,
    setPwd2,
    loading,
    msg,
    onSubmit,
    resendHref,
  };
}
