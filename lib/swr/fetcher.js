export async function fetcher(url, init) {
  const res = await fetch(url, {
    cache: "no-store",
    credentials: "same-origin",
    ...init,
  });
  if (!res.ok) {
    let info = null;
    try {
      info = await res.json();
    } catch {}
    const err = new Error(info?.message || `Request failed (${res.status})`);
    err.status = res.status;
    err.info = info;
    throw err;
  }
  return res.json();
}

export const key = (parts = {}) => {
  const sp = new URLSearchParams();
  Object.entries(parts).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    sp.set(k, String(v));
  });
  return sp.toString();
};

