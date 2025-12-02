/**
 * @openapi
 * tags:
 *   - name: Jenjang Master
 *     description: Detail & mutasi jenjang (kode + terjemahan ID/EN).
 *
 * components:
 *   schemas:
 *     JenjangItem:
 *       type: object
 *       properties:
 *         id: { type: string }
 *         code: { type: string }
 *         name:
 *           type: string
 *           nullable: true
 *         description:
 *           type: string
 *           nullable: true
 *         locale_used:
 *           type: string
 *           nullable: true
 *         sort:
 *           type: integer
 *         is_active:
 *           type: boolean
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *         created_ts:
 *           type: integer
 *           nullable: true
 *         updated_ts:
 *           type: integer
 *           nullable: true
 *     JenjangUpdateRequest:
 *       type: object
 *       properties:
 *         code:
 *           type: string
 *         name_id:
 *           type: string
 *         description_id:
 *           type: string
 *           nullable: true
 *         name_en:
 *           type: string
 *         description_en:
 *           type: string
 *           nullable: true
 *         sort:
 *           type: integer
 *           minimum: 0
 *         is_active:
 *           type: boolean
 *         autoTranslate:
 *           type: boolean
 *           default: false
 *           description: Jika true dan mengubah name/description ID, isi EN otomatis.
 *     JenjangMutationResponse:
 *       type: object
 *       properties:
 *         message: { type: string }
 *         data:
 *           type: object
 *           properties:
 *             id: { type: string }
 *     JenjangDeleteResponse:
 *       type: object
 *       properties:
 *         message: { type: string }
 *         data:
 *           type: object
 *           properties:
 *             id: { type: string }
 *
 * /api/jenjang-master/{id}:
 *   get:
 *     tags: [Jenjang Master]
 *     summary: Detail jenjang
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
 *                   $ref: "#/components/schemas/JenjangItem"
 *       "400":
 *         description: Parameter id kosong.
 *       "404":
 *         description: Tidak ditemukan.
 *       "500":
 *         description: Gagal memuat data.
 *   put:
 *     tags: [Jenjang Master]
 *     summary: Alias PATCH jenjang (admin)
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
 *             $ref: "#/components/schemas/JenjangUpdateRequest"
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: "#/components/schemas/JenjangUpdateRequest"
 *         multipart/form-data:
 *           schema:
 *             $ref: "#/components/schemas/JenjangUpdateRequest"
 *     responses:
 *       "200":
 *         description: Jenjang diperbarui.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/JenjangMutationResponse"
 *       "400":
 *         description: Validasi gagal (kode kosong/panjang, sort negatif).
 *       "401":
 *         description: Unauthorized.
 *       "403":
 *         description: Forbidden.
 *       "404":
 *         description: Tidak ditemukan.
 *       "409":
 *         description: Kode jenjang sudah digunakan.
 *       "500":
 *         description: Gagal memperbarui data.
 *   patch:
 *     tags: [Jenjang Master]
 *     summary: Update jenjang (admin)
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
 *             $ref: "#/components/schemas/JenjangUpdateRequest"
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: "#/components/schemas/JenjangUpdateRequest"
 *         multipart/form-data:
 *           schema:
 *             $ref: "#/components/schemas/JenjangUpdateRequest"
 *     responses:
 *       "200":
 *         description: Jenjang diperbarui.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/JenjangMutationResponse"
 *       "400":
 *         description: Validasi gagal.
 *       "401":
 *         description: Unauthorized.
 *       "403":
 *         description: Forbidden.
 *       "404":
 *         description: Tidak ditemukan.
 *       "409":
 *         description: Kode jenjang sudah digunakan.
 *       "500":
 *         description: Gagal memperbarui data.
 *   delete:
 *     tags: [Jenjang Master]
 *     summary: Hapus jenjang (admin)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       "200":
 *         description: Jenjang dihapus.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/JenjangDeleteResponse"
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
