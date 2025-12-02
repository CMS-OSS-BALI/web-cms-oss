/**
 * @openapi
 * tags:
 *   - name: Services
 *     description: Layanan (B2B/B2C) dengan multi-locale, kategori, gambar, dan publikasi. List publik; CRUD admin.
 *
 * components:
 *   schemas:
 *     ServiceCategoryRef:
 *       type: object
 *       properties:
 *         id: { type: string }
 *         slug: { type: string }
 *         name: { type: string, nullable: true }
 *     ServiceItem:
 *       type: object
 *       properties:
 *         id: { type: string }
 *         admin_user_id: { type: string, nullable: true }
 *         image_url:
 *           type: string
 *           format: uri
 *           nullable: true
 *         image_public_url:
 *           type: string
 *           format: uri
 *           nullable: true
 *         image_resolved_url:
 *           type: string
 *           format: uri
 *           nullable: true
 *         service_type:
 *           type: string
 *           enum: [B2B, B2C]
 *         category:
 *           $ref: "#/components/schemas/ServiceCategoryRef"
 *           nullable: true
 *         price:
 *           type: integer
 *           nullable: true
 *         phone:
 *           type: string
 *           nullable: true
 *         is_published:
 *           type: boolean
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *         locale_used:
 *           type: string
 *           nullable: true
 *         name:
 *           type: string
 *           nullable: true
 *         description:
 *           type: string
 *           nullable: true
 *     ServiceListResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: array
 *           items:
 *             $ref: "#/components/schemas/ServiceItem"
 *         meta:
 *           type: object
 *           properties:
 *             page: { type: integer }
 *             perPage: { type: integer }
 *             total: { type: integer }
 *             totalPages: { type: integer }
 *     ServiceCreateRequest:
 *       type: object
 *       required: [name_id, service_type]
 *       properties:
 *         name_id:
 *           type: string
 *         description_id:
 *           type: string
 *           nullable: true
 *         name_en:
 *           type: string
 *           nullable: true
 *         description_en:
 *           type: string
 *           nullable: true
 *         service_type:
 *           type: string
 *           enum: [B2B, B2C]
 *         category_id:
 *           type: string
 *           nullable: true
 *         category_slug:
 *           type: string
 *           nullable: true
 *         price:
 *           type: integer
 *           nullable: true
 *           description: Harus >=0 jika diisi; null untuk kosong.
 *         phone:
 *           type: string
 *           nullable: true
 *         is_published:
 *           type: boolean
 *           default: false
 *         autoTranslate:
 *           type: boolean
 *           default: true
 *           description: Isi otomatis terjemahan EN jika field EN kosong.
 *         image_url:
 *           type: string
 *           format: uri
 *           nullable: true
 *           description: Jika upload file, abaikan field ini.
 *         file:
 *           type: string
 *           format: binary
 *           description: Upload gambar (JPEG/PNG/WebP, max 10MB).
 *     ServiceCreateResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: object
 *           properties:
 *             id: { type: string }
 *
 * /api/services:
 *   get:
 *     tags: [Services]
 *     summary: Daftar layanan
 *     description: Publik dapat mengambil list layanan published; admin dapat melihat semua jika memakai filter. Mendukung mode minimal fields via query `fields=image,name`.
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: Cari pada name/description (locale+fallback).
 *       - in: query
 *         name: service_type
 *         schema:
 *           type: string
 *           enum: [B2B, B2C]
 *       - in: query
 *         name: published
 *         schema:
 *           type: string
 *           enum: ["0", "1", "true", "false"]
 *       - in: query
 *         name: category_id
 *         schema: { type: string }
 *       - in: query
 *         name: category_slug
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
 *         description: created_at|updated_at|price dengan asc/desc.
 *       - in: query
 *         name: locale
 *         schema: { type: string, default: id }
 *       - in: query
 *         name: fallback
 *         schema: { type: string, default: id }
 *       - in: query
 *         name: fields
 *         schema:
 *           type: string
 *         description: Comma-separated; jika hanya subset image/name/description, respons minimal.
 *     responses:
 *       "200":
 *         description: Berhasil mengambil daftar layanan.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ServiceListResponse"
 *       "500":
 *         description: Gagal memuat data.
 *   post:
 *     tags: [Services]
 *     summary: Buat layanan (admin)
 *     security:
 *       - BearerAuth: []
 *     description: |
 *       Terima JSON, x-www-form-urlencoded, atau multipart (file gambar). `category_id` atau `category_slug` opsional; harga boleh null atau >=0. Auto-translate jika field EN kosong.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/ServiceCreateRequest"
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: "#/components/schemas/ServiceCreateRequest"
 *         multipart/form-data:
 *           schema:
 *             allOf:
 *               - $ref: "#/components/schemas/ServiceCreateRequest"
 *               - type: object
 *                 properties:
 *                   file:
 *                     type: string
 *                     format: binary
 *     responses:
 *       "201":
 *         description: Layanan berhasil dibuat.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ServiceCreateResponse"
 *       "400":
 *         description: Validasi gagal (name kosong, service_type tidak valid, harga negatif).
 *       "401":
 *         description: Unauthorized.
 *       "403":
 *         description: Forbidden.
 *       "413":
 *         description: File > 10MB.
 *       "415":
 *         description: Tipe file tidak didukung.
 *       "422":
 *         description: Kategori tidak ditemukan.
 *       "500":
 *         description: Gagal membuat data.
 */

// Anotasi OpenAPI saja; tidak dieksekusi.
