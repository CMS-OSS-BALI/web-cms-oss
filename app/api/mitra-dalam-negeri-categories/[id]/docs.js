/**
 * @openapi
 * tags:
 *   - name: Mitra Dalam Negeri Categories
 *     description: Detail & mutasi kategori mitra (admin).
 *
 * components:
 *   schemas:
 *     MitraCategoryItem:
 *       type: object
 *       properties:
 *         id: { type: string }
 *         slug: { type: string }
 *         sort: { type: integer }
 *         created_at: { type: string, format: date-time }
 *         updated_at: { type: string, format: date-time }
 *         deleted_at: { type: string, format: date-time, nullable: true }
 *         name: { type: string, nullable: true }
 *         description: { type: string, nullable: true }
 *         locale_used: { type: string, nullable: true }
 *     MitraCategoryUpdateRequest:
 *       type: object
 *       properties:
 *         slug: { type: string }
 *         sort: { type: integer, minimum: 0 }
 *         name_id: { type: string }
 *         description_id: { type: string, nullable: true }
 *         name_en: { type: string }
 *         description_en: { type: string, nullable: true }
 *         autoTranslate:
 *           type: boolean
 *           default: false
 *           description: Jika true dan mengubah name/description ID, isi EN otomatis.
 *     MitraCategoryMutationResponse:
 *       type: object
 *       properties:
 *         message: { type: string }
 *         data:
 *           type: object
 *           properties:
 *             id: { type: string }
 *
 * /api/mitra-dalam-negeri-categories/{id}:
 *   get:
 *     tags: [Mitra Dalam Negeri Categories]
 *     summary: Detail kategori mitra
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
 *         schema: { type: string, default: en }
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
 *                   $ref: "#/components/schemas/MitraCategoryItem"
 *       "400":
 *         description: id kosong.
 *       "404":
 *         description: Tidak ditemukan.
 *       "500":
 *         description: Gagal memuat data.
 *   put:
 *     tags: [Mitra Dalam Negeri Categories]
 *     summary: Alias PATCH kategori mitra (admin)
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
 *             $ref: "#/components/schemas/MitraCategoryUpdateRequest"
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: "#/components/schemas/MitraCategoryUpdateRequest"
 *         multipart/form-data:
 *           schema:
 *             $ref: "#/components/schemas/MitraCategoryUpdateRequest"
 *     responses:
 *       "200":
 *         description: Kategori diperbarui.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/MitraCategoryMutationResponse"
 *       "400":
 *         description: Validasi gagal (slug invalid, sort negatif).
 *       "401":
 *         description: Unauthorized.
 *       "403":
 *         description: Forbidden.
 *       "404":
 *         description: Tidak ditemukan.
 *       "409":
 *         description: Slug sudah digunakan.
 *       "500":
 *         description: Gagal memperbarui data.
 *   patch:
 *     tags: [Mitra Dalam Negeri Categories]
 *     summary: Update kategori mitra (admin)
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
 *             $ref: "#/components/schemas/MitraCategoryUpdateRequest"
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: "#/components/schemas/MitraCategoryUpdateRequest"
 *         multipart/form-data:
 *           schema:
 *             $ref: "#/components/schemas/MitraCategoryUpdateRequest"
 *     responses:
 *       "200":
 *         description: Kategori diperbarui.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/MitraCategoryMutationResponse"
 *       "400":
 *         description: Validasi gagal.
 *       "401":
 *         description: Unauthorized.
 *       "403":
 *         description: Forbidden.
 *       "404":
 *         description: Tidak ditemukan.
 *       "409":
 *         description: Slug sudah digunakan.
 *       "500":
 *         description: Gagal memperbarui data.
 *   delete:
 *     tags: [Mitra Dalam Negeri Categories]
 *     summary: Soft delete kategori mitra (admin)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       "200":
 *         description: Kategori dihapus (soft delete).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/MitraCategoryMutationResponse"
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
