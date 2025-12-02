/**
 * @openapi
 * tags:
 *   - name: Prodi
 *     description: Detail & mutasi prodi/program studi (multi-locale, harga opsional).
 *
 * components:
 *   schemas:
 *     ProdiItem:
 *       type: object
 *       properties:
 *         id: { type: string }
 *         jurusan_id: { type: string, nullable: true }
 *         college_id: { type: string, nullable: true }
 *         name: { type: string, nullable: true }
 *         description: { type: string, nullable: true }
 *         locale_used: { type: string, nullable: true }
 *         harga: { type: number, nullable: true }
 *         in_take: { type: string, nullable: true }
 *         created_at: { type: string, format: date-time }
 *         updated_at: { type: string, format: date-time }
 *         deleted_at: { type: string, format: date-time, nullable: true }
 *         created_ts: { type: integer, nullable: true }
 *         updated_ts: { type: integer, nullable: true }
 *     ProdiUpdateRequest:
 *       type: object
 *       properties:
 *         jurusan_id: { type: string, nullable: true }
 *         college_id: { type: string, nullable: true }
 *         locale: { type: string, default: id }
 *         name: { type: string }
 *         description: { type: string, nullable: true }
 *         harga: { type: number, nullable: true }
 *         in_take: { type: string, nullable: true }
 *         autoTranslate:
 *           type: boolean
 *           default: true
 *           description: Jika true dan locale bukan EN, isi terjemahan EN otomatis saat name/description diubah.
 *     ProdiMutationResponse:
 *       type: object
 *       properties:
 *         message: { type: string }
 *         data:
 *           type: object
 *           properties:
 *             id: { type: string }
 *
 * /api/prodi/{id}:
 *   get:
 *     tags: [Prodi]
 *     summary: Detail prodi
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: locale
 *         schema: { type: string, default: id }
 *       - in: query
 *         name: fallback
 *         schema: { type: string, default: id }
 *     responses:
 *       "200":
 *         description: Detail ditemukan.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *                 data:
 *                   $ref: "#/components/schemas/ProdiItem"
 *       "400":
 *         description: id kosong.
 *       "404":
 *         description: Tidak ditemukan.
 *       "500":
 *         description: Gagal memuat data.
 *   put:
 *     tags: [Prodi]
 *     summary: Alias PATCH update prodi (admin)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/ProdiUpdateRequest"
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: "#/components/schemas/ProdiUpdateRequest"
 *         multipart/form-data:
 *           schema:
 *             $ref: "#/components/schemas/ProdiUpdateRequest"
 *     responses:
 *       "200":
 *         description: Prodi diperbarui.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ProdiMutationResponse"
 *       "400":
 *         description: Validasi gagal (harga negatif, college/jurusan invalid).
 *       "401":
 *         description: Unauthorized.
 *       "403":
 *         description: Forbidden.
 *       "404":
 *         description: Tidak ditemukan.
 *       "500":
 *         description: Gagal memperbarui data.
 *   patch:
 *     tags: [Prodi]
 *     summary: Update prodi (admin)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/ProdiUpdateRequest"
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: "#/components/schemas/ProdiUpdateRequest"
 *         multipart/form-data:
 *           schema:
 *             $ref: "#/components/schemas/ProdiUpdateRequest"
 *     responses:
 *       "200":
 *         description: Prodi diperbarui.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ProdiMutationResponse"
 *       "400":
 *         description: Validasi gagal.
 *       "401":
 *         description: Unauthorized.
 *       "403":
 *         description: Forbidden.
 *       "404":
 *         description: Tidak ditemukan.
 *       "500":
 *         description: Gagal memperbarui data.
 *   delete:
 *     tags: [Prodi]
 *     summary: Soft delete prodi (admin)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       "200":
 *         description: Prodi dihapus (soft delete).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ProdiMutationResponse"
 *       "401":
 *         description: Unauthorized.
 *       "403":
 *         description: Forbidden.
 *       "404":
 *         description: Tidak ditemukan.
 *       "500":
 *         description: Gagal menghapus.
 */

// Anotasi OpenAPI saja; tidak dieksekusi.
