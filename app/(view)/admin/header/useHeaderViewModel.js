"use client";

import { useMemo, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import useSWR from "swr";
import { HomeOutlined } from "@ant-design/icons";
import { MENU, findPathByHref } from "../sidebar/useSidebarViewModel";

const fetcher = (url) =>
  fetch(url, { cache: "no-store", credentials: "include" }).then((r) =>
    r.json()
  );

export default function useHeaderViewModel() {
  const pathname = usePathname() || "/admin/dashboard";
  const { data: session } = useSession();

  // chain aktif untuk breadcrumbs (Kampus → Jurusan → Prodi)
  const activeChain = useMemo(() => findPathByHref(pathname, MENU), [pathname]);

  const breadcrumbs = useMemo(() => {
    const items = [
      {
        title: (
          <Link href="/admin/dashboard" className="ah-crumb">
            <HomeOutlined />
            <span>Beranda</span>
          </Link>
        ),
      },
    ];
    if (activeChain.length) {
      activeChain.forEach((node, idx) => {
        const last = idx === activeChain.length - 1;
        items.push({
          title: last ? (
            <div className="ah-crumb-disabled">
              <span>{node.label}</span>
            </div>
          ) : (
            <Link href={node.href} className="ah-crumb">
              <span>{node.label}</span>
            </Link>
          ),
        });
      });
    } else {
      const seg = pathname.split("?")[0].split("/").filter(Boolean);
      const label = seg[2] ? seg[2][0].toUpperCase() + seg[2].slice(1) : "";
      if (label)
        items.push({ title: <div className="ah-crumb-disabled">{label}</div> });
    }
    return items;
  }, [activeChain, pathname]);

  const name = (session?.user?.name || "Admin User").trim();
  const email = session?.user?.email || "";
  const initials =
    name
      .split(" ")
      .filter(Boolean)
      .map((s) => s[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "AU";

  const { data: me, mutate } = useSWR(
    email ? "/api/auth/profile" : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshInterval: 0,
      dedupingInterval: 5 * 60 * 1000,
      keepPreviousData: true,
    }
  );

  useEffect(() => {
    let ch;
    try {
      ch = new BroadcastChannel("profile");
      ch.onmessage = (ev) => ev?.data === "updated" && mutate();
    } catch {}
    return () => ch?.close?.();
  }, [mutate]);

  const image =
    me?.image_public_url || me?.profile_photo || session?.user?.image || "";

  function onLogout() {
    try {
      new BroadcastChannel("auth").postMessage("logout");
    } catch {}
    return signOut({ redirect: true, callbackUrl: "/admin/login-page" });
  }

  const user = { name, email, image, initials };
  return { breadcrumbs, user, onLogout };
}
