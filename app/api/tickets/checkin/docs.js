/**
 * @openapi
 * tags:
 *   - name: Tickets
 *     description: Check-in tiket (admin) dengan pengiriman sertifikat & rate limit.
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
 *           description: ticket_code (bisa dikirim via query ?code=... atau body).
 *         resend:
 *           type: boolean
 *           default: false
 *           description: Jika true dan tiket sudah CHECKED_IN, kirim ulang sertifikat.
 *     TicketCheckinTicket:
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
 *           nullable: true
 *         ticket_code:
 *           type: string
 *         status:
 *           $ref: "#/components/schemas/TicketStatus"
 *         checkin_status:
 *           $ref: "#/components/schemas/TicketCheckinStatus"
 *         checked_in_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *     TicketCheckinResult:
 *       type: object
 *       properties:
 *         ticket:
 *           $ref: "#/components/schemas/TicketCheckinTicket"
 *         certificate_sent:
 *           type: boolean
 *         no_certificate:
 *           type: string
 *           description: Nomor sertifikat (jika pengiriman sukses).
 *         event_title:
 *           type: string
 *           description: Judul event (jika pengiriman sukses).
 *         error:
 *           type: string
 *           nullable: true
 *           description: Alasan gagal kirim sertifikat (jika ada).
 *     TicketCheckinSuccessResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: CHECKED_IN & SENT
 *         data:
 *           $ref: "#/components/schemas/TicketCheckinResult"
 *     TicketCheckinResendResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: RESENT
 *         data:
 *           $ref: "#/components/schemas/TicketCheckinResult"
 *     TicketCheckinConflictResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *         data:
 *           type: object
 *           properties:
 *             ticket:
 *               $ref: "#/components/schemas/TicketCheckinTicket"
 *     TicketCheckinError:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *
 * /api/tickets/checkin:
 *   post:
 *     tags: [Tickets]
 *     summary: Check-in tiket (admin) + kirim sertifikat
 *     description: |
 *       Admin saja. Wajib tiket status CONFIRMED dan belum CHECKED_IN. Mengirim sertifikat (best-effort). Dibatasi 30 req / 10 detik per IP (429).
 *       Kirim kode via query (?code=) atau body JSON { code, resend }.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *         description: ticket_code; bila dikirim di body, parameter ini opsional.
 *       - in: query
 *         name: resend
 *         schema:
 *           type: string
 *           enum: ["0", "1", "true", "false"]
 *         description: Kirim ulang sertifikat bila tiket sudah CHECKED_IN.
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/TicketCheckinRequest"
 *     responses:
 *       "200":
 *         description: Berhasil check-in atau kirim ulang sertifikat.
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: "#/components/schemas/TicketCheckinSuccessResponse"
 *                 - $ref: "#/components/schemas/TicketCheckinResendResponse"
 *       "400":
 *         description: Validasi gagal (code kosong) atau status tiket bukan CONFIRMED.
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
 *       "409":
 *         description: Ticket sudah CHECKED_IN (tanpa resend) — respons menyertakan data tiket.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/TicketCheckinConflictResponse"
 *       "429":
 *         description: Rate limit terlampaui (30 request/10 detik per IP).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/TicketCheckinError"
 *       "500":
 *         description: Gagal memproses check-in.
 */

// Anotasi OpenAPI saja; tidak dieksekusi.
