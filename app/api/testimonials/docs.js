/**
 * @openapi
 * tags:
 *   - name: Testimonials
 *     description: Testimonial student/alumni dengan foto 9:16 (publik), kategori opsional, terjemahan ID/EN. Listing publik, mutasi via admin.
 *
 * components:
 *   schemas:
 *     TestimonialCategoryRef:
 *       type: object
 *       properties:
 *         id: { type: string }
 *         slug: { type: string }
 *         name:
 *           type: string
 *           nullable: true
 *     TestimonialItem:
 *       type: object
 *       properties:
 *         id: { type: string }
 *         photo_url:
 *           type: string
 *           nullable: true
 *           description: Bisa berisi URL publik (baru) atau key/path lama.
 *         photo_public_url:
 *           type: string
 *           format: uri
 *           nullable: true
 *           description: URL publik ter-normalisasi; alias image_public_url.
 *         image_public_url:
 *           type: string
 *           format: uri
 *           nullable: true
 *         star:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *           nullable: true
 *         youtube_url:
 *           type: string
 *           format: uri
 *           nullable: true
 *         kampus_negara_tujuan:
 *           type: string
 *           nullable: true
 *           description: Negara tujuan kampus (bila diisi).
 *         name:
 *           type: string
 *           nullable: true
 *         message:
 *           type: string
 *           nullable: true
 *         locale:
 *           type: string
 *           nullable: true
 *           description: Locale yang dipakai untuk name/message (hasil fallback).
 *         category:
 *           $ref: "#/components/schemas/TestimonialCategoryRef"
 *         created_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         updated_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *     TestimonialListResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: array
 *           items:
 *             $ref: "#/components/schemas/TestimonialItem"
 *     TestimonialCreateRequest:
 *       type: object
 *       required: [name, message]
 *       properties:
 *         name:
 *           type: string
 *           description: Wajib (max 191). Locale default id.
 *         message:
 *           type: string
 *           description: Wajib (max 10000).
 *         photo_url:
 *           type: string
 *           description: URL publik gambar (alternatif dari upload file). Salah satu dari `photo_url` atau `file` wajib.
 *         file:
 *           type: string
 *           format: binary
 *           description: File gambar (JPEG/PNG/WebP, max 10MB). Akan di-crop 9:16 WebP dan disimpan publik.
 *         star:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *           description: Opsional rating bintang.
 *         youtube_url:
 *           type: string
 *           format: uri
 *           nullable: true
 *         kampus_negara_tujuan:
 *           type: string
 *           nullable: true
 *           description: Negara tujuan (opsional).
 *         category_id:
 *           type: string
 *           nullable: true
 *           description: ID kategori testimonial.
 *         category_slug:
 *           type: string
 *           nullable: true
 *           description: Alternatif kategori via slug.
 *         locale:
 *           type: string
 *           default: id
 *           description: Locale utama untuk name/message. Akan di-translate ke EN bila locale!=en.
 *     TestimonialUpdateRequest:
 *       type: object
 *       properties:
 *         name: { type: string }
 *         message: { type: string }
 *         photo_url:
 *           type: string
 *           description: URL publik gambar. Kirim null/kosong untuk menghapus foto.
 *         file:
 *           type: string
 *           format: binary
 *           description: File gambar baru (JPEG/PNG/WebP, max 10MB; akan menimpa foto lama).
 *         star:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *           description: Opsional rating bintang.
 *         youtube_url:
 *           type: string
 *           format: uri
 *           nullable: true
 *         kampus_negara_tujuan:
 *           type: string
 *           nullable: true
 *         category_id:
 *           type: string
 *           nullable: true
 *         category_slug:
 *           type: string
 *           nullable: true
 *         locale:
 *           type: string
 *           default: id
 *           description: Locale untuk update name/message jika dikirim.
 *     TestimonialCreateResponse:
 *       type: object
 *       properties:
 *         data:
 *           oneOf:
 *             - $ref: "#/components/schemas/TestimonialItem"
 *             - type: array
 *               items:
 *                 $ref: "#/components/schemas/TestimonialItem"
 *           description: |
 *             Jika input array, respons juga array. Jika input single object, respons object.
 *     TestimonialError:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *
 * /api/testimonials:
 *   get:
 *     tags: [Testimonials]
 *     summary: Daftar testimonials (publik)
 *     parameters:
 *       - in: query
 *         name: locale
 *         schema: { type: string, default: id }
 *         description: Locale utama untuk name/message (fallback ke id).
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 12 }
 *       - in: query
 *         name: category_id
 *         schema: { type: string }
 *       - in: query
 *         name: category_slug
 *         schema: { type: string }
 *       - in: query
 *         name: fields
 *         schema:
 *           type: string
 *           example: image_public_url,name,description
 *         description: |
 *           Jika semua field yang diminta termasuk dalam subset (image/image_public_url/name/description), respons hanya memuat field tersebut untuk payload ringan.
 *     responses:
 *       "200":
 *         description: Berhasil mengambil daftar testimonial.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/TestimonialListResponse"
 *       "500":
 *         description: Server error.
 *   post:
 *     tags: [Testimonials]
 *     summary: Buat testimonial (admin, single atau batch)
 *     security:
 *       - BearerAuth: []
 *     description: |
 *       Terima JSON (single atau array), x-www-form-urlencoded, atau multipart/form-data. Wajib `name`, `message`, dan salah satu `photo_url` atau upload `file`. Gambar akan di-crop 9:16 WebP (max 10MB).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - $ref: "#/components/schemas/TestimonialCreateRequest"
 *               - type: array
 *                 items:
 *                   $ref: "#/components/schemas/TestimonialCreateRequest"
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: "#/components/schemas/TestimonialCreateRequest"
 *         multipart/form-data:
 *           schema:
 *             allOf:
 *               - $ref: "#/components/schemas/TestimonialCreateRequest"
 *               - type: object
 *                 properties:
 *                   file:
 *                     type: string
 *                     format: binary
 *     responses:
 *       "201":
 *         description: Testimonial berhasil dibuat.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/TestimonialCreateResponse"
 *       "400":
 *         description: Validasi dasar gagal (name/message kosong atau tidak ada foto).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/TestimonialError"
 *       "401":
 *         description: Unauthorized (belum login admin).
 *       "403":
 *         description: Forbidden (bukan admin).
 *       "413":
 *         description: File lebih dari 10MB.
 *       "415":
 *         description: Tipe file tidak didukung (hanya JPEG/PNG/WebP).
 *       "422":
 *         description: Star tidak valid atau kategori tidak ditemukan.
 *       "500":
 *         description: Server error / gagal unggah.
 */

// Anotasi OpenAPI saja; tidak dieksekusi.
