// app/api/vouchers/route.js
import prisma from "@/lib/prisma";
import {
  json,
  badRequest,
  unauthorized,
  forbidden,
  assertAdmin,
  readQuery,
  readBodyFlexible,
  sanitizeCode,
  toInt,
  toDate,
  toBool,
  asInt,
  getOrderBy,
  toTs,
} from "./_utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/vouchers
 * - Public validate: ?code=ABC123[&event_id=...]
 * - Admin list (pagination + filters)
 */
export async function GET(req) {
  const sp = readQuery(req);
  const codeParam = (sp.get("code") || "").trim();
  const event_id = (sp.get("event_id") || "").trim() || null;

  // ===== Public validate by code =====
  if (codeParam) {
    const code = sanitizeCode(codeParam);
    if (!code) return json({ valid: false, reason: "INVALID_CODE" });
    const now = new Date();

    const v = await prisma.vouchers.findUnique({
      where: { code },
      select: {
        code: true,
        type: true,
        value: true,
        max_discount: true,
        is_active: true,
        max_uses: true,
        used_count: true,
        valid_from: true,
        valid_to: true,
        event_id: true,
      },
    });

    if (!v) return json({ valid: false, reason: "NOT_FOUND" });
    if (!v.is_active) return json({ valid: false, reason: "INACTIVE" });
    if (v.valid_from && v.valid_from > now)
      return json({ valid: false, reason: "NOT_YET_VALID" });
    if (v.valid_to && v.valid_to < now)
      return json({ valid: false, reason: "EXPIRED" });
    if (v.max_uses != null && v.used_count >= v.max_uses)
      return json({ valid: false, reason: "MAX_USED" });
    if (v.event_id && event_id && v.event_id !== event_id)
      return json({ valid: false, reason: "EVENT_NOT_MATCH" });

    return json({
      valid: true,
      data: {
        code: v.code,
        type: v.type,
        value: v.value,
        max_discount: v.max_discount,
      },
    });
  }

  // ===== Admin list =====
  try {
    await assertAdmin(req);

    const page = Math.max(1, asInt(sp.get("page"), 1));
    const perPage = Math.min(100, Math.max(1, asInt(sp.get("perPage"), 20)));
    const orderBy = getOrderBy(sp.get("sort")); // ex: "created_at:desc", "code:asc"

    // filters
    const q = (sp.get("q") || "").trim(); // search by code
    const type = (sp.get("type") || "").toUpperCase(); // FIXED|PERCENT
    const isActiveParam = sp.get("is_active"); // '1' or '0'
    const is_active = isActiveParam == null ? undefined : isActiveParam === "1";
    const evId = (sp.get("event_id") || "").trim(); // filter by event

    const where = {
      ...(q ? { code: { contains: q } } : {}),
      ...(type === "FIXED" || type === "PERCENT" ? { type } : {}),
      ...(typeof is_active === "boolean" ? { is_active } : {}),
      ...(evId ? { event_id: evId } : {}),
    };

    const [total, rows] = await Promise.all([
      prisma.vouchers.count({ where }),
      prisma.vouchers.findMany({
        where,
        orderBy,
        skip: (page - 1) * perPage,
        take: perPage,
        select: {
          id: true,
          code: true,
          type: true,
          value: true,
          max_discount: true,
          is_active: true,
          max_uses: true,
          used_count: true,
          valid_from: true,
          valid_to: true,
          event_id: true,
          created_at: true,
          updated_at: true,
        },
      }),
    ]);

    const data = rows.map((r) => ({
      ...r,
      created_ts: toTs(r.created_at),
      updated_ts: toTs(r.updated_at),
      valid_from_ts: toTs(r.valid_from),
      valid_to_ts: toTs(r.valid_to),
    }));

    return json({
      message: "OK",
      data,
      meta: {
        page,
        perPage,
        total,
        totalPages: Math.max(1, Math.ceil(total / perPage)),
      },
    });
  } catch (err) {
    const status = err?.status || 500;
    if (status === 401) return unauthorized();
    if (status === 403) return forbidden();
    console.error("GET /api/vouchers error:", err);
    return json(
      { error: { code: "SERVER_ERROR", message: "Gagal memuat voucher." } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/vouchers (admin)
 */
export async function POST(req) {
  try {
    await assertAdmin(req);
  } catch (err) {
    const status = err?.status || 401;
    if (status === 401) return unauthorized();
    if (status === 403) return forbidden();
    return unauthorized();
  }

  try {
    const body = await readBodyFlexible(req);

    const code = sanitizeCode(body?.code);
    if (!code)
      return badRequest("code wajib diisi (A-Z 0-9 _ -, max 64)", "code");

    const typeRaw = String(body?.type || "").toUpperCase();
    const type = typeRaw === "PERCENT" ? "PERCENT" : "FIXED";

    const value = toInt(body?.value, null);
    if (value == null) return badRequest("value wajib diisi", "value");

    let max_discount = toInt(body?.max_discount, null);
    if (type === "FIXED") {
      if (value < 0) return badRequest("value (FIXED) harus >= 0", "value");
      max_discount = null;
    } else {
      if (value < 1 || value > 100)
        return badRequest("value (PERCENT) harus 1..100", "value");
      if (max_discount != null && max_discount < 0)
        return badRequest("max_discount harus >= 0 atau null", "max_discount");
    }

    const max_uses = toInt(body?.max_uses, null);
    if (max_uses != null && max_uses < 0)
      return badRequest("max_uses harus >= 0 atau null", "max_uses");

    const valid_from = body?.valid_from ? toDate(body.valid_from) : null;
    const valid_to = body?.valid_to ? toDate(body.valid_to) : null;
    if (valid_from && valid_to && valid_to < valid_from)
      return badRequest("valid_to harus >= valid_from", "valid_to");

    const event_id = body?.event_id ? String(body.event_id).trim() : null;
    if (event_id) {
      const ev = await prisma.events.findUnique({
        where: { id: event_id },
        select: { id: true },
      });
      if (!ev) return badRequest("event_id tidak valid", "event_id");
    }

    const isActiveParsed = toBool(body?.is_active);
    const is_active =
      typeof isActiveParsed === "boolean"
        ? isActiveParsed
        : body?.is_active !== false;

    const created = await prisma.vouchers.create({
      data: {
        code,
        type,
        value,
        max_discount,
        is_active,
        max_uses,
        valid_from,
        valid_to,
        event_id: event_id || null,
      },
      select: {
        id: true,
        code: true,
        type: true,
        value: true,
        max_discount: true,
        is_active: true,
        max_uses: true,
        used_count: true,
        valid_from: true,
        valid_to: true,
        event_id: true,
        created_at: true,
        updated_at: true,
      },
    });

    return json(
      {
        message: "Voucher berhasil dibuat",
        data: {
          ...created,
          created_ts: toTs(created.created_at),
          updated_ts: toTs(created.updated_at),
          valid_from_ts: toTs(created.valid_from),
          valid_to_ts: toTs(created.valid_to),
        },
      },
      { status: 201 }
    );
  } catch (err) {
    if (
      err?.code === "P2002" &&
      String(err?.meta?.target || "").includes("code")
    ) {
      return json(
        {
          error: {
            code: "CONFLICT",
            message: "Gagal membuat data: kode voucher sudah digunakan.",
            field: "code",
          },
        },
        { status: 409 }
      );
    }
    console.error("POST /api/vouchers error:", err);
    return json(
      { error: { code: "SERVER_ERROR", message: "Gagal membuat voucher." } },
      { status: 500 }
    );
  }
}
