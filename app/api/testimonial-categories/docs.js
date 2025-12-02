/**
 * @openapi
 * tags:
 *   - name: Testimonial Categories
 *     description: Kategori testimonial bilingual (ID/EN) dengan slug unik. Listing publik; CRUD butuh sesi admin.
 *
 * components:
 *   schemas:
 *     TestimonialCategoryItem:
 *       type: object
 *       properties:
 *         id: { type: string }
 *         slug: { type: string }
 *         name:
 *           type: string
 *           nullable: true
 *         locale_used:
 *           type: string
 *           nullable: true
 *           description: Locale yang dipakai untuk field name (hasil fallback).
 *         created_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         updated_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         created_ts:
 *           type: integer
 *           nullable: true
 *         updated_ts:
 *           type: integer
 *           nullable: true
 *     TestimonialCategoryListResponse:
 *       type: object
 *       properties:
 *         message: { type: string, example: "OK" }
 *         data:
 *           type: array
 *           items:
 *             $ref: "#/components/schemas/TestimonialCategoryItem"
 *         meta:
 *           type: object
 *           properties:
 *             locale: { type: string, example: id }
 *             fallback: { type: string, example: id }
 *     TestimonialCategoryCreateRequest:
 *       type: object
 *       properties:
 *         slug:
 *           type: string
 *           description: Kosongkan untuk auto-slugify dari name; huruf kecil/angka/dash saja.
 *         name:
 *           type: string
 *           description: Nama kategori di locale yang dikirim (atau `locale` default id). Salah satu dari slug atau name wajib ada.
 *         name_id:
 *           type: string
 *           description: Alias khusus untuk nama Indonesia; menimpa `name` jika locale=id.
 *         name_en:
 *           type: string
 *           description: Alias khusus untuk nama Inggris; menimpa `name` jika locale=en.
 *         locale:
 *           type: string
 *           default: id
 *           description: Locale utama untuk penulisan name (id/en).
 *         autoTranslate:
 *           type: boolean
 *           default: true
 *           description: Jika true, sistem menerjemahkan name ke locale pasangan (id<->en) bila tersedia.
 *     TestimonialCategoryCreateResponse:
 *       type: object
 *       properties:
 *         message: { type: string }
 *         data:
 *           type: object
 *           properties:
 *             id: { type: string }
 *             slug: { type: string }
 *             created_at:
 *               type: string
 *               format: date-time
 *               nullable: true
 *             updated_at:
 *               type: string
 *               format: date-time
 *               nullable: true
 *             created_ts:
 *               type: integer
 *               nullable: true
 *             updated_ts:
 *               type: integer
 *               nullable: true
 *     TestimonialCategoryError:
 *       type: object
 *       properties:
 *         error:
 *           type: object
 *           properties:
 *             code:
 *               type: string
 *               example: BAD_REQUEST
 *             message:
 *               type: string
 *             field:
 *               type: string
 *               nullable: true
 *             hint:
 *               type: string
 *               nullable: true
 *
 * /api/testimonial-categories:
 *   get:
 *     tags: [Testimonial Categories]
 *     summary: Daftar kategori testimonial (publik)
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: Cari pada nama (locale + fallback).
 *       - in: query
 *         name: locale
 *         schema: { type: string, default: id }
 *         description: Locale utama untuk nama.
 *       - in: query
 *         name: fallback
 *         schema: { type: string, default: id }
 *         description: Locale fallback jika terjemahan utama tidak ada.
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           example: slug:asc
 *         description: Urutkan dengan slug|created_at|updated_at + arah asc/desc.
 *     responses:
 *       "200":
 *         description: Berhasil mengambil daftar kategori testimonial.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/TestimonialCategoryListResponse"
 *       "500":
 *         description: Gagal memuat data.
 *   post:
 *     tags: [Testimonial Categories]
 *     summary: Buat kategori testimonial (admin)
 *     security:
 *       - BearerAuth: []
 *     description: Terima JSON/x-www-form-urlencoded/multipart. Wajib salah satu dari `slug` atau `name`. `autoTranslate=true` akan mengisi locale pasangan (id<->en).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/TestimonialCategoryCreateRequest"
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: "#/components/schemas/TestimonialCategoryCreateRequest"
 *         multipart/form-data:
 *           schema:
 *             $ref: "#/components/schemas/TestimonialCategoryCreateRequest"
 *     responses:
 *       "201":
 *         description: Kategori testimonial berhasil dibuat.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/TestimonialCategoryCreateResponse"
 *       "400":
 *         description: Validasi gagal (slug/name kosong atau slug tidak valid).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/TestimonialCategoryError"
 *       "401":
 *         description: Unauthorized (belum login admin).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/TestimonialCategoryError"
 *       "403":
 *         description: Forbidden (bukan admin).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/TestimonialCategoryError"
 *       "409":
 *         description: Slug sudah digunakan.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/TestimonialCategoryError"
 *       "500":
 *         description: Gagal membuat data.
 */

// Anotasi OpenAPI saja; tidak dieksekusi.
