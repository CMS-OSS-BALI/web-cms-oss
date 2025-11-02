// lib/swr/fetcher.js
export async function fetcher(url, init) {
  const res = await fetch(url, {
    cache: "no-store",
    credentials: "same-origin", // ganti ke "include" kalau lintas subdomain
    ...init,
  });

  // coba parse JSON agar pesan error lebih jelas
  let info = null;
  try {
    info = await res.clone().json();
  } catch {
    // mungkin bukan JSON; aman diabaikan
  }

  if (!res.ok) {
    const err = new Error(
      (info && (info.error?.message || info.message)) ||
        `Request failed (${res.status})`
    );
    err.status = res.status;
    err.info = info;
    throw err;
  }

  return info ?? (await res.json());
}

export const key = (parts = {}) => {
  const sp = new URLSearchParams();
  Object.entries(parts).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    sp.set(k, String(v));
  });
  return sp.toString();
};

// Optional: default SWR settings untuk panel admin
export const swrDefaults = {
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  refreshInterval: 0,
  dedupingInterval: 5 * 60 * 1000, // 5 menit
  keepPreviousData: true,
};
