/**
 * @openapi
 * tags:
 *   - name: Services
 *     description: Detail & mutasi layanan (B2B/B2C) dengan kategori, gambar, dan multi-locale.
 *
 * components:
 *   schemas:
 *     ServiceCategoryRef:
 *       type: object
 *       properties:
 *         id: { type: string }
 *         slug: { type: string }
 *         name: { type: string, nullable: true }
 *     ServiceItem:
 *       type: object
 *       properties:
 *         id: { type: string }
 *         admin_user_id: { type: string, nullable: true }
 *         image_url:
 *           type: string
 *           format: uri
 *           nullable: true
 *         image_public_url:
 *           type: string
 *           format: uri
 *           nullable: true
 *         image_resolved_url:
 *           type: string
 *           format: uri
 *           nullable: true
 *         service_type:
 *           type: string
 *           enum: [B2B, B2C]
 *         category:
 *           $ref: "#/components/schemas/ServiceCategoryRef"
 *           nullable: true
 *         price:
 *           type: integer
 *           nullable: true
 *         phone:
 *           type: string
 *           nullable: true
 *         is_published:
 *           type: boolean
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *         locale_used:
 *           type: string
 *           nullable: true
 *         name:
 *           type: string
 *           nullable: true
 *         description:
 *           type: string
 *           nullable: true
 *     ServiceUpdateRequest:
 *       type: object
 *       properties:
 *         name_id: { type: string }
 *         description_id: { type: string, nullable: true }
 *         name_en: { type: string }
 *         description_en: { type: string, nullable: true }
 *         service_type:
 *           type: string
 *           enum: [B2B, B2C]
 *         category_id: { type: string, nullable: true }
 *         category_slug: { type: string, nullable: true }
 *         price:
 *           type: integer
 *           nullable: true
 *         phone:
 *           type: string
 *           nullable: true
 *         is_published:
 *           type: boolean
 *         autoTranslate:
 *           type: boolean
 *           default: false
 *           description: Jika true dan field ID diubah, isi EN otomatis.
 *         image_url:
 *           type: string
 *           format: uri
 *           nullable: true
 *         file:
 *           type: string
 *           format: binary
 *           description: Upload gambar (JPEG/PNG/WebP, max 10MB).
 *     ServiceMutationResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: object
 *           properties:
 *             id: { type: string }
 *             image_url:
 *               type: string
 *               format: uri
 *               nullable: true
 *             image_public_url:
 *               type: string
 *               format: uri
 *               nullable: true
 *
 * /api/services/{id}:
 *   get:
 *     tags: [Services]
 *     summary: Detail layanan
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
 *                 data:
 *                   $ref: "#/components/schemas/ServiceItem"
 *       "404":
 *         description: Tidak ditemukan.
 *       "500":
 *         description: Gagal memuat data.
 *   put:
 *     tags: [Services]
 *     summary: Alias PATCH layanan (admin)
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
 *             $ref: "#/components/schemas/ServiceUpdateRequest"
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: "#/components/schemas/ServiceUpdateRequest"
 *         multipart/form-data:
 *           schema:
 *             allOf:
 *               - $ref: "#/components/schemas/ServiceUpdateRequest"
 *               - type: object
 *                 properties:
 *                   file:
 *                     type: string
 *                     format: binary
 *     responses:
 *       "200":
 *         description: Layanan diperbarui.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ServiceMutationResponse"
 *       "400":
 *         description: Validasi gagal (service_type invalid, harga negatif).
 *       "401":
 *         description: Unauthorized.
 *       "403":
 *         description: Forbidden.
 *       "404":
 *         description: Tidak ditemukan.
 *       "409":
 *         description: Kategori tidak ditemukan.
 *       "413":
 *         description: File > 10MB.
 *       "415":
 *         description: Tipe file tidak didukung.
 *       "500":
 *         description: Gagal memperbarui data.
 *   patch:
 *     tags: [Services]
 *     summary: Update layanan (admin)
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
 *             $ref: "#/components/schemas/ServiceUpdateRequest"
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: "#/components/schemas/ServiceUpdateRequest"
 *         multipart/form-data:
 *           schema:
 *             allOf:
 *               - $ref: "#/components/schemas/ServiceUpdateRequest"
 *               - type: object
 *                 properties:
 *                   file:
 *                     type: string
 *                     format: binary
 *     responses:
 *       "200":
 *         description: Layanan diperbarui.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ServiceMutationResponse"
 *       "400":
 *         description: Validasi gagal.
 *       "401":
 *         description: Unauthorized.
 *       "403":
 *         description: Forbidden.
 *       "404":
 *         description: Tidak ditemukan.
 *       "409":
 *         description: Kategori tidak ditemukan.
 *       "413":
 *         description: File > 10MB.
 *       "415":
 *         description: Tipe file tidak didukung.
 *       "500":
 *         description: Gagal memperbarui data.
 *   delete:
 *     tags: [Services]
 *     summary: Soft delete layanan (admin)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       "200":
 *         description: Layanan dihapus.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ServiceMutationResponse"
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
