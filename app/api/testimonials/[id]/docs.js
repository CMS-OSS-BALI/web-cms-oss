/**
 * @openapi
 * tags:
 *   - name: Testimonials
 *     description: Testimonial student/alumni dengan foto 9:16 (publik), kategori opsional, terjemahan ID/EN. Listing publik, mutasi via admin.
 *
 * /api/testimonials/{id}:
 *   get:
 *     tags: [Testimonials]
 *     summary: Detail testimonial (publik)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: locale
 *         schema: { type: string, default: id }
 *         description: Locale utama untuk name/message (fallback ke id).
 *     responses:
 *       "200":
 *         description: Berhasil mengambil detail testimonial.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: "#/components/schemas/TestimonialItem"
 *       "404":
 *         description: Tidak ditemukan / telah dihapus.
 *       "500":
 *         description: Server error.
 *   put:
 *     tags: [Testimonials]
 *     summary: Perbarui testimonial (admin)
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
 *         description: Locale utama untuk update name/message jika tidak dikirim di body.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/TestimonialUpdateRequest"
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: "#/components/schemas/TestimonialUpdateRequest"
 *         multipart/form-data:
 *           schema:
 *             allOf:
 *               - $ref: "#/components/schemas/TestimonialUpdateRequest"
 *               - type: object
 *                 properties:
 *                   file:
 *                     type: string
 *                     format: binary
 *     responses:
 *       "200":
 *         description: Testimonial berhasil diperbarui.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: "#/components/schemas/TestimonialItem"
 *       "400":
 *         description: ID tidak valid atau payload form-data tidak valid.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/TestimonialError"
 *       "401":
 *         description: Unauthorized (belum login admin).
 *       "403":
 *         description: Forbidden (bukan admin).
 *       "404":
 *         description: Data tidak ditemukan.
 *       "413":
 *         description: File lebih dari 10MB.
 *       "415":
 *         description: Tipe file tidak didukung.
 *       "422":
 *         description: Star tidak valid atau kategori tidak ditemukan.
 *       "500":
 *         description: Server error / gagal unggah.
 *   patch:
 *     tags: [Testimonials]
 *     summary: Perbarui testimonial (admin)
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/TestimonialUpdateRequest"
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: "#/components/schemas/TestimonialUpdateRequest"
 *         multipart/form-data:
 *           schema:
 *             allOf:
 *               - $ref: "#/components/schemas/TestimonialUpdateRequest"
 *               - type: object
 *                 properties:
 *                   file:
 *                     type: string
 *                     format: binary
 *     responses:
 *       "200":
 *         description: Testimonial berhasil diperbarui.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: "#/components/schemas/TestimonialItem"
 *       "400":
 *         description: ID tidak valid atau payload form-data tidak valid.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/TestimonialError"
 *       "401":
 *         description: Unauthorized (belum login admin).
 *       "403":
 *         description: Forbidden (bukan admin).
 *       "404":
 *         description: Data tidak ditemukan.
 *       "413":
 *         description: File lebih dari 10MB.
 *       "415":
 *         description: Tipe file tidak didukung.
 *       "422":
 *         description: Star tidak valid atau kategori tidak ditemukan.
 *       "500":
 *         description: Server error / gagal unggah.
 *   delete:
 *     tags: [Testimonials]
 *     summary: Hapus testimonial (admin, soft delete)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       "200":
 *         description: Testimonial berhasil dihapus (soft delete).
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     id: { type: string }
 *                     deleted_at:
 *                       type: string
 *                       format: date-time
 *       "400":
 *         description: ID tidak valid.
 *       "401":
 *         description: Unauthorized (belum login admin).
 *       "403":
 *         description: Forbidden (bukan admin).
 *       "500":
 *         description: Server error.
 */

// Anotasi OpenAPI saja; tidak dieksekusi.
