/**
 * @openapi
 * tags:
 *   - name: Mitra Dalam Negeri
 *     description: Detail & mutasi mitra dalam negeri (admin).
 *
 * components:
 *   schemas:
 *     MitraItem:
 *       type: object
 *       properties:
 *         id: { type: string }
 *         admin_user_id: { type: string, nullable: true }
 *         category:
 *           type: object
 *           nullable: true
 *           properties:
 *             id: { type: string }
 *             slug: { type: string }
 *             name: { type: string, nullable: true }
 *             locale_used: { type: string, nullable: true }
 *         merchant_name: { type: string, nullable: true }
 *         about: { type: string, nullable: true }
 *         locale_used: { type: string, nullable: true }
 *         email: { type: string, format: email }
 *         phone: { type: string }
 *         nik: { type: string, nullable: true }
 *         website: { type: string, format: uri, nullable: true }
 *         instagram: { type: string, nullable: true }
 *         twitter: { type: string, nullable: true }
 *         mou_url: { type: string, format: uri, nullable: true }
 *         image_url: { type: string, format: uri, nullable: true }
 *         address: { type: string }
 *         city: { type: string, nullable: true }
 *         province: { type: string, nullable: true }
 *         postal_code: { type: string, nullable: true }
 *         contact_name: { type: string, nullable: true }
 *         contact_position: { type: string, nullable: true }
 *         contact_whatsapp: { type: string, nullable: true }
 *         status: { type: string, enum: [PENDING, APPROVED, DECLINED] }
 *         review_notes: { type: string, nullable: true }
 *         reviewed_at: { type: string, format: date-time, nullable: true }
 *         reviewed_by: { type: string, nullable: true }
 *         created_at: { type: string, format: date-time }
 *         updated_at: { type: string, format: date-time }
 *         deleted_at: { type: string, format: date-time, nullable: true }
 *         created_ts: { type: integer, nullable: true }
 *         updated_ts: { type: integer, nullable: true }
 *     MitraUpdateRequest:
 *       type: object
 *       properties:
 *         merchant_name: { type: string }
 *         about: { type: string, nullable: true }
 *         name_en: { type: string }
 *         about_en: { type: string, nullable: true }
 *         email: { type: string, format: email }
 *         phone: { type: string }
 *         nik: { type: string }
 *         website: { type: string, format: uri, nullable: true }
 *         instagram: { type: string, nullable: true }
 *         twitter: { type: string, nullable: true }
 *         mou_url: { type: string, format: uri, nullable: true }
 *         image_url: { type: string, format: uri, nullable: true }
 *         image_file:
 *           type: string
 *           format: binary
 *           description: Logo/image (JPEG/PNG/WebP/SVG, max 10MB).
 *         address: { type: string }
 *         city: { type: string, nullable: true }
 *         province: { type: string, nullable: true }
 *         postal_code: { type: string, nullable: true }
 *         contact_name: { type: string, nullable: true }
 *         contact_position: { type: string, nullable: true }
 *         contact_whatsapp: { type: string, nullable: true }
 *         category_id: { type: string, nullable: true }
 *         category_slug: { type: string, nullable: true }
 *         status:
 *           type: string
 *           enum: [PENDING, APPROVED, DECLINED]
 *         review_notes:
 *           type: string
 *           nullable: true
 *         autoTranslate:
 *           type: boolean
 *           default: false
 *           description: Isi EN otomatis jika name/description ID diubah dan locale bukan EN.
 *         attachments:
 *           type: array
 *           items:
 *             type: string
 *             format: binary
 *           description: Lampiran (PDF/Office/Image/TXT, max 20MB per file).
 *     MitraMutationResponse:
 *       type: object
 *       properties:
 *         message: { type: string }
 *         data:
 *           type: object
 *           properties:
 *             id: { type: string }
 *             image_url:
 *               type: string
 *               format: uri
 *               nullable: true
 *
 * /api/mitra-dalam-negeri/{id}:
 *   get:
 *     tags: [Mitra Dalam Negeri]
 *     summary: Detail mitra (admin)
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
 *                   $ref: "#/components/schemas/MitraItem"
 *       "401":
 *         description: Unauthorized.
 *       "403":
 *         description: Forbidden.
 *       "404":
 *         description: Tidak ditemukan.
 *       "500":
 *         description: Gagal memuat data.
 *   put:
 *     tags: [Mitra Dalam Negeri]
 *     summary: Alias PATCH (admin)
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
 *             $ref: "#/components/schemas/MitraUpdateRequest"
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: "#/components/schemas/MitraUpdateRequest"
 *         multipart/form-data:
 *           schema:
 *             $ref: "#/components/schemas/MitraUpdateRequest"
 *     responses:
 *       "200":
 *         description: Mitra diperbarui.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/MitraMutationResponse"
 *       "400":
 *         description: Validasi gagal (logo/attachments, NIK, kategori).
 *       "401":
 *         description: Unauthorized.
 *       "403":
 *         description: Forbidden.
 *       "404":
 *         description: Tidak ditemukan.
 *       "409":
 *         description: Konflik atau status tidak valid.
 *       "413":
 *         description: File terlalu besar.
 *       "415":
 *         description: Tipe file tidak didukung.
 *       "500":
 *         description: Gagal memperbarui data.
 *   patch:
 *     tags: [Mitra Dalam Negeri]
 *     summary: Perbarui mitra (admin)
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
 *             $ref: "#/components/schemas/MitraUpdateRequest"
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: "#/components/schemas/MitraUpdateRequest"
 *         multipart/form-data:
 *           schema:
 *             $ref: "#/components/schemas/MitraUpdateRequest"
 *     responses:
 *       "200":
 *         description: Mitra diperbarui.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/MitraMutationResponse"
 *       "400":
 *         description: Validasi gagal.
 *       "401":
 *         description: Unauthorized.
 *       "403":
 *         description: Forbidden.
 *       "404":
 *         description: Tidak ditemukan.
 *       "409":
 *         description: Konflik atau status tidak valid.
 *       "413":
 *         description: File terlalu besar.
 *       "415":
 *         description: Tipe file tidak didukung.
 *       "500":
 *         description: Gagal memperbarui data.
 *   delete:
 *     tags: [Mitra Dalam Negeri]
 *     summary: Soft delete mitra (admin)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       "200":
 *         description: Mitra dihapus (soft delete).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/MitraMutationResponse"
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
