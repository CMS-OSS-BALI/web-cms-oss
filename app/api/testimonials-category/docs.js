/**
 * @openapi
 * tags:
 *   - name: Testimonials Category
 *     description: Alias ke /api/testimonial-categories (endpoint lama tetap didukung). Gunakan skema yang sama dengan Testimonial Categories.
 *
 * /api/testimonials-category:
 *   get:
 *     tags: [Testimonials Category]
 *     summary: Daftar kategori testimonial (alias)
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
 *     tags: [Testimonials Category]
 *     summary: Buat kategori testimonial (alias, admin)
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

// Anotasi OpenAPI alias; gunakan skema di /api/testimonial-categories.
