/**
 * @openapi
 * tags:
 *   - name: Prodi
 *     description: Data program studi per jurusan/college dengan multi-locale, harga opsional, dan in_take. List publik; CRUD admin.
 *
 * components:
 *   schemas:
 *     ProdiItem:
 *       type: object
 *       properties:
 *         id: { type: string }
 *         jurusan_id:
 *           type: string
 *           nullable: true
 *         college_id:
 *           type: string
 *           nullable: true
 *         name:
 *           type: string
 *           nullable: true
 *         description:
 *           type: string
 *           nullable: true
 *         locale_used:
 *           type: string
 *           nullable: true
 *         harga:
 *           type: number
 *           nullable: true
 *         in_take:
 *           type: string
 *           nullable: true
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *         deleted_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         created_ts:
 *           type: integer
 *           nullable: true
 *         updated_ts:
 *           type: integer
 *           nullable: true
 *     ProdiListResponse:
 *       type: object
 *       properties:
 *         message: { type: string }
 *         data:
 *           type: array
 *           items:
 *             $ref: "#/components/schemas/ProdiItem"
 *         meta:
 *           type: object
 *           properties:
 *             page: { type: integer }
 *             perPage: { type: integer }
 *             total: { type: integer }
 *             totalPages: { type: integer }
 *             locale: { type: string }
 *             fallback: { type: string }
 *     ProdiCreateRequest:
 *       type: object
 *       required: [name]
 *       properties:
 *         jurusan_id:
 *           type: string
 *           nullable: true
 *         college_id:
 *           type: string
 *           nullable: true
 *           description: Akan di-derive dari jurusan_id jika tidak diisi.
 *         name:
 *           type: string
 *           description: Nama sesuai locale input (default id).
 *         description:
 *           type: string
 *           nullable: true
 *         locale:
 *           type: string
 *           default: id
 *         harga:
 *           type: number
 *           nullable: true
 *         in_take:
 *           type: string
 *           nullable: true
 *         autoTranslate:
 *           type: boolean
 *           default: true
 *           description: Isi otomatis terjemahan EN jika locale bukan EN.
 *     ProdiCreateResponse:
 *       type: object
 *       properties:
 *         message: { type: string }
 *         data:
 *           type: object
 *           properties:
 *             id: { type: string }
 *
 * /api/prodi:
 *   get:
 *     tags: [Prodi]
 *     summary: Daftar prodi
 *     description: Publik bisa akses list. Mendukung filter q, jurusan_id, soft-delete flags, dan sort (created_at/updated_at/harga; name di-sort in-memory).
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: Cari pada name/description (locale+fallback).
 *       - in: query
 *         name: jurusan_id
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: perPage
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 12 }
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           example: created_at:desc
 *         description: created_at|updated_at|name|harga dengan asc/desc (name di-sort in-memory setelah terjemahan).
 *       - in: query
 *         name: locale
 *         schema: { type: string, default: id }
 *       - in: query
 *         name: fallback
 *         schema: { type: string, default: id }
 *       - in: query
 *         name: with_deleted
 *         schema: { type: string, enum: ["0", "1"] }
 *       - in: query
 *         name: only_deleted
 *         schema: { type: string, enum: ["0", "1"] }
 *     responses:
 *       "200":
 *         description: Berhasil mengambil daftar prodi.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ProdiListResponse"
 *       "500":
 *         description: Gagal memuat data.
 *   post:
 *     tags: [Prodi]
 *     summary: Buat prodi (admin)
 *     security:
 *       - BearerAuth: []
 *     description: |
 *       Terima JSON, x-www-form-urlencoded, atau multipart form (hanya field teks). `jurusan_id` jika diisi akan mengisi `college_id` otomatis; jika tidak, `college_id` bisa diisi manual. `harga` boleh null atau ≥ 0.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/ProdiCreateRequest"
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: "#/components/schemas/ProdiCreateRequest"
 *         multipart/form-data:
 *           schema:
 *             $ref: "#/components/schemas/ProdiCreateRequest"
 *     responses:
 *       "201":
 *         description: Prodi berhasil dibuat.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ProdiCreateResponse"
 *       "400":
 *         description: Validasi gagal (name kosong, harga negatif, jurusan/college tidak valid).
 *       "401":
 *         description: Unauthorized.
 *       "403":
 *         description: Forbidden.
 *       "422":
 *         description: FK jurusan/college tidak ditemukan.
 *       "500":
 *         description: Gagal membuat data.
 */

// Anotasi OpenAPI saja; tidak dieksekusi.
