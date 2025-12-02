/**
 * @openapi
 * tags:
 *   - name: Jurusan
 *     description: Detail & mutasi jurusan/program (multi-locale, relasi kota, harga opsional).
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
 *               kota_id: { type: string }
 *               kota_name: { type: string, nullable: true }
 *               kota_locale_used: { type: string, nullable: true }
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
 *     JurusanUpdateRequest:
 *       type: object
 *       properties:
 *         college_id:
 *           type: string
 *         harga:
 *           type: number
 *           nullable: true
 *         kota_id:
 *           oneOf:
 *             - type: string
 *             - type: array
 *               items: { type: string }
 *         locale:
 *           type: string
 *           default: id
 *         name:
 *           type: string
 *         description:
 *           type: string
 *           nullable: true
 *         autoTranslate:
 *           type: boolean
 *           default: true
 *           description: Jika true dan locale bukan EN, isi terjemahan EN otomatis saat name/description diubah.
 *     JurusanMutationResponse:
 *       type: object
 *       properties:
 *         message: { type: string }
 *         data:
 *           type: object
 *           properties:
 *             id: { type: string }
 *
 * /api/jurusan/{id}:
 *   get:
 *     tags: [Jurusan]
 *     summary: Detail jurusan
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
 *                   $ref: "#/components/schemas/JurusanItem"
 *       "400":
 *         description: id kosong.
 *       "404":
 *         description: Tidak ditemukan.
 *       "500":
 *         description: Gagal memuat data.
 *   put:
 *     tags: [Jurusan]
 *     summary: Alias PATCH update jurusan (admin)
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
 *             $ref: "#/components/schemas/JurusanUpdateRequest"
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: "#/components/schemas/JurusanUpdateRequest"
 *         multipart/form-data:
 *           schema:
 *             $ref: "#/components/schemas/JurusanUpdateRequest"
 *     responses:
 *       "200":
 *         description: Jurusan diperbarui.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/JurusanMutationResponse"
 *       "400":
 *         description: Validasi gagal (college_id kosong, harga negatif, kota_id invalid).
 *       "401":
 *         description: Unauthorized.
 *       "403":
 *         description: Forbidden.
 *       "404":
 *         description: Tidak ditemukan.
 *       "422":
 *         description: FK kota/college tidak ditemukan.
 *       "500":
 *         description: Gagal memperbarui data.
 *   patch:
 *     tags: [Jurusan]
 *     summary: Update jurusan (admin)
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
 *             $ref: "#/components/schemas/JurusanUpdateRequest"
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: "#/components/schemas/JurusanUpdateRequest"
 *         multipart/form-data:
 *           schema:
 *             $ref: "#/components/schemas/JurusanUpdateRequest"
 *     responses:
 *       "200":
 *         description: Jurusan diperbarui.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/JurusanMutationResponse"
 *       "400":
 *         description: Validasi gagal.
 *       "401":
 *         description: Unauthorized.
 *       "403":
 *         description: Forbidden.
 *       "404":
 *         description: Tidak ditemukan.
 *       "422":
 *         description: FK kota/college tidak ditemukan.
 *       "500":
 *         description: Gagal memperbarui data.
 *   delete:
 *     tags: [Jurusan]
 *     summary: Soft delete jurusan (admin)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       "200":
 *         description: Jurusan dihapus.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/JurusanMutationResponse"
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
