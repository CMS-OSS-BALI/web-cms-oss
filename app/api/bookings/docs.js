/**
 * @openapi
 * tags:
 *   - name: Bookings
 *     description: Pembuatan booking booth event (publik).
 *
 * components:
 *   schemas:
 *     BoothBookingStatus:
 *       type: string
 *       enum: [PENDING, PAID, EXPIRED, CANCELLED, FAILED, REVIEW]
 *     BoothBookingCreateRequest:
 *       type: object
 *       required:
 *         - event_id
 *         - rep_name
 *         - campus_name
 *         - country
 *         - address
 *         - whatsapp
 *       properties:
 *         event_id:
 *           type: string
 *           description: ID event yang akan dibooking.
 *         rep_name:
 *           type: string
 *           description: Nama perwakilan.
 *         campus_name:
 *           type: string
 *           description: Nama kampus/instansi.
 *         country:
 *           type: string
 *         address:
 *           type: string
 *         whatsapp:
 *           type: string
 *         email:
 *           type: string
 *           format: email
 *           nullable: true
 *         voucher_code:
 *           type: string
 *           nullable: true
 *           description: Opsional; akan divalidasi server-side.
 *     BoothBookingCreateResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *         data:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *             event_id:
 *               type: string
 *           description: order_id/amount tidak dikembalikan untuk keamanan.
 *     BoothBookingError:
 *       type: object
 *       properties:
 *         error:
 *           type: object
 *           properties:
 *             code:
 *               type: string
 *             message:
 *               type: string
 *             field:
 *               type: string
 *               nullable: true
 *
 * /api/bookings:
 *   post:
 *     tags: [Bookings]
 *     summary: Buat booking booth event
 *     description: |
 *       Endpoint publik untuk membuat booking booth. Harga, diskon, dan order_id dihitung di server; respons hanya berisi id & event_id.
 *       Menerima JSON, x-www-form-urlencoded, atau multipart form (hanya field teks; file diabaikan).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/BoothBookingCreateRequest"
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: "#/components/schemas/BoothBookingCreateRequest"
 *         multipart/form-data:
 *           schema:
 *             $ref: "#/components/schemas/BoothBookingCreateRequest"
 *     responses:
 *       "201":
 *         description: Booking berhasil dibuat (status awal PENDING).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/BoothBookingCreateResponse"
 *       "400":
 *         description: Validasi gagal (field wajib, event belum publish, voucher tidak valid).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/BoothBookingError"
 *       "404":
 *         description: Event tidak ditemukan.
 *       "409":
 *         description: Kuota booth habis (code SOLD_OUT).
 *       "500":
 *         description: Kesalahan server saat membuat booking.
 */

// Anotasi OpenAPI saja; tidak dieksekusi.
