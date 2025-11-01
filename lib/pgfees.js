// /lib/pgfees.js
// Utility: hitung gross-up (user menanggung biaya) + deteksi channel Midtrans

const pct = (v, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};
const num = (v, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : d;
};
const bool = (v) => {
  const s = String(v ?? "")
    .trim()
    .toLowerCase();
  return s === "1" || s === "true" || s === "yes";
};

function envNum(name, def) {
  const raw = process.env[name];
  if (raw == null || raw === "") return def;
  const n = Number(raw);
  return Number.isFinite(n) ? n : def;
}
function envList(name, def = []) {
  const raw = process.env[name];
  if (!raw) return def;
  return String(raw)
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isPassthroughEnabled() {
  return bool(process.env.MIDTRANS_FEE_PASSTHROUGH);
}

export function getFeeConfig() {
  // PPN
  const PPN = envNum("MIDTRANS_PPN_RATE", 0.11);

  // Channel yg SUDAH INCLUDE PPN → jangan ditambah PPN lagi pada fee-nya
  const includePPN = new Set(
    envList("MIDTRANS_FEE_INCLUDE_PPN_CHANNELS", ["qris", "gopay", "shopeepay"])
  );

  // Rates (default mengacu ke tabel biaya Midtrans per 1 Nov 2025)
  return {
    PPN,
    includePPN,
    // VA (flat)
    va: {
      pct: 0,
      flat: envNum("MIDTRANS_FEE_VA_FLAT", 4000),
      includePPN: false,
    },
    // E-wallet
    qris: {
      pct: envNum("MIDTRANS_FEE_QRIS_PCT", 0.007),
      flat: 0,
      includePPN: true,
    },
    gopay: {
      pct: envNum("MIDTRANS_FEE_GOPAY_PCT", 0.02),
      flat: 0,
      includePPN: true,
    },
    shopeepay: {
      pct: envNum("MIDTRANS_FEE_SHOPEEPAY_PCT", 0.02),
      flat: 0,
      includePPN: true,
    },
    dana: {
      pct: envNum("MIDTRANS_FEE_DANA_PCT", 0.015),
      flat: 0,
      includePPN: false,
    },
    // Card online
    card: {
      pct: envNum("MIDTRANS_FEE_CARD_PCT", 0.029),
      flat: envNum("MIDTRANS_FEE_CARD_FLAT", 2000),
      includePPN: false,
    },
    // Minimarket
    minimarket_alfa: {
      pct: 0,
      flat: envNum("MIDTRANS_FEE_MINIMARKET_ALFA_FLAT", 5000),
      includePPN: false,
    },
    minimarket_indomaret: {
      pct: 0,
      flat: envNum("MIDTRANS_FEE_MINIMARKET_INDOMARET_FLAT", 1000), // + komponen mitra (di luar Midtrans) jika ada
      includePPN: false,
    },
    // PayLater
    akulaku: {
      pct: envNum("MIDTRANS_FEE_AKULAKU_PCT", 0.017),
      flat: 0,
      includePPN: false,
    },
    kredivo: {
      pct: envNum("MIDTRANS_FEE_KREDIVO_PCT", 0.02),
      flat: 0,
      includePPN: false,
    },
  };
}

export function channelLabel(ch) {
  const map = {
    va: "Virtual Account",
    qris: "QRIS",
    gopay: "GoPay",
    shopeepay: "ShopeePay",
    dana: "DANA",
    card: "Kartu Kredit/Debit Online",
    minimarket_alfa: "Alfamart / Alfamidi / DAN+DAN",
    minimarket_indomaret: "Indomaret",
    akulaku: "Akulaku",
    kredivo: "Kredivo",
  };
  return map[ch] || ch;
}

/**
 * Map kode enabled_payments Midtrans → channel internal
 * HANYA gunakan 1 item untuk passthrough.
 */
export function mapEnabledToChannel(codeRaw) {
  const c = String(codeRaw || "").toLowerCase();
  if (!c) return null;

  // VA
  if (
    [
      "bank_transfer",
      "permata_va",
      "bca_va",
      "bni_va",
      "bri_va",
      "cimb_va",
      "other_va",
      "echannel",
    ].includes(c)
  ) {
    return "va";
  }

  // E-wallet
  if (c === "qris" || c === "other_qris") return "qris";
  if (c === "gopay") return "gopay";
  if (c === "shopeepay") return "shopeepay";
  if (c === "dana") return "dana";

  // Card
  if (c === "credit_card" || c === "card") return "card";

  // Minimarket
  if (c === "alfamart") return "minimarket_alfa";
  if (c === "indomaret") return "minimarket_indomaret";
  if (c === "cstore") return "minimarket_alfa"; // default ke alfa

  // PayLater
  if (c === "akulaku" || c === "akucicil") return "akulaku";
  if (c === "kredivo") return "kredivo";

  return null;
}

/**
 * Deteksi channel dari webhook body Midtrans (payment_type + detail)
 */
export function detectChannelFromWebhook(body = {}) {
  const pt = String(body?.payment_type || "").toLowerCase();

  if (pt === "bank_transfer" || pt === "echannel") return "va";
  if (pt === "qris") return "qris";
  if (pt === "gopay") return "gopay";
  if (pt === "shopeepay") return "shopeepay";
  if (pt === "dana") return "dana";
  if (pt === "credit_card") return "card";
  if (pt === "cstore") {
    const store = String(body?.store || "").toLowerCase();
    if (store.includes("indomaret")) return "minimarket_indomaret";
    return "minimarket_alfa";
  }
  if (pt === "akulaku" || pt === "akucicil") return "akulaku";
  if (pt === "kredivo") return "kredivo";

  // fallback
  return null;
}

/**
 * Deteksi channel dari response Core API (fetchStatus)
 */
export function detectChannelFromMidtrans(mid = {}) {
  const pt = String(mid?.payment_type || "").toLowerCase();

  if (pt === "bank_transfer" || pt === "echannel") return "va";
  if (pt === "qris") return "qris";
  if (pt === "gopay") return "gopay";
  if (pt === "shopeepay") return "shopeepay";
  if (pt === "dana") return "dana";
  if (pt === "credit_card") return "card";
  if (pt === "cstore") {
    const store = String(mid?.store || "").toLowerCase();
    if (store.includes("indomaret")) return "minimarket_indomaret";
    return "minimarket_alfa";
  }
  if (pt === "akulaku" || pt === "akucicil") return "akulaku";
  if (pt === "kredivo") return "kredivo";

  return null;
}

/**
 * Hitung gross-up untuk net target.
 * Rumus: gross = ceil( (net + flatEff) / (1 - pctEff) )
 * pctEff/flatEff sudah di-adjust PPN jika perlu.
 */
export function grossUp(netTarget, channel) {
  const cfg = getFeeConfig();
  const base = num(netTarget, 0);
  if (base <= 0)
    return { gross: 0, fee: 0, breakdown: { base, pctEff: 0, flatEff: 0 } };

  const rate = cfg[channel] || { pct: 0, flat: 0, includePPN: false };
  const include = rate.includePPN || cfg.includePPN.has(channel);

  const pctEff = pct(rate.pct, 0) * (include ? 1 : 1 + cfg.PPN);
  const flatEff = num(
    include ? rate.flat : Math.ceil(rate.flat * (1 + cfg.PPN)),
    0
  );

  const denom = 1 - pctEff;
  const gross = Math.ceil(
    denom <= 0 ? base + flatEff : (base + flatEff) / denom
  );
  const fee = gross - base;

  return {
    gross,
    fee,
    breakdown: {
      base,
      pct: rate.pct,
      flat: rate.flat,
      includePPN: include,
      pctEff,
      flatEff,
    },
  };
}

/**
 * Tambahkan line item "Biaya Channel" agar transparan di Snap UI.
 * items: item_details existing; return array baru
 */
export function withFeeItem(items = [], base, channel) {
  const { gross, fee } = grossUp(base, channel);
  const out = Array.isArray(items) ? [...items] : [];
  if (fee > 0) {
    out.push({
      id: "pg_fee",
      name: `Biaya Channel (${channelLabel(channel)})`,
      price: fee,
      quantity: 1,
      category: "pg_fee",
    });
  }
  return { items: out, gross };
}
