/**
 * @openapi
 * tags:
 *   - name: Leads
 *     description: Lead capture publik + listing admin dengan filter assignment, referral, dan soft delete.
 *
 * components:
 *   schemas:
 *     LeadItem:
 *       type: object
 *       properties:
 *         id: { type: string }
 *         full_name: { type: string }
 *         domicile:
 *           type: string
 *           nullable: true
 *         whatsapp:
 *           type: string
 *           nullable: true
 *         email:
 *           type: string
 *           format: email
 *           nullable: true
 *         education_last:
 *           type: string
 *           nullable: true
 *         assigned_to:
 *           type: string
 *           nullable: true
 *         assigned_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         referral_id:
 *           type: string
 *           nullable: true
 *         referral:
 *           type: object
 *           nullable: true
 *           properties:
 *             id: { type: string }
 *             full_name: { type: string }
 *             code: { type: string }
 *             status: { type: string }
 *             pic_consultant_id:
 *               type: string
 *               nullable: true
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
 *         created_ts:
 *           type: integer
 *           nullable: true
 *         updated_ts:
 *           type: integer
 *           nullable: true
 *     LeadListResponse:
 *       type: object
 *       properties:
 *         message: { type: string }
 *         data:
 *           type: array
 *           items:
 *             $ref: "#/components/schemas/LeadItem"
 *         meta:
 *           type: object
 *           properties:
 *             page: { type: integer }
 *             perPage: { type: integer }
 *             total: { type: integer }
 *         summary:
 *           type: object
 *           nullable: true
 *           properties:
 *             total: { type: integer }
 *             assigned: { type: integer }
 *             unassigned: { type: integer }
 *     LeadCreateRequest:
 *       type: object
 *       required: [full_name]
 *       properties:
 *         full_name:
 *           type: string
 *           description: Wajib, minimal 2 karakter.
 *         domicile:
 *           type: string
 *           nullable: true
 *         whatsapp:
 *           type: string
 *           nullable: true
 *         email:
 *           type: string
 *           format: email
 *           nullable: true
 *         education_last:
 *           type: string
 *           nullable: true
 *         assigned_to:
 *           type: string
 *           nullable: true
 *           description: Opsional, ID konsultan (admin/internal use).
 *         assigned_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         referral_id:
 *           type: string
 *           nullable: true
 *         referral_code:
 *           type: string
 *           nullable: true
 *     LeadCreateResponse:
 *       type: object
 *       properties:
 *         message: { type: string }
 *         data:
 *           type: object
 *           properties:
 *             id: { type: string }
 *
 * /api/leads:
 *   get:
 *     tags: [Leads]
 *     summary: Daftar leads (admin)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: Cari di full_name/email/whatsapp/domicile.
 *       - in: query
 *         name: education
 *         schema: { type: string }
 *       - in: query
 *         name: assigned_to
 *         schema: { type: string }
 *       - in: query
 *         name: only_assigned
 *         schema: { type: string, enum: ["0", "1"] }
 *       - in: query
 *         name: include_assigned
 *         schema: { type: string, enum: ["0", "1"] }
 *       - in: query
 *         name: referral_id
 *         schema: { type: string }
 *       - in: query
 *         name: referral_code
 *         schema: { type: string }
 *       - in: query
 *         name: include_referral
 *         schema: { type: string, enum: ["0", "1"] }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: with_deleted
 *         schema: { type: string, enum: ["0", "1"] }
 *       - in: query
 *         name: only_deleted
 *         schema: { type: string, enum: ["0", "1"] }
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: perPage
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 10 }
 *       - in: query
 *         name: summary
 *         schema: { type: string, enum: ["0", "1"] }
 *         description: Jika "1", sertakan ringkasan total/assigned/unassigned.
 *     responses:
 *       "200":
 *         description: Berhasil mengambil daftar leads.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/LeadListResponse"
 *       "401":
 *         description: Unauthorized.
 *       "403":
 *         description: Forbidden.
 *       "422":
 *         description: Parameter invalid (mis. assigned_to tidak valid).
 *       "500":
 *         description: Gagal memuat data.
 *   post:
 *     tags: [Leads]
 *     summary: Buat lead (publik)
 *     description: Publik/form input dengan honeypot anti-bot dan rate-limit per IP/email. Admin-only fields (assigned_to/assigned_at) akan diproses jika dikirim.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/LeadCreateRequest"
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: "#/components/schemas/LeadCreateRequest"
 *         multipart/form-data:
 *           schema:
 *             $ref: "#/components/schemas/LeadCreateRequest"
 *     responses:
 *       "201":
 *         description: Lead berhasil dibuat.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/LeadCreateResponse"
 *       "400":
 *         description: Bad request.
 *       "422":
 *         description: Validasi gagal (nama kurang dari 2 karakter, email bukan string, assigned/referral/tanggal invalid).
 *       "429":
 *         description: Rate limit tercapai.
 *       "500":
 *         description: Gagal membuat lead.
 */

// Anotasi OpenAPI saja; tidak dieksekusi.
