"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";

const API_BASE = "/api/profile";

export default function useProfileViewModel() {
  const { data: session } = useSession();

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const initials = useMemo(() => {
    const n = (name || "Admin User")
      .split(" ")
      .map((s) => s?.[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase();
    return n || "AU";
  }, [name]);

  const profile = useMemo(
    () => ({ name, email, initials }),
    [name, email, initials]
  );

  const hydrateFromSession = useCallback(() => {
    setName(session?.user?.name || "Admin User");
    setEmail(session?.user?.email || "");
  }, [session?.user?.name, session?.user?.email]);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch(API_BASE, { cache: "no-store" });
      if (!res.ok) throw new Error("fallback");
      const json = await res.json();
      setName(json?.name ?? session?.user?.name ?? "Admin User");
      setEmail(json?.email ?? session?.user?.email ?? "");
    } catch {
      hydrateFromSession();
    } finally {
      setLoading(false);
    }
  }, [hydrateFromSession, session?.user?.email, session?.user?.name]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const updateProfile = useCallback(async () => {
    setSavingProfile(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch(API_BASE, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name?.trim() }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.message || "Gagal menyimpan profil");
      }
      setMessage("Profil berhasil diperbarui.");
      await fetchProfile();
    } catch (e) {
      setError(e?.message || "Gagal menyimpan profil");
    } finally {
      setSavingProfile(false);
    }
  }, [name, fetchProfile]);

  const changePassword = useCallback(
    async ({ current_password, new_password }) => {
      setSavingPassword(true);
      setMessage("");
      setError("");
      try {
        const res = await fetch(`${API_BASE}?action=password`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ current_password, new_password }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j?.message || "Gagal mengubah password");
        }
        setMessage("Password berhasil diubah.");
      } catch (e) {
        setError(e?.message || "Gagal mengubah password");
      } finally {
        setSavingPassword(false);
      }
    },
    []
  );

  return {
    loading,
    savingProfile,
    savingPassword,
    profile,
    name,
    email,
    message,
    error,
    setName,
    updateProfile,
    changePassword,
    fetchProfile,
  };
}
