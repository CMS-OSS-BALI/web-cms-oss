/**
 * @openapi
 * tags:
 *   - name: Testimonials Category
 *     description: Alias ke /api/testimonial-categories/{id}. Gunakan skema yang sama dengan Testimonial Categories.
 *
 * /api/testimonials-category/{id}:
 *   get:
 *     tags: [Testimonials Category]
 *     summary: Detail kategori testimonial (alias)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: locale
 *         schema: { type: string, default: id }
 *         description: Locale utama untuk nama.
 *       - in: query
 *         name: fallback
 *         schema: { type: string, default: id }
 *         description: Locale fallback jika terjemahan utama tidak ada.
 *     responses:
 *       "200":
 *         description: Berhasil mengambil detail kategori testimonial.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "OK" }
 *                 data:
 *                   $ref: "#/components/schemas/TestimonialCategoryItem"
 *       "404":
 *         description: Data tidak ditemukan.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/TestimonialCategoryError"
 *       "500":
 *         description: Gagal memuat data.
 *   put:
 *     tags: [Testimonials Category]
 *     summary: Perbarui kategori testimonial (alias, admin)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: locale
 *         schema: { type: string, default: id }
 *         description: Locale utama untuk update name jika tidak dikirim di body.
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
 *       "200":
 *         description: Kategori testimonial berhasil diperbarui.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *                 data:
 *                   $ref: "#/components/schemas/TestimonialCategoryItem"
 *       "400":
 *         description: Validasi gagal (slug tidak valid).
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
 *       "404":
 *         description: Data tidak ditemukan.
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
 *         description: Gagal memperbarui data.
 *   delete:
 *     tags: [Testimonials Category]
 *     summary: Hapus kategori testimonial (alias, admin)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       "200":
 *         description: Kategori testimonial berhasil dihapus.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *                 data:
 *                   type: object
 *                   properties:
 *                     id: { type: string }
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
 *       "404":
 *         description: Data tidak ditemukan.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/TestimonialCategoryError"
 *       "500":
 *         description: Gagal menghapus data.
 */

// Anotasi OpenAPI alias; gunakan skema di /api/testimonial-categories/{id}.
