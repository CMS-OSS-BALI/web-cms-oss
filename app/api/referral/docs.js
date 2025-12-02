/**
 * @openapi
 * tags:
 *   - name: Referral
 *     description: Pengajuan program referral (publik) dan listing admin dengan status/verifikasi & bukti KTP.
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
 *         gender:
 *           type: string
 *           enum: [MALE, FEMALE]
 *           nullable: true
 *         status:
 *           type: string
 *           enum: [PENDING, REJECTED, VERIFIED]
 *         code:
 *           type: string
 *           nullable: true
 *           description: Kode referral (setelah verifikasi).
 *         pic_consultant_id:
 *           type: string
 *           nullable: true
 *         city:
 *           type: string
 *           nullable: true
 *         province:
 *           type: string
 *           nullable: true
 *         pekerjaan:
 *           type: string
 *           nullable: true
 *         ktp_url:
 *           type: string
 *           format: uri
 *           nullable: true
 *         leads_count:
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
 *         created_ts:
 *           type: integer
 *           nullable: true
 *         updated_ts:
 *           type: integer
 *           nullable: true
 *     ReferralListResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: array
 *           items:
 *             $ref: "#/components/schemas/ReferralItem"
 *         meta:
 *           type: object
 *           properties:
 *             page: { type: integer }
 *             perPage: { type: integer }
 *             total: { type: integer }
 *             totalPages: { type: integer }
 *     ReferralCreateRequest:
 *       type: object
 *       required: [full_name, nik]
 *       properties:
 *         full_name:
 *           type: string
 *         nik:
 *           type: string
 *           description: Harus 16 digit; karakter non-digit akan dibersihkan.
 *         email:
 *           type: string
 *           format: email
 *           nullable: true
 *         whatsapp:
 *           type: string
 *           nullable: true
 *         gender:
 *           type: string
 *           enum: [MALE, FEMALE]
 *           nullable: true
 *         pekerjaan:
 *           type: string
 *           nullable: true
 *         city:
 *           type: string
 *           nullable: true
 *         province:
 *           type: string
 *           nullable: true
 *         ktp_url:
 *           type: string
 *           format: uri
 *           nullable: true
 *           description: Jika upload file, abaikan field ini.
 *         ktp_file:
 *           type: string
 *           format: binary
 *           description: Foto KTP (JPEG/PNG/WebP, max 5MB).
 *     ReferralCreateResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: object
 *           properties:
 *             id: { type: string }
 *
 * /api/referral:
 *   get:
 *     tags: [Referral]
 *     summary: Daftar referral (admin)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: Cari di nik/nama/email/whatsapp/code/city/province/pekerjaan.
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, REJECTED, VERIFIED]
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: perPage
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 10 }
 *     responses:
 *       "200":
 *         description: Berhasil mengambil daftar referral.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ReferralListResponse"
 *       "401":
 *         description: Unauthorized.
 *       "403":
 *         description: Forbidden.
 *       "500":
 *         description: Gagal memuat data.
 *   post:
 *     tags: [Referral]
 *     summary: Ajukan referral (publik)
 *     description: |
 *       Publik mengirim data referral dengan NIK wajib. Foto KTP wajib baik via `ktp_url` atau upload file (`ktp_file`, max 5MB, JPEG/PNG/WebP). Email/WhatsApp optional, akan diformat jika memungkinkan. Status awal PENDING.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/ReferralCreateRequest"
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: "#/components/schemas/ReferralCreateRequest"
 *         multipart/form-data:
 *           schema:
 *             allOf:
 *               - $ref: "#/components/schemas/ReferralCreateRequest"
 *               - type: object
 *                 properties:
 *                   ktp_file:
 *                     type: string
 *                     format: binary
 *     responses:
 *       "201":
 *         description: Referral berhasil dibuat (status PENDING).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ReferralCreateResponse"
 *       "400":
 *         description: Validasi gagal (NIK kosong/kurang digit, KTP tidak dikirim).
 *       "401":
 *         description: Unauthorized (untuk endpoint privat).
 *       "413":
 *         description: File > 5MB.
 *       "415":
 *         description: Tipe file tidak didukung.
 *       "500":
 *         description: Gagal membuat data.
 */

// Anotasi OpenAPI saja; tidak dieksekusi.
