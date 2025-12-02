/**
 * @openapi
 * tags:
 *   - name: Jenjang Master
 *     description: Data master jenjang (kode + terjemahan ID/EN). List publik; CRUD admin.
 *
 * components:
 *   schemas:
 *     JenjangItem:
 *       type: object
 *       properties:
 *         id: { type: string }
 *         code:
 *           type: string
 *         name:
 *           type: string
 *           nullable: true
 *         description:
 *           type: string
 *           nullable: true
 *         locale_used:
 *           type: string
 *           nullable: true
 *         sort:
 *           type: integer
 *         is_active:
 *           type: boolean
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *         created_ts:
 *           type: integer
 *           nullable: true
 *         updated_ts:
 *           type: integer
 *           nullable: true
 *     JenjangListResponse:
 *       type: object
 *       properties:
 *         message: { type: string }
 *         data:
 *           type: array
 *           items:
 *             $ref: "#/components/schemas/JenjangItem"
 *         meta:
 *           type: object
 *           properties:
 *             page: { type: integer }
 *             perPage: { type: integer }
 *             total: { type: integer }
 *             totalPages: { type: integer }
 *             locale: { type: string }
 *             fallback: { type: string }
 *     JenjangCreateRequest:
 *       type: object
 *       required: [code, name_id]
 *       properties:
 *         code:
 *           type: string
 *           description: Kode unik jenjang (maks 32).
 *         name_id:
 *           type: string
 *           description: Nama Bahasa Indonesia (wajib).
 *         description_id:
 *           type: string
 *           nullable: true
 *         name_en:
 *           type: string
 *           nullable: true
 *         description_en:
 *           type: string
 *           nullable: true
 *         sort:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         is_active:
 *           type: boolean
 *           default: true
 *         autoTranslate:
 *           type: boolean
 *           default: true
 *           description: Isi otomatis terjemahan EN jika field EN kosong.
 *     JenjangCreateResponse:
 *       type: object
 *       properties:
 *         message: { type: string }
 *         data:
 *           type: object
 *           properties:
 *             id: { type: string }
 *             code: { type: string }
 *             sort: { type: integer }
 *             is_active: { type: boolean }
 *             name_id: { type: string }
 *             description_id:
 *               type: string
 *               nullable: true
 *             name_en:
 *               type: string
 *               nullable: true
 *             description_en:
 *               type: string
 *               nullable: true
 *
 * /api/jenjang-master:
 *   get:
 *     tags: [Jenjang Master]
 *     summary: Daftar jenjang
 *     description: Pencarian teks + filter active/inactive. Terjemahan mengikuti locale/fallback.
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: Cari pada name/description (locale & fallback).
 *       - in: query
 *         name: locale
 *         schema: { type: string, default: id }
 *       - in: query
 *         name: fallback
 *         schema: { type: string, default: id }
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: perPage
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           example: sort:asc
 *         description: sort|created_at|updated_at dengan asc/desc (lihat util buildOrderBy).
 *       - in: query
 *         name: with_inactive
 *         schema: { type: string, enum: ["0", "1"] }
 *         description: Sertakan data inactive.
 *       - in: query
 *         name: only_inactive
 *         schema: { type: string, enum: ["0", "1"] }
 *         description: Hanya data inactive.
 *     responses:
 *       "200":
 *         description: Berhasil mengambil daftar jenjang.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/JenjangListResponse"
 *       "500":
 *         description: Gagal memuat data.
 *   post:
 *     tags: [Jenjang Master]
 *     summary: Buat jenjang (admin)
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/JenjangCreateRequest"
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: "#/components/schemas/JenjangCreateRequest"
 *         multipart/form-data:
 *           schema:
 *             $ref: "#/components/schemas/JenjangCreateRequest"
 *     responses:
 *       "201":
 *         description: Jenjang berhasil dibuat.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/JenjangCreateResponse"
 *       "400":
 *         description: Validasi gagal (kode kosong/panjang, nama kosong, sort negatif).
 *       "401":
 *         description: Unauthorized.
 *       "403":
 *         description: Forbidden.
 *       "409":
 *         description: Kode jenjang sudah digunakan.
 *       "500":
 *         description: Gagal membuat data.
 */

// Anotasi OpenAPI saja; tidak dieksekusi.
