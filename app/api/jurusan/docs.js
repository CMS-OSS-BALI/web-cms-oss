/**
 * @openapi
 * tags:
 *   - name: Jurusan
 *     description: Data jurusan/program per college dengan multi-locale, harga opsional, dan relasi kota. List publik; CRUD admin.
 *
 * components:
 *   schemas:
 *     JurusanItem:
 *       type: object
 *       properties:
 *         id: { type: string }
 *         college_id: { type: string }
 *         kota_id:
 *           type: string
 *           nullable: true
 *           description: Legacy kolom (kota pertama).
 *         kota_multi:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               kota_id:
 *                 type: string
 *               kota_name:
 *                 type: string
 *                 nullable: true
 *               kota_locale_used:
 *                 type: string
 *                 nullable: true
 *         harga:
 *           type: number
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
 *     JurusanListResponse:
 *       type: object
 *       properties:
 *         message: { type: string }
 *         data:
 *           type: array
 *           items:
 *             $ref: "#/components/schemas/JurusanItem"
 *         meta:
 *           type: object
 *           properties:
 *             page: { type: integer }
 *             perPage: { type: integer }
 *             total: { type: integer }
 *             totalPages: { type: integer }
 *             locale: { type: string }
 *             fallback: { type: string }
 *     JurusanCreateRequest:
 *       type: object
 *       required: [college_id, name]
 *       properties:
 *         college_id:
 *           type: string
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
 *         kota_id:
 *           oneOf:
 *             - type: string
 *             - type: array
 *               items: { type: string }
 *           description: Bisa single atau array; FK ke kota, disimpan juga di jurusan_kota.
 *         autoTranslate:
 *           type: boolean
 *           default: true
 *           description: Isi otomatis terjemahan EN jika locale bukan EN.
 *     JurusanCreateResponse:
 *       type: object
 *       properties:
 *         message: { type: string }
 *         data:
 *           type: object
 *           properties:
 *             id: { type: string }
 *
 * /api/jurusan:
 *   get:
 *     tags: [Jurusan]
 *     summary: Daftar jurusan
 *     description: Publik bisa akses list. Mendukung filter q, college_id, kota_id (BigInt), soft-delete flags, sort (termasuk by name/harga).
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: Cari pada name/description (locale+fallback).
 *       - in: query
 *         name: college_id
 *         schema: { type: string }
 *       - in: query
 *         name: kota_id
 *         schema: { type: string }
 *         description: BigInt string; bisa filter kota utama (legacy).
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: perPage
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 10 }
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           example: created_at:desc
 *         description: created_at|updated_at|name|harga dengan asc/desc. Sort by name dilakukan di memory setelah translate.
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
 *         description: Berhasil mengambil daftar jurusan.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/JurusanListResponse"
 *       "500":
 *         description: Gagal memuat data.
 *   post:
 *     tags: [Jurusan]
 *     summary: Buat jurusan (admin)
 *     security:
 *       - BearerAuth: []
 *     description: |
 *       Terima JSON, x-www-form-urlencoded, atau multipart form (hanya field teks). `kota_id` boleh single atau array; akan divalidasi FK dan disimpan di jurusan_kota, serta kolom legacy kota_id memakai entri pertama.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/JurusanCreateRequest"
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: "#/components/schemas/JurusanCreateRequest"
 *         multipart/form-data:
 *           schema:
 *             $ref: "#/components/schemas/JurusanCreateRequest"
 *     responses:
 *       "201":
 *         description: Jurusan berhasil dibuat.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/JurusanCreateResponse"
 *       "400":
 *         description: Validasi gagal (college_id/name wajib, harga negatif, kota_id kosong).
 *       "401":
 *         description: Unauthorized.
 *       "403":
 *         description: Forbidden.
 *       "422":
 *         description: FK kota/college tidak ditemukan.
 *       "500":
 *         description: Gagal membuat data.
 */

// Anotasi OpenAPI saja; tidak dieksekusi.
