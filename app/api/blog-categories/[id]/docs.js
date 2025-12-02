/**
 * @openapi
 * tags:
 *   - name: Blog Categories
 *     description: Detail & mutasi kategori blog.
 *
 * components:
 *   schemas:
 *     BlogCategoryDetailResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *         data:
 *           $ref: "#/components/schemas/BlogCategoryItem"
 *
 * /api/blog-categories/{id}:
 *   get:
 *     tags: [Blog Categories]
 *     summary: Detail kategori blog (hanya yang belum soft-delete)
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
 *               $ref: "#/components/schemas/BlogCategoryDetailResponse"
 *       "400":
 *         description: Parameter id tidak valid.
 *       "404":
 *         description: Tidak ditemukan atau sudah dihapus.
 *       "500":
 *         description: Gagal memuat data.
 *   put:
 *     tags: [Blog Categories]
 *     summary: Alias PATCH kategori blog (admin)
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
 *             $ref: "#/components/schemas/BlogCategoryUpdateRequest"
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: "#/components/schemas/BlogCategoryUpdateRequest"
 *         multipart/form-data:
 *           schema:
 *             $ref: "#/components/schemas/BlogCategoryUpdateRequest"
 *     responses:
 *       "200":
 *         description: Kategori diperbarui.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/BlogCategoryMutationResponse"
 *       "400":
 *         description: Validasi gagal.
 *       "401":
 *         description: Unauthorized.
 *       "403":
 *         description: Forbidden (bukan admin).
 *       "404":
 *         description: Tidak ditemukan.
 *       "409":
 *         description: Slug sudah digunakan.
 *       "500":
 *         description: Gagal memperbarui data.
 *   patch:
 *     tags: [Blog Categories]
 *     summary: Update kategori blog (admin)
 *     description: |
 *       Menerima JSON, x-www-form-urlencoded, atau multipart form (field teks). `autoTranslate` default false; jika true dan mengubah name/description ID maka versi EN otomatis diisi.
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
 *             $ref: "#/components/schemas/BlogCategoryUpdateRequest"
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: "#/components/schemas/BlogCategoryUpdateRequest"
 *         multipart/form-data:
 *           schema:
 *             $ref: "#/components/schemas/BlogCategoryUpdateRequest"
 *     responses:
 *       "200":
 *         description: Kategori diperbarui.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/BlogCategoryMutationResponse"
 *       "400":
 *         description: Validasi gagal.
 *       "401":
 *         description: Unauthorized.
 *       "403":
 *         description: Forbidden (bukan admin).
 *       "404":
 *         description: Tidak ditemukan.
 *       "409":
 *         description: Slug sudah digunakan.
 *       "500":
 *         description: Gagal memperbarui data.
 *   delete:
 *     tags: [Blog Categories]
 *     summary: Soft delete kategori blog (admin)
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
 *               $ref: "#/components/schemas/BlogCategoryMutationResponse"
 *       "401":
 *         description: Unauthorized.
 *       "403":
 *         description: Forbidden (bukan admin).
 *       "404":
 *         description: Tidak ditemukan.
 *       "500":
 *         description: Gagal menghapus.
 */

// Anotasi OpenAPI saja; tidak dieksekusi.
