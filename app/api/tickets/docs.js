/**
 * @openapi
 * tags:
 *   - name: Tickets
 *     description: Tiket event dengan QR, status bayar/check-in. Publik bisa membuat tiket; listing/detail & mutasi diakses admin.
 *
 * components:
 *   schemas:
 *     TicketItem:
 *       type: object
 *       properties:
 *         id: { type: string }
 *         event_id: { type: string }
 *         event_title:
 *           type: string
 *           nullable: true
 *         full_name: { type: string }
 *         email:
 *           type: string
 *           format: email
 *         whatsapp:
 *           type: string
 *           nullable: true
 *         school_or_campus:
 *           type: string
 *           nullable: true
 *         class_or_semester:
 *           type: string
 *           nullable: true
 *         domicile:
 *           type: string
 *           nullable: true
 *         ticket_code:
 *           type: string
 *           description: Kode unik tiket + QR.
 *         qr_url:
 *           type: string
 *           format: uri
 *           nullable: true
 *         status:
 *           type: string
 *           enum: [PENDING, CONFIRMED, CANCELLED]
 *         checkin_status:
 *           type: string
 *           enum: [NOT_CHECKED_IN, CHECKED_IN]
 *         total_price:
 *           type: integer
 *           nullable: true
 *         payment_method:
 *           type: string
 *           nullable: true
 *         payment_reference:
 *           type: string
 *           nullable: true
 *         paid_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         expires_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         checked_in_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         created_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         updated_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *     TicketListResponse:
 *       type: object
 *       properties:
 *         page: { type: integer }
 *         perPage: { type: integer }
 *         total: { type: integer }
 *         totalPages: { type: integer }
 *         data:
 *           type: array
 *           items:
 *             $ref: "#/components/schemas/TicketItem"
 *     TicketCreateRequest:
 *       type: object
 *       required: [event_id, full_name, email]
 *       properties:
 *         event_id:
 *           type: string
 *           description: ID event yang dituju (wajib published).
 *         full_name:
 *           type: string
 *           description: Nama peserta.
 *         email:
 *           type: string
 *           format: email
 *         whatsapp:
 *           type: string
 *           nullable: true
 *         school_or_campus:
 *           type: string
 *           nullable: true
 *         class_or_semester:
 *           type: string
 *           nullable: true
 *         domicile:
 *           type: string
 *           nullable: true
 *         payment_method:
 *           type: string
 *           nullable: true
 *           description: Opsional, dipakai jika event berbayar.
 *         payment_reference:
 *           type: string
 *           nullable: true
 *           description: Opsional, dipakai jika event berbayar.
 *     TicketUpdateRequest:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           enum: [PENDING, CONFIRMED, CANCELLED]
 *         payment_method: { type: string, nullable: true }
 *         payment_reference: { type: string, nullable: true }
 *         total_price: { type: integer, nullable: true }
 *         paid_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         expires_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         action:
 *           type: string
 *           enum: [resend]
 *           description: Jika "resend", sistem kirim ulang email tiket.
 *     TicketCreateResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           nullable: true
 *         data:
 *           $ref: "#/components/schemas/TicketItem"
 *     TicketError:
 *       type: object
 *       properties:
 *         message: { type: string }
 *         field:
 *           type: string
 *           nullable: true
 *
 * /api/tickets:
 *   get:
 *     tags: [Tickets]
 *     summary: Daftar tiket (admin/publik tergantung kebijakan)
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: perPage
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *       - in: query
 *         name: locale
 *         schema: { type: string, default: id }
 *       - in: query
 *         name: fallback
 *         schema: { type: string, default: en }
 *       - in: query
 *         name: event_id
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, CONFIRMED, CANCELLED]
 *       - in: query
 *         name: checkin_status
 *         schema:
 *           type: string
 *           enum: [NOT_CHECKED_IN, CHECKED_IN]
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: Cari nama/email/WA/kode tiket/judul event (locale+fallback).
 *     responses:
 *       "200":
 *         description: Berhasil mengambil daftar tiket.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/TicketListResponse"
 *       "500":
 *         description: Gagal memuat data.
 *   post:
 *     tags: [Tickets]
 *     summary: Buat tiket event (publik, rate limited)
 *     description: |
 *       Terima JSON, x-www-form-urlencoded, atau multipart/form-data. Wajib `event_id`, `full_name`, dan `email`. Akan menolak jika sudah ada tiket aktif (PENDING/CONFIRMED) untuk kombinasi event+email. Event FREE otomatis CONFIRMED+paid; event PAID akan PENDING sampai dibayar.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/TicketCreateRequest"
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: "#/components/schemas/TicketCreateRequest"
 *         multipart/form-data:
 *           schema:
 *             $ref: "#/components/schemas/TicketCreateRequest"
 *     responses:
 *       "200":
 *         description: (deprecated; gunakan 201)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/TicketCreateResponse"
 *       "201":
 *         description: Tiket berhasil dibuat.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/TicketCreateResponse"
 *       "400":
 *         description: Validasi gagal (event_id/full_name/email wajib, sold out).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/TicketError"
 *       "404":
 *         description: Event tidak ditemukan / tidak published.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/TicketError"
 *       "409":
 *         description: Sudah terdaftar di event ini (email sama).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/TicketError"
 *       "413":
 *         description: Payload terlalu besar (fallback umum).
 *       "429":
 *         description: Rate limit tercapai.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/TicketError"
 *       "500":
 *         description: Gagal membuat data/kirim email.
 *   patch:
 *     tags: [Tickets]
 *     summary: Perbarui tiket (admin) dengan query id
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: ID tiket yang akan diubah.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/TicketUpdateRequest"
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: "#/components/schemas/TicketUpdateRequest"
 *         multipart/form-data:
 *           schema:
 *             $ref: "#/components/schemas/TicketUpdateRequest"
 *     responses:
 *       "200":
 *         description: Tiket berhasil diperbarui (atau email dikirim ulang jika action=resend).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/TicketItem"
 *       "400":
 *         description: id tidak ada/invalid.
 *       "401":
 *         description: Unauthorized.
 *       "403":
 *         description: Forbidden.
 *       "500":
 *         description: Gagal memperbarui data.
 *   delete:
 *     tags: [Tickets]
 *     summary: Hapus tiket (admin, soft delete) dengan query id
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       "200":
 *         description: Tiket berhasil dihapus (soft delete).
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *                 data:
 *                   $ref: "#/components/schemas/TicketItem"
 *       "400":
 *         description: id tidak ada/invalid.
 *       "401":
 *         description: Unauthorized.
 *       "403":
 *         description: Forbidden.
 *       "500":
 *         description: Gagal menghapus data.
 */

// Anotasi OpenAPI saja; tidak dieksekusi.
