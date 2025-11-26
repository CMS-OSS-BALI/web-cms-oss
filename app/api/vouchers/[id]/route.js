// app/api/vouchers/[id]/route.js
import prisma from "@/lib/prisma";
import {
  json,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  assertAdmin,
  readBodyFlexible,
  sanitizeCode,
  toInt,
  toDate,
  toBool,
  toTs,
} from "../_utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* ===== GET detail (admin) ===== */
export async function GET(req, { params }) {
  try {
    await assertAdmin(req);
  } catch (err) {
    const status = err?.status || 401;
    if (status === 401) return unauthorized();
    if (status === 403) return forbidden();
    return unauthorized();
  }

  try {
    const v = await prisma.vouchers.findUnique({
      where: { id: params?.id },
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
    if (!v) return notFound();

    return json({
      message: "OK",
      data: {
        ...v,
        created_ts: toTs(v.created_at),
        updated_ts: toTs(v.updated_at),
        valid_from_ts: toTs(v.valid_from),
        valid_to_ts: toTs(v.valid_to),
      },
    });
  } catch (err) {
    console.error(`GET /api/vouchers/${params?.id} error:`, err);
    return json(
      { error: { code: "SERVER_ERROR", message: "Gagal memuat voucher." } },
      { status: 500 }
    );
  }
}

/* ===== PATCH update (admin) ===== */
export async function PATCH(req, { params }) {
  try {
    await assertAdmin(req);
  } catch (err) {
    const status = err?.status || 401;
    if (status === 401) return unauthorized();
    if (status === 403) return forbidden();
    return unauthorized();
  }

  try {
    const id = params?.id;
    const body = await readBodyFlexible(req);

    const current = await prisma.vouchers.findUnique({
      where: { id },
      select: {
        type: true,
        value: true,
        max_discount: true,
        valid_from: true,
        valid_to: true,
      },
    });
    if (!current) return notFound();

    const data = {};

    if ("code" in body) {
      const code = sanitizeCode(body.code);
      if (!code) return badRequest("code tidak boleh kosong", "code");
      data.code = code;
    }
    if ("type" in body) {
      const t = String(body.type || "").toUpperCase();
      data.type = t === "PERCENT" ? "PERCENT" : "FIXED";
    }
    if ("value" in body) {
      const v = toInt(body.value, null);
      if (v == null) return badRequest("value wajib diisi", "value");
      data.value = v;
    }
    if ("max_discount" in body) {
      const md = toInt(body.max_discount, null);
      if (md != null && md < 0)
        return badRequest("max_discount harus >= 0 atau null", "max_discount");
      data.max_discount = md;
    }
    if ("is_active" in body) {
      const p = toBool(body.is_active);
      if (typeof p === "boolean") data.is_active = p;
    }
    if ("max_uses" in body) {
      const mu = toInt(body.max_uses, null);
      if (mu != null && mu < 0)
        return badRequest("max_uses harus >= 0 atau null", "max_uses");
      data.max_uses = mu;
    }
    if ("valid_from" in body || "valid_to" in body) {
      const vf =
        "valid_from" in body
          ? body.valid_from
            ? toDate(body.valid_from)
            : null
          : undefined;
      const vt =
        "valid_to" in body
          ? body.valid_to
            ? toDate(body.valid_to)
            : null
          : undefined;
      if (vf !== undefined) data.valid_from = vf;
      if (vt !== undefined) data.valid_to = vt;

      const fromC = vf !== undefined ? vf : current.valid_from ?? null;
      const toC = vt !== undefined ? vt : current.valid_to ?? null;
      if (fromC && toC && toC < fromC)
        return badRequest("valid_to harus >= valid_from", "valid_to");
    }
    if ("event_id" in body) {
      const evId = String(body.event_id || "").trim();
      data.event_id = evId || null;
    }

    // kombinasi akhir
    const t = data.type || current.type;
    const v = "value" in data ? data.value : current.value;
    const md =
      "max_discount" in data ? data.max_discount : current.max_discount;

    if (t === "FIXED") {
      if (v < 0) return badRequest("value (FIXED) harus >= 0", "value");
      data.max_discount = null;
    } else {
      if (v < 1 || v > 100)
        return badRequest("value (PERCENT) harus 1..100", "value");
      if (md != null && md < 0)
        return badRequest("max_discount harus >= 0 atau null", "max_discount");
    }

    if (Object.keys(data).length === 0) {
      const exists = await prisma.vouchers.findUnique({ where: { id } });
      if (!exists) return notFound();
      return json({ message: "Tidak ada perubahan.", data: exists });
    }

    data.updated_at = new Date();
    const updated = await prisma.vouchers.update({
      where: { id },
      data,
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

    return json({
      message: "Voucher diperbarui.",
      data: {
        ...updated,
        created_ts: toTs(updated.created_at),
        updated_ts: toTs(updated.updated_at),
        valid_from_ts: toTs(updated.valid_from),
        valid_to_ts: toTs(updated.valid_to),
      },
    });
  } catch (err) {
    if (
      err?.code === "P2002" &&
      String(err?.meta?.target || "").includes("code")
    ) {
      return json(
        {
          error: {
            code: "CONFLICT",
            message: "Gagal memperbarui data: kode voucher sudah digunakan.",
            field: "code",
          },
        },
        { status: 409 }
      );
    }
    if (err?.code === "P2025") return notFound();
    console.error(`PATCH /api/vouchers/${params?.id} error:`, err);
    return json(
      {
        error: { code: "SERVER_ERROR", message: "Gagal memperbarui voucher." },
      },
      { status: 500 }
    );
  }
}

/* ===== DELETE → nonaktifkan (soft) ===== */
export async function DELETE(req, { params }) {
  try {
    await assertAdmin(req);
  } catch (err) {
    const status = err?.status || 401;
    if (status === 401) return unauthorized();
    if (status === 403) return forbidden();
    return unauthorized();
  }

  try {
    const up = await prisma.vouchers.update({
      where: { id: params?.id },
      data: { is_active: false, updated_at: new Date() },
      select: { id: true, is_active: true, updated_at: true },
    });
    return json({
      message: "Voucher dinonaktifkan.",
      data: { ...up, updated_ts: toTs(up.updated_at) },
    });
  } catch (err) {
    if (err?.code === "P2025") return notFound();
    console.error(`DELETE /api/vouchers/${params?.id} error:`, err);
    return json(
      {
        error: {
          code: "SERVER_ERROR",
          message: "Gagal menonaktifkan voucher.",
        },
      },
      { status: 500 }
    );
  }
}
