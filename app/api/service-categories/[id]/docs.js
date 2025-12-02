/**
 * @openapi
 * tags:
 *   - name: Service Categories
 *     description: Detail & mutasi kategori layanan (slug unik).
 *
 * components:
 *   schemas:
 *     ServiceCategoryItem:
 *       type: object
 *       properties:
 *         id: { type: string }
 *         name: { type: string }
 *         slug: { type: string }
 *         created_at: { type: string, format: date-time }
 *         updated_at: { type: string, format: date-time }
 *         services_count:
 *           type: integer
 *           nullable: true
 *           description: Hanya muncul jika include_counts=1.
 *     ServiceCategoryUpdateRequest:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *         slug:
 *           type: string
 *     ServiceCategoryMutationResponse:
 *       type: object
 *       properties:
 *         data:
 *           $ref: "#/components/schemas/ServiceCategoryItem"
 *
 * /api/service-categories/{id}:
 *   get:
 *     tags: [Service Categories]
 *     summary: Detail kategori layanan
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: include_counts
 *         schema: { type: string, enum: ["0", "1"] }
 *     responses:
 *       "200":
 *         description: Detail ditemukan.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ServiceCategoryMutationResponse"
 *       "404":
 *         description: Tidak ditemukan.
 *       "500":
 *         description: Gagal memuat data.
 *   put:
 *     tags: [Service Categories]
 *     summary: Alias PATCH kategori layanan (admin)
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
 *             $ref: "#/components/schemas/ServiceCategoryUpdateRequest"
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: "#/components/schemas/ServiceCategoryUpdateRequest"
 *         multipart/form-data:
 *           schema:
 *             $ref: "#/components/schemas/ServiceCategoryUpdateRequest"
 *     responses:
 *       "200":
 *         description: Kategori diperbarui.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ServiceCategoryMutationResponse"
 *       "400":
 *         description: Validasi gagal (name kosong/slug invalid).
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
 *     tags: [Service Categories]
 *     summary: Update kategori layanan (admin)
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
 *             $ref: "#/components/schemas/ServiceCategoryUpdateRequest"
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: "#/components/schemas/ServiceCategoryUpdateRequest"
 *         multipart/form-data:
 *           schema:
 *             $ref: "#/components/schemas/ServiceCategoryUpdateRequest"
 *     responses:
 *       "200":
 *         description: Kategori diperbarui.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ServiceCategoryMutationResponse"
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
 *     tags: [Service Categories]
 *     summary: Hapus kategori layanan (admin)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       "200":
 *         description: Kategori dihapus.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ServiceCategoryMutationResponse"
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
