/**
 * @openapi
 * tags:
 *   - name: Referral
 *     description: Detail & mutasi referral (admin).
 *
 * components:
 *   schemas:
 *     ReferralItem:
 *       type: object
 *       properties:
 *         id: { type: string }
 *         nik: { type: string }
 *         full_name: { type: string }
 *         email: { type: string, format: email, nullable: true }
 *         whatsapp: { type: string, nullable: true }
 *         whatsapp_e164: { type: string, nullable: true }
 *         gender: { type: string, enum: [MALE, FEMALE], nullable: true }
 *         status: { type: string, enum: [PENDING, REJECTED, VERIFIED] }
 *         code: { type: string, nullable: true }
 *         pic_consultant_id: { type: string, nullable: true }
 *         city: { type: string, nullable: true }
 *         province: { type: string, nullable: true }
 *         pekerjaan: { type: string, nullable: true }
 *         ktp_url: { type: string, format: uri, nullable: true }
 *         leads_count: { type: integer }
 *         created_at: { type: string, format: date-time }
 *         updated_at: { type: string, format: date-time }
 *         deleted_at: { type: string, format: date-time, nullable: true }
 *         created_ts: { type: integer, nullable: true }
 *         updated_ts: { type: integer, nullable: true }
 *     ReferralUpdateRequest:
 *       type: object
 *       properties:
 *         full_name: { type: string }
 *         email: { type: string, format: email, nullable: true }
 *         whatsapp: { type: string, nullable: true }
 *         gender: { type: string, enum: [MALE, FEMALE], nullable: true }
 *         status: { type: string, enum: [PENDING, REJECTED, VERIFIED] }
 *         code: { type: string, nullable: true }
 *         pic_consultant_id: { type: string, nullable: true }
 *         city: { type: string, nullable: true }
 *         province: { type: string, nullable: true }
 *         pekerjaan: { type: string, nullable: true }
 *         ktp_url: { type: string, format: uri, nullable: true }
 *         ktp_file:
 *           type: string
 *           format: binary
 *           description: Foto KTP (JPEG/PNG/WebP, max 5MB).
 *     ReferralMutationResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: object
 *           properties:
 *             id: { type: string }
 *
 * /api/referral/{id}:
 *   get:
 *     tags: [Referral]
 *     summary: Detail referral (admin)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       "200":
 *         description: Detail ditemukan.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: "#/components/schemas/ReferralItem"
 *       "401":
 *         description: Unauthorized.
 *       "403":
 *         description: Forbidden.
 *       "404":
 *         description: Tidak ditemukan.
 *       "500":
 *         description: Gagal memuat data.
 *   patch:
 *     tags: [Referral]
 *     summary: Update referral (admin)
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
 *             $ref: "#/components/schemas/ReferralUpdateRequest"
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: "#/components/schemas/ReferralUpdateRequest"
 *         multipart/form-data:
 *           schema:
 *             allOf:
 *               - $ref: "#/components/schemas/ReferralUpdateRequest"
 *               - type: object
 *                 properties:
 *                   ktp_file:
 *                     type: string
 *                     format: binary
 *     responses:
 *       "200":
 *         description: Referral diperbarui.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ReferralMutationResponse"
 *       "400":
 *         description: Validasi gagal (NIK/KTP/field invalid).
 *       "401":
 *         description: Unauthorized.
 *       "403":
 *         description: Forbidden.
 *       "404":
 *         description: Tidak ditemukan.
 *       "413":
 *         description: File > 5MB.
 *       "415":
 *         description: Tipe file tidak didukung.
 *       "500":
 *         description: Gagal memperbarui.
 *   delete:
 *     tags: [Referral]
 *     summary: Soft delete referral (admin)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       "200":
 *         description: Referral dihapus.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ReferralMutationResponse"
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
