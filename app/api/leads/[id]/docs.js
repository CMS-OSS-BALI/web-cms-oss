/**
 * @openapi
 * tags:
 *   - name: Leads
 *     description: Detail & pembaruan lead (admin).
 *
 * components:
 *   schemas:
 *     LeadItem:
 *       type: object
 *       properties:
 *         id: { type: string }
 *         full_name: { type: string }
 *         domicile: { type: string, nullable: true }
 *         whatsapp: { type: string, nullable: true }
 *         email: { type: string, format: email, nullable: true }
 *         education_last: { type: string, nullable: true }
 *         assigned_to: { type: string, nullable: true }
 *         assigned_at: { type: string, format: date-time, nullable: true }
 *         referral_id: { type: string, nullable: true }
 *         created_at: { type: string, format: date-time }
 *         updated_at: { type: string, format: date-time }
 *         deleted_at: { type: string, format: date-time, nullable: true }
 *         created_ts: { type: integer, nullable: true }
 *         updated_ts: { type: integer, nullable: true }
 *     LeadUpdateRequest:
 *       type: object
 *       properties:
 *         full_name: { type: string }
 *         domicile: { type: string, nullable: true }
 *         whatsapp: { type: string, nullable: true }
 *         email: { type: string, format: email, nullable: true }
 *         education_last: { type: string, nullable: true }
 *         assigned_to: { type: string, nullable: true }
 *         assigned_at: { type: string, format: date-time, nullable: true }
 *         referral_id: { type: string, nullable: true }
 *     LeadMutationResponse:
 *       type: object
 *       properties:
 *         message: { type: string }
 *         data:
 *           type: object
 *           properties:
 *             id: { type: string }
 *
 * /api/leads/{id}:
 *   get:
 *     tags: [Leads]
 *     summary: Detail lead (admin)
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
 *                 message: { type: string }
 *                 data:
 *                   $ref: "#/components/schemas/LeadItem"
 *       "401":
 *         description: Unauthorized.
 *       "403":
 *         description: Forbidden.
 *       "404":
 *         description: Tidak ditemukan.
 *       "500":
 *         description: Gagal memuat data.
 *   patch:
 *     tags: [Leads]
 *     summary: Perbarui lead (admin)
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
 *             $ref: "#/components/schemas/LeadUpdateRequest"
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: "#/components/schemas/LeadUpdateRequest"
 *         multipart/form-data:
 *           schema:
 *             $ref: "#/components/schemas/LeadUpdateRequest"
 *     responses:
 *       "200":
 *         description: Lead diperbarui.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/LeadMutationResponse"
 *       "401":
 *         description: Unauthorized.
 *       "403":
 *         description: Forbidden.
 *       "404":
 *         description: Tidak ditemukan.
 *       "422":
 *         description: Validasi gagal (email bukan string, assigned/referral/tanggal invalid).
 *       "500":
 *         description: Gagal memperbarui.
 *   delete:
 *     tags: [Leads]
 *     summary: Soft delete lead (admin)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       "200":
 *         description: Lead dihapus.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/LeadMutationResponse"
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
