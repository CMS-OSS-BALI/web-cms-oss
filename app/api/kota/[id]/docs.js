/**
 * @openapi
 * tags:
 *   - name: Kota
 *     description: Detail dan pengelolaan data kota.
 *
 * components:
 *   schemas:
 *     KotaItem:
 *       type: object
 *       properties:
 *         id: { type: string }
 *         negara_id: { type: string }
 *         name:
 *           type: string
 *           nullable: true
 *         locale_used:
 *           type: string
 *           nullable: true
 *         is_active:
 *           type: boolean
 *         living_cost:
 *           type: number
 *           nullable: true
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *         negara_name:
 *           type: string
 *           nullable: true
 *         negara_locale_used:
 *           type: string
 *           nullable: true
 *     KotaUpdateRequest:
 *       type: object
 *       properties:
 *         negara_id:
 *           type: string
 *           description: ID negara (BigInt string).
 *         name_id:
 *           type: string
 *         name_en:
 *           type: string
 *         is_active:
 *           type: boolean
 *         living_cost:
 *           type: number
 *           nullable: true
 *         autoTranslate:
 *           type: boolean
 *           default: false
 *           description: Jika true dan name_id diubah, isi EN otomatis.
 *     KotaMutationResponse:
 *       type: object
 *       properties:
 *         message: { type: string }
 *         data:
 *           type: object
 *           properties:
 *             id: { type: string }
 *     KotaDeleteResponse:
 *       type: object
 *       properties:
 *         message: { type: string }
 *         data:
 *           type: object
 *           properties:
 *             id: { type: string }
 *
 * /api/kota/{id}:
 *   get:
 *     tags: [Kota]
 *     summary: Ambil detail kota
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
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
 *                   $ref: "#/components/schemas/KotaItem"
 *       "404":
 *         description: Tidak ditemukan.
 *       "500":
 *         description: Gagal memuat data.
 *   patch:
 *     tags: [Kota]
 *     summary: Perbarui kota (admin)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       "200":
 *         description: Kota diperbarui.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/KotaMutationResponse"
 *       "401":
 *         description: Unauthorized
 *       "403":
 *         description: Forbidden
 *       "404":
 *         description: Tidak ditemukan
 *       "422":
 *         description: Validasi/negara_id tidak ditemukan
 *       "500":
 *         description: Gagal memperbarui
 *   put:
 *     tags: [Kota]
 *     summary: Alias PATCH (admin)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       "200":
 *         description: Kota diperbarui.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/KotaMutationResponse"
 *       "401":
 *         description: Unauthorized
 *       "403":
 *         description: Forbidden
 *       "404":
 *         description: Tidak ditemukan
 *       "422":
 *         description: Validasi/negara_id tidak ditemukan
 *       "500":
 *         description: Gagal memperbarui
 *   delete:
 *     tags: [Kota]
 *     summary: Nonaktifkan kota (admin)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       "200":
 *         description: Kota dinonaktifkan (atau dihapus sesuai implementasi).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/KotaDeleteResponse"
 *       "401":
 *         description: Unauthorized
 *       "403":
 *         description: Forbidden
 *       "404":
 *         description: Tidak ditemukan
 *       "500":
 *         description: Gagal menghapus
 */

// Auto-generated placeholder docs; update dengan detail request/response.
