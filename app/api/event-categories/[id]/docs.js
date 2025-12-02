/**
 * @openapi
 * tags:
 *   - name: Event Categories
 *     description: Detail & mutasi kategori event (multi-locale, soft delete).
 *
 * components:
 *   schemas:
 *     EventCategoryItem:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         slug:
 *           type: string
 *         sort:
 *           type: integer
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
 *         name:
 *           type: string
 *           nullable: true
 *         description:
 *           type: string
 *           nullable: true
 *         locale_used:
 *           type: string
 *           nullable: true
 *     EventCategoryUpdateRequest:
 *       type: object
 *       properties:
 *         slug:
 *           type: string
 *         sort:
 *           type: integer
 *           minimum: 0
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
 *         autoTranslate:
 *           type: boolean
 *           default: false
 *           description: Jika true dan mengubah name/description ID, isi EN otomatis.
 *     EventCategoryMutationResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *         data:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *
 * /api/event-categories/{id}:
 *   get:
 *     tags: [Event Categories]
 *     summary: Detail kategori event (tidak menampilkan yang soft-delete)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: locale
 *         schema:
 *           type: string
 *           default: id
 *       - in: query
 *         name: fallback
 *         schema:
 *           type: string
 *           default: id
 *     responses:
 *       "200":
 *         description: Detail ditemukan.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: "#/components/schemas/EventCategoryItem"
 *       "400":
 *         description: id kosong.
 *       "404":
 *         description: Tidak ditemukan atau sudah dihapus.
 *       "500":
 *         description: Gagal memuat data.
 *   put:
 *     tags: [Event Categories]
 *     summary: Alias PATCH kategori event (admin)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/EventCategoryUpdateRequest"
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: "#/components/schemas/EventCategoryUpdateRequest"
 *         multipart/form-data:
 *           schema:
 *             $ref: "#/components/schemas/EventCategoryUpdateRequest"
 *     responses:
 *       "200":
 *         description: Berhasil diperbarui.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/EventCategoryMutationResponse"
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
 *     tags: [Event Categories]
 *     summary: Update kategori event (admin)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/EventCategoryUpdateRequest"
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: "#/components/schemas/EventCategoryUpdateRequest"
 *         multipart/form-data:
 *           schema:
 *             $ref: "#/components/schemas/EventCategoryUpdateRequest"
 *     responses:
 *       "200":
 *         description: Berhasil diperbarui.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/EventCategoryMutationResponse"
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
 *     tags: [Event Categories]
 *     summary: Soft delete kategori event (admin)
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
 *         description: Berhasil dihapus (soft delete).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/EventCategoryMutationResponse"
 *       "400":
 *         description: id kosong.
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
