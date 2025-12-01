"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/swr/fetcher";
import { ALIAS_TO_CODE } from "@/app/utils/countryAliases";

/* ========================= Helpers ========================= */
const strip = (html = "") =>
  String(html)
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const fmtMoney = (n, currency = "IDR") => {
  if (n === null || n === undefined || n === "") return null;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
      maximumFractionDigits: 0,
    }).format(Number(n));
  } catch {
    return String(n);
  }
};

const SWR_OPTS = {
  revalidateOnFocus: true,
  revalidateIfStale: true,
  revalidateOnReconnect: true,
  shouldRetryOnError: false,
};

const normalizeLocale = (v, fb = "id") => {
  const raw = String(v ?? "")
    .trim()
    .toLowerCase();
  if (!raw) return fb;
  if (raw.startsWith("en")) return "en";
  if (raw.startsWith("id")) return "id";
  return fb;
};
const normalizeId = (v) => {
  const s =
    typeof v === "string" ? v.trim() : v != null ? String(v).trim() : "";
  return s && s !== "undefined" && s !== "null" ? s : "";
};

const buildQuery = (obj = {}) => {
  const p = new URLSearchParams();
  Object.entries(obj).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") p.set(k, String(v));
  });
  return p.toString();
};

// ambil id jurusan dari berbagai kemungkinan field
const getJurusanId = (j) =>
  j?.id ??
  j?.jurusan_id ??
  j?.jurusanId ??
  j?.department_id ??
  j?.departmentId ??
  null;

const getTitle = (it) =>
  it?.name ??
  it?.nama ??
  it?.title ??
  it?.program_name ??
  it?.programName ??
  "";

const getDesc = (it) =>
  it?.description ??
  it?.deskripsi ??
  it?.desc ??
  it?.ringkasan ??
  it?.keterangan ??
  "";

// normalisasi intake → string singkat
const getIntake = (it) => {
  const v =
    it?.in_take ??
    it?.intake ??
    it?.intakes ??
    it?.inTake ??
    it?.in_takes ??
    "";
  return String(v || "").trim();
};

const formatIntakeLabel = (raw) => {
  const parts = String(raw || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  return parts.join(", ");
};

/* ========================= Hook ========================= */
export default function useCollegeDetailViewModel({ id, locale = "id" } = {}) {
  const safeId = normalizeId(id);
  const activeLocale = normalizeLocale(locale, "id");
  const fallbackLocale = "id";

  /* ---------- College detail ---------- */
  const detailUrl = useMemo(() => {
    if (!safeId) return null;
    return `/api/college/${encodeURIComponent(safeId)}?${buildQuery({
      locale: activeLocale,
      fallback: fallbackLocale,
    })}`;
  }, [safeId, activeLocale]);

  const {
    data: college,
    error: resolveErr,
    isLoading: loadingCollege,
  } = useSWR(detailUrl, fetcher, SWR_OPTS);

  /* ---------- Jurusan list ---------- */
  const jurusanUrl = useMemo(() => {
    if (!college?.id) return null;
    return `/api/jurusan?${buildQuery({
      page: 1,
      perPage: 1000,
      locale: activeLocale,
      fallback: fallbackLocale,
      college_id: college.id,
    })}`;
  }, [college?.id, activeLocale]);

  const {
    data: jurusanRes,
    error: jurusanErr,
    isLoading: loadingJurusan,
  } = useSWR(jurusanUrl, fetcher, SWR_OPTS);

  const jurusanList = useMemo(
    () => (Array.isArray(jurusanRes?.data) ? jurusanRes.data : []),
    [jurusanRes?.data]
  );

  /* ---------- Prodi per jurusan (string key agar selalu trigger) ---------- */
  const jurusanIds = useMemo(
    () =>
      jurusanList
        .map(getJurusanId)
        .filter((x) => Boolean(String(x || "").trim())),
    [jurusanList]
  );

  const prodiKey = useMemo(() => {
    if (!jurusanIds.length) return null;
    return `__prodi_batch__${JSON.stringify({
      ids: jurusanIds,
      loc: activeLocale,
    })}`;
  }, [jurusanIds, activeLocale]);

  const { data: prodiMapRes, error: prodiErr } = useSWR(
    prodiKey,
    async (keyStr) => {
      const json = keyStr.replace(/^__prodi_batch__/, "");
      const { ids, loc } = JSON.parse(json || "{}");
      const reqLocale = normalizeLocale(loc, "id");

      const results = await Promise.all(
        (ids || []).map((jid) =>
          fetcher(
            `/api/prodi?${buildQuery({
              page: 1,
              perPage: 1000,
              locale: reqLocale,
              fallback: fallbackLocale,
              jurusan_id: jid,
              sort: "name:asc",
            })}`
          ).catch(() => ({ data: [] }))
        )
      );

      const map = {};
      results.forEach((r, i) => {
        const items = Array.isArray(r?.data) ? r.data : [];
        map[ids[i]] = items.map((p) => ({
          id: p.id,
          title: getTitle(p),
          description: getDesc(p),
          harga: p.harga ?? null,
          jurusan_id: p.jurusan_id ?? null,
          college_id: p.college_id ?? null,
          intake: getIntake(p), // <<< NEW
          intakeLabel: formatIntakeLabel(getIntake(p)),
        }));
      });
      return map;
    },
    SWR_OPTS
  );

  const prodiMap = prodiMapRes || {};

  /* ---------- Requirements ---------- */
  const requirementsUrl = useMemo(() => {
    if (!college?.id) return null;
    return `/api/college/${encodeURIComponent(
      college.id
    )}/requirements?${buildQuery({
      locale: activeLocale,
      fallback: fallbackLocale,
    })}`;
  }, [college?.id, activeLocale]);

  const {
    data: reqRes,
    error: reqErr,
    isLoading: loadingReq,
  } = useSWR(requirementsUrl, fetcher, SWR_OPTS);

  const requirements = useMemo(
    () =>
      Array.isArray(reqRes?.data)
        ? reqRes.data
            .map((r) => (typeof r === "string" ? r : r?.text))
            .filter(Boolean)
        : [],
    [reqRes?.data]
  );

  /* ---------- Derived memoized values ---------- */
  const currency = useMemo(
    () => (college?.currency ? String(college.currency).toUpperCase() : "IDR"),
    [college?.currency]
  );

  // ===== negara flag via API (dinamis) =====
  const countryName = useMemo(
    () => (college?.country || "").trim(),
    [college?.country]
  );

  const countryFlagKey = useMemo(() => {
    if (!countryName) return null;
    const p = new URLSearchParams();
    p.set("page", "1");
    p.set("perPage", "1");
    p.set("q", countryName);
    p.set("locale", activeLocale);
    p.set("fallback", fallbackLocale);
    return `/api/negara?${p.toString()}`;
  }, [countryName, activeLocale, fallbackLocale]);

  const { data: negaraRes } = useSWR(countryFlagKey, fetcher, {
    revalidateOnFocus: false,
  });

  const flagFromApi = useMemo(() => {
    const row = Array.isArray(negaraRes?.data)
      ? negaraRes.data[0]
      : negaraRes?.data;
    return row?.flag || null;
  }, [negaraRes]);

  // ===== utils: pickFlag =====
  const FLAG_PATH = {
    au: "/flags/au.svg",
    ca: "/flags/ca.svg",
    nz: "/flags/nz.svg",
    nl: "/flags/nl.svg",
    us: "/flags/us.svg",
    jp: "/flags/jp.svg",
    tw: "/flags/tw.svg",
    fr: "/flags/fr.svg",
    de: "/flags/de.svg",
    gb: "/flags/gb.svg",
    pl: "/flags/pl.svg",
    kr: "/flags/kr.svg",
    ch: "/flags/ch.svg",
    cn: "/flags/cn.svg",
    sg: "/flags/sg.svg",
    my: "/flags/my.svg",
    it: "/flags/it.svg",
  };

  const pickFlag = (countryRaw = "") => {
    const s = String(countryRaw || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "");

    let code = ALIAS_TO_CODE[s];
    if (!code) {
      for (const [alias, c] of Object.entries(ALIAS_TO_CODE)) {
        if (s.includes(alias)) {
          code = c;
          break;
        }
      }
    }
    if (!code && s.length === 2) code = s;
    return FLAG_PATH[code] || "/flags/gb.svg";
  };

  // ====== Hero ======
  const hero = useMemo(() => {
    return {
      name: college?.name || "College",
      cover: "/aus-campus.svg",
      logo:
        typeof college?.logo_url === "string" && college.logo_url.trim()
          ? college.logo_url
          : "/images/logo-fallback.svg",
      websiteText: college?.website
        ? String(college.website).replace(/^https?:\/\//, "")
        : "",
      objectPosition: "50% 50%",
      flagSrc: flagFromApi || pickFlag(countryName),
      countryName,
    };
  }, [
    college?.name,
    college?.logo_url,
    college?.website,
    countryName,
    flagFromApi,
  ]);

  const { faculties, prodiById } = useMemo(() => {
    const byId = {};
    const facs = jurusanList.map((j) => {
      const jid = getJurusanId(j);
      const progs = prodiMap[jid] || [];
      const intakeRaw = getIntake(j);
      const intakeLabel = formatIntakeLabel(intakeRaw);
      const kotaNames = Array.isArray(j?.kota_names)
        ? j.kota_names.filter(Boolean)
        : j?.kota_name
        ? [j.kota_name]
        : [];
      const kotaLabel = kotaNames.join(", ");

      progs.forEach((p) => {
        byId[p.id] = {
          ...p,
          priceLabel: p.harga != null ? fmtMoney(p.harga, currency) : null,
          kotaLabel,
          intake: p.intake,
          intakeLabel: p.intakeLabel ?? formatIntakeLabel(p.intake),
        };
      });

      return {
        id: jid || undefined,
        title: getTitle(j) || "-",
        description: getDesc(j) || "",
        priceLabel: j?.harga != null ? fmtMoney(j.harga, currency) : null,
        intake: intakeRaw, // retained for compatibility
        intakeLabel,
        kotaNames,
        kotaLabel,
        programs: progs.map((p) => ({
          ...p,
          priceLabel: p.harga != null ? fmtMoney(p.harga, currency) : null,
          intake: p.intake,
          intakeLabel: p.intakeLabel ?? formatIntakeLabel(p.intake),
        })),
      };
    });

    return { faculties: facs, prodiById: byId };
  }, [jurusanList, prodiMap, currency]);

  const sections = useMemo(
    () => ({
      aboutTitle:
        college?.about_title ||
        (activeLocale === "en"
          ? `About ${college?.name || "the College"}`
          : `Tentang ${college?.name || "Kampus"}`),
      aboutHTML:
        typeof college?.description === "string" && college.description
          ? college.description
          : activeLocale === "en"
          ? "<p>Description is not available yet.</p>"
          : "<p>Deskripsi kampus belum tersedia.</p>",
      faculties,
      requirements,
      excerpt: strip(college?.description || ""),
    }),
    [
      college?.about_title,
      college?.name,
      college?.description,
      activeLocale,
      faculties,
      requirements,
    ]
  );

  const tuition = useMemo(() => {
    const feeMin = fmtMoney(college?.tuition_min, currency);
    const feeMax = fmtMoney(college?.tuition_max, currency);
    return {
      feeLabel:
        feeMin && feeMax ? `${feeMin} - ${feeMax}` : feeMin || feeMax || "-",
      livingCost:
        college?.living_cost_estimate != null
          ? fmtMoney(college.living_cost_estimate, currency)
          : "-",
    };
  }, [
    college?.tuition_min,
    college?.tuition_max,
    college?.living_cost_estimate,
    currency,
  ]);

  const websiteHref = useMemo(() => {
    let href = college?.website || "";
    if (href && !/^https?:\/\//i.test(href)) href = `https://${href}`;
    return href;
  }, [college?.website]);

  const isLoading =
    loadingCollege ||
    loadingJurusan ||
    (jurusanIds.length > 0 && !prodiMapRes && !prodiErr) ||
    loadingReq;

  const error = resolveErr || jurusanErr || prodiErr || reqErr || null;

  return {
    isLoading,
    error,
    hero,
    countryName: hero.countryName || "",
    websiteHref,
    sections, // faculties + requirements
    tuition,
    prodiById, // untuk modal detail prodi
  };
}
