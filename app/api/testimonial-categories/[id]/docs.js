/**
 * @openapi
 * tags:
 *   - name: Testimonial Categories
 *     description: Kategori testimonial bilingual (ID/EN) dengan slug unik. Listing publik; CRUD butuh sesi admin.
 *
 * /api/testimonial-categories/{id}:
 *   get:
 *     tags: [Testimonial Categories]
 *     summary: Detail kategori testimonial
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: ID kategori.
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
 *     tags: [Testimonial Categories]
 *     summary: Perbarui kategori testimonial (admin)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: ID kategori.
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
 *     tags: [Testimonial Categories]
 *     summary: Hapus kategori testimonial (admin, hard delete)
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

// Anotasi OpenAPI saja; tidak dieksekusi.
