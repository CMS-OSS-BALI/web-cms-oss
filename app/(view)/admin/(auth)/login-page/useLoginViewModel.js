"use client";

import { useState, useMemo } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

export default function useLoginViewModel() {
  const router = useRouter();
  const qs = useSearchParams();
  const DASHBOARD_URL = "/admin/dashboard";

  const errorQ = qs.get("error") || "";
  const reason = qs.get("reason") || "";

  const queryMsg = useMemo(() => {
    if (errorQ === "CredentialsSignin") return "Email atau password salah.";
    if (reason === "reset") return "Sesi dibersihkan, silakan login kembali.";
    if (reason === "relogin")
      return "Password telah diganti. Silakan login ulang.";
    return "";
  }, [errorQ, reason]);

  const nextParam = qs.get("next") || "/admin/dashboard";
  const nextSafe = nextParam.startsWith("/") ? nextParam : "/admin/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState("");

  const msg = localError || queryMsg;

  async function onSubmit(e) {
    e?.preventDefault?.();
    if (loading) return;

    setLocalError("");
    setLoading(true);

    try {
      const res = await signIn("credentials", {
        email: (email || "").trim().toLowerCase(),
        password,
        redirect: false,
        callbackUrl: DASHBOARD_URL,
      });

      if (!res || res.error) {
        setLocalError("Email atau password salah.");
        return;
      }

      // Abaikan res.url agar tidak balik ke halaman terakhir
      router.replace(DASHBOARD_URL);
    } catch (err) {
      setLocalError("Terjadi kesalahan. Coba lagi dalam beberapa saat.");
    } finally {
      setLoading(false);
    }
  }

  function goToForgot() {
    const q = email
      ? `?email=${encodeURIComponent(email.trim().toLowerCase())}`
      : "";
    router.push(`/admin/forgot-password${q}`);
  }

  return {
    email,
    setEmail,
    password,
    setPassword,
    loading,
    msg,
    onSubmit,
    goToForgot,
  };
}
