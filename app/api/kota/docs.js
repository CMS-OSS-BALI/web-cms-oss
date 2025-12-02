/**
 * @openapi
 * tags:
 *   - name: Kota
 *     description: Data master kota dengan terjemahan ID/EN, status aktif, dan relasi negara. List publik; CRUD admin.
 *
 * components:
 *   schemas:
 *     KotaItem:
 *       type: object
 *       properties:
 *         id: { type: string }
 *         negara_id:
 *           type: string
 *         name:
 *           type: string
 *           nullable: true
 *         locale_used:
 *           type: string
 *           nullable: true
 *         is_active:
 *           type: boolean
 *         living_cost:
 *           type: number
 *           nullable: true
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *         negara_name:
 *           type: string
 *           nullable: true
 *         negara_locale_used:
 *           type: string
 *           nullable: true
 *     KotaListResponse:
 *       type: object
 *       properties:
 *         message: { type: string }
 *         data:
 *           type: array
 *           items:
 *             $ref: "#/components/schemas/KotaItem"
 *         meta:
 *           type: object
 *           properties:
 *             page: { type: integer }
 *             perPage: { type: integer }
 *             total: { type: integer }
 *             totalPages: { type: integer }
 *             locale: { type: string }
 *             fallback: { type: string }
 *             negara_id:
 *               type: string
 *               nullable: true
 *     KotaCreateRequest:
 *       type: object
 *       required: [negara_id, name_id]
 *       properties:
 *         negara_id:
 *           type: string
 *           description: ID negara (BigInt string) wajib.
 *         name_id:
 *           type: string
 *           description: Nama kota Bahasa Indonesia (wajib).
 *         name_en:
 *           type: string
 *           nullable: true
 *         is_active:
 *           type: boolean
 *           default: true
 *         living_cost:
 *           type: number
 *           nullable: true
 *         autoTranslate:
 *           type: boolean
 *           default: true
 *           description: Isi otomatis terjemahan EN jika name_en kosong.
 *     KotaCreateResponse:
 *       type: object
 *       properties:
 *         message: { type: string }
 *         data:
 *           type: object
 *           properties:
 *             id: { type: string }
 *             negara_id: { type: string }
 *             living_cost:
 *               type: number
 *               nullable: true
 *             name_id: { type: string }
 *             name_en:
 *               type: string
 *               nullable: true
 *             is_active: { type: boolean }
 *
 * /api/kota:
 *   get:
 *     tags: [Kota]
 *     summary: Daftar kota
 *     description: Publik dapat akses list aktif; admin bisa sertakan/lihat inactive dan filter negara.
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: Cari pada nama kota (locale & fallback).
 *       - in: query
 *         name: negara_id
 *         schema: { type: string }
 *         description: BigInt string; filter berdasarkan negara.
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
 *         schema: { type: integer, minimum: 1, maximum: 200, default: 100 }
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           example: name:asc
 *         description: name|created_at|updated_at dengan asc/desc (lihat buildGeoOrderBy).
 *       - in: query
 *         name: with_inactive
 *         schema: { type: string, enum: ["0", "1"] }
 *         description: Sertakan data tidak aktif (admin).
 *       - in: query
 *         name: only_inactive
 *         schema: { type: string, enum: ["0", "1"] }
 *         description: Hanya data tidak aktif (admin).
 *     responses:
 *       "200":
 *         description: Berhasil mengambil daftar kota.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/KotaListResponse"
 *       "500":
 *         description: Gagal memuat data.
 *   post:
 *     tags: [Kota]
 *     summary: Buat kota (admin)
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/KotaCreateRequest"
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: "#/components/schemas/KotaCreateRequest"
 *         multipart/form-data:
 *           schema:
 *             $ref: "#/components/schemas/KotaCreateRequest"
 *     responses:
 *       "201":
 *         description: Kota berhasil dibuat.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/KotaCreateResponse"
 *       "400":
 *         description: Validasi gagal (name_id kosong).
 *       "401":
 *         description: Unauthorized.
 *       "403":
 *         description: Forbidden.
 *       "422":
 *         description: negara_id tidak ditemukan.
 *       "500":
 *         description: Gagal membuat data.
 */

// Anotasi OpenAPI saja; tidak dieksekusi.
