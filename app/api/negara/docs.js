/**
 * @openapi
 * tags:
 *   - name: Negara
 *     description: Data master negara dengan terjemahan ID/EN, status aktif, dan bendera. List publik; CRUD admin.
 *
 * components:
 *   schemas:
 *     NegaraItem:
 *       type: object
 *       properties:
 *         id: { type: string }
 *         name:
 *           type: string
 *           nullable: true
 *         locale_used:
 *           type: string
 *           nullable: true
 *         is_active:
 *           type: boolean
 *         flag:
 *           type: string
 *           format: uri
 *           nullable: true
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *     NegaraListResponse:
 *       type: object
 *       properties:
 *         message: { type: string }
 *         data:
 *           type: array
 *           items:
 *             $ref: "#/components/schemas/NegaraItem"
 *         meta:
 *           type: object
 *           properties:
 *             page: { type: integer }
 *             perPage: { type: integer }
 *             total: { type: integer }
 *             totalPages: { type: integer }
 *             locale: { type: string }
 *             fallback: { type: string }
 *     NegaraCreateRequest:
 *       type: object
 *       required: [name_id]
 *       properties:
 *         name_id:
 *           type: string
 *           description: Nama negara Bahasa Indonesia (wajib).
 *         name_en:
 *           type: string
 *           nullable: true
 *         is_active:
 *           type: boolean
 *           default: true
 *         flag:
 *           type: string
 *           format: uri
 *           nullable: true
 *           description: Jika upload file, abaikan field ini.
 *         file:
 *           type: string
 *           format: binary
 *           description: Upload bendera (JPEG/PNG/WebP, max 10MB).
 *         autoTranslate:
 *           type: boolean
 *           default: true
 *     NegaraCreateResponse:
 *       type: object
 *       properties:
 *         message: { type: string }
 *         data:
 *           type: object
 *           properties:
 *             id: { type: string }
 *             flag:
 *               type: string
 *               format: uri
 *               nullable: true
 *             name_id: { type: string }
 *             name_en:
 *               type: string
 *               nullable: true
 *             is_active: { type: boolean }
 *
 * /api/negara:
 *   get:
 *     tags: [Negara]
 *     summary: Daftar negara
 *     description: Publik dapat akses list aktif; admin bisa sertakan/lihat inactive.
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: Cari pada nama negara (locale & fallback).
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
 *         description: Berhasil mengambil daftar negara.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/NegaraListResponse"
 *       "500":
 *         description: Gagal memuat data.
 *   post:
 *     tags: [Negara]
 *     summary: Buat negara (admin)
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/NegaraCreateRequest"
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: "#/components/schemas/NegaraCreateRequest"
 *         multipart/form-data:
 *           schema:
 *             allOf:
 *               - $ref: "#/components/schemas/NegaraCreateRequest"
 *               - type: object
 *                 properties:
 *                   file:
 *                     type: string
 *                     format: binary
 *     responses:
 *       "201":
 *         description: Negara berhasil dibuat.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/NegaraCreateResponse"
 *       "400":
 *         description: Validasi gagal (name_id kosong).
 *       "401":
 *         description: Unauthorized.
 *       "403":
 *         description: Forbidden.
 *       "413":
 *         description: File > 10MB.
 *       "415":
 *         description: Tipe file tidak didukung.
 *       "500":
 *         description: Gagal membuat data.
 */

// Anotasi OpenAPI saja; tidak dieksekusi.
