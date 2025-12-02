/**
 * @openapi
 * tags:
 *   - name: Mitra Dalam Negeri Categories
 *     description: Kategori mitra dalam negeri (multi-locale, soft delete admin).
 *
 * components:
 *   schemas:
 *     MitraCategoryItem:
 *       type: object
 *       properties:
 *         id: { type: string }
 *         slug: { type: string }
 *         sort: { type: integer }
 *         created_at: { type: string, format: date-time }
 *         updated_at: { type: string, format: date-time }
 *         deleted_at:
 *           type: string
 *           format: date-time
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
 *     MitraCategoryListResponse:
 *       type: object
 *       properties:
 *         message: { type: string }
 *         data:
 *           type: array
 *           items:
 *             $ref: "#/components/schemas/MitraCategoryItem"
 *         meta:
 *           type: object
 *           properties:
 *             page: { type: integer }
 *             perPage: { type: integer }
 *             total: { type: integer }
 *             totalPages: { type: integer }
 *             locale: { type: string }
 *             fallback: { type: string }
 *     MitraCategoryCreateRequest:
 *       type: object
 *       required: [name_id]
 *       properties:
 *         name_id:
 *           type: string
 *           description: Nama kategori Bahasa Indonesia (wajib).
 *         description_id:
 *           type: string
 *           nullable: true
 *         name_en:
 *           type: string
 *           nullable: true
 *         description_en:
 *           type: string
 *           nullable: true
 *         slug:
 *           type: string
 *           description: Kosongkan untuk auto-slugify dari name_id.
 *         sort:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         autoTranslate:
 *           type: boolean
 *           default: true
 *           description: Isi EN otomatis jika field EN kosong.
 *     MitraCategoryCreateResponse:
 *       type: object
 *       properties:
 *         message: { type: string }
 *         data:
 *           type: object
 *           properties:
 *             id: { type: string }
 *             slug: { type: string }
 *             sort: { type: integer }
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
 * /api/mitra-dalam-negeri-categories:
 *   get:
 *     tags: [Mitra Dalam Negeri Categories]
 *     summary: Daftar kategori mitra (publik; admin bisa lihat soft-delete)
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: Cari pada name/description locale aktif.
 *       - in: query
 *         name: locale
 *         schema: { type: string, default: id }
 *       - in: query
 *         name: fallback
 *         schema: { type: string, default: en }
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
 *           example: sort:asc
 *         description: sort|created_at|updated_at dengan asc/desc.
 *       - in: query
 *         name: with_deleted
 *         schema: { type: string, enum: ["0", "1"] }
 *         description: Sertakan soft-delete (admin).
 *       - in: query
 *         name: only_deleted
 *         schema: { type: string, enum: ["0", "1"] }
 *         description: Hanya soft-delete (admin).
 *     responses:
 *       "200":
 *         description: Berhasil mengambil daftar kategori.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/MitraCategoryListResponse"
 *       "500":
 *         description: Gagal memuat data.
 *   post:
 *     tags: [Mitra Dalam Negeri Categories]
 *     summary: Buat kategori mitra (admin)
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/MitraCategoryCreateRequest"
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: "#/components/schemas/MitraCategoryCreateRequest"
 *         multipart/form-data:
 *           schema:
 *             $ref: "#/components/schemas/MitraCategoryCreateRequest"
 *     responses:
 *       "201":
 *         description: Kategori berhasil dibuat.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/MitraCategoryCreateResponse"
 *       "400":
 *         description: Validasi gagal (nama/slug tidak valid).
 *       "401":
 *         description: Unauthorized.
 *       "403":
 *         description: Forbidden.
 *       "409":
 *         description: Slug sudah digunakan.
 *       "500":
 *         description: Gagal membuat data.
 */

// Anotasi OpenAPI saja; tidak dieksekusi.
