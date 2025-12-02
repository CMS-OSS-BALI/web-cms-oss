/**
 * @openapi
 * tags:
 *   - name: Checkin
 *     description: Check-in tiket event (admin only, via NextAuth session).
 *
 * components:
 *   schemas:
 *     TicketStatus:
 *       type: string
 *       enum: [PENDING, CONFIRMED, CANCELLED]
 *     TicketCheckinStatus:
 *       type: string
 *       enum: [NOT_CHECKED_IN, CHECKED_IN]
 *     TicketCheckinRequest:
 *       type: object
 *       required: [code]
 *       properties:
 *         code:
 *           type: string
 *           description: ticket_code atau id tiket.
 *     TicketCheckinData:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         event_id:
 *           type: string
 *         full_name:
 *           type: string
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
 *         qr_url:
 *           type: string
 *           format: uri
 *           nullable: true
 *         status:
 *           $ref: "#/components/schemas/TicketStatus"
 *         total_price:
 *           type: integer
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
 *         checkin_status:
 *           $ref: "#/components/schemas/TicketCheckinStatus"
 *         checked_in_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *     TicketCheckinSuccessResponse:
 *       allOf:
 *         - $ref: "#/components/schemas/TicketCheckinData"
 *       description: Response saat tiket berhasil di-check-in (tanpa field message).
 *     TicketCheckinAlreadyResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: Already checked in
 *         data:
 *           $ref: "#/components/schemas/TicketCheckinData"
 *     TicketCheckinError:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *         field:
 *           type: string
 *           nullable: true
 *
 * /api/checkin:
 *   put:
 *     tags: [Checkin]
 *     summary: Check-in tiket (admin)
 *     description: |
 *       Mengubah `checkin_status` menjadi CHECKED_IN berdasarkan `code` (id atau ticket_code). Hanya admin (session) yang bisa memanggil.
 *       Jika sudah CHECKED_IN, respons tetap 200 dengan pesan "Already checked in".
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/TicketCheckinRequest"
 *     responses:
 *       "200":
 *         description: Berhasil check-in atau sudah pernah check-in.
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: "#/components/schemas/TicketCheckinSuccessResponse"
 *                 - $ref: "#/components/schemas/TicketCheckinAlreadyResponse"
 *       "400":
 *         description: Validasi gagal (code kosong).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/TicketCheckinError"
 *       "401":
 *         description: Unauthorized (belum login admin).
 *       "403":
 *         description: Forbidden (bukan admin).
 *       "404":
 *         description: Ticket tidak ditemukan.
 *       "500":
 *         description: Gagal memproses check-in.
 */

// Anotasi OpenAPI saja; tidak dieksekusi.
