/**
 * @openapi
 * tags:
 *   - name: Payments
 *     description: Pembentukan transaksi Midtrans Snap untuk booking booth event.
 *
 * components:
 *   schemas:
 *     PaymentChargeRequest:
 *       type: object
 *       properties:
 *         booking_id:
 *           type: string
 *           description: ID booking booth. Jika kosong, gunakan order_id.
 *         order_id:
 *           type: string
 *           description: Alternatif booking_id.
 *         enabled_payments:
 *           oneOf:
 *             - type: string
 *             - type: array
 *               items: { type: string }
 *           description: Subset kanal Midtrans; jika tidak diisi atau "all", Snap menampilkan semua yang aktif.
 *     PaymentChargeResponse:
 *       type: object
 *       properties:
 *         message: { type: string }
 *         data:
 *           type: object
 *           properties:
 *             token:
 *               type: string
 *               description: Token Snap untuk redirect/SDK.
 *             redirect_url:
 *               type: string
 *               format: uri
 *             order_id:
 *               type: string
 *             amount:
 *               type: integer
 *             payment_token:
 *               type: string
 *               nullable: true
 *               description: Token signature untuk endpoint check (optional).
 *
 * /api/payments/charge:
 *   post:
 *     tags: [Payments]
 *     summary: Buat transaksi pembayaran Midtrans untuk booking booth
 *     description: |
 *       Membentuk Snap token (Midtrans) untuk booking booth. Menangani idempotensi (reuse token jika gross sama), fee passthrough/worst-case, dan validasi kuota/status booking.
 *       Tidak memerlukan auth khusus selain token signature internal (lihat implementation). Input via JSON/form-data.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/PaymentChargeRequest"
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: "#/components/schemas/PaymentChargeRequest"
 *         multipart/form-data:
 *           schema:
 *             $ref: "#/components/schemas/PaymentChargeRequest"
 *     responses:
 *       "200":
 *         description: Token berhasil dibuat atau di-reuse.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/PaymentChargeResponse"
 *       "400":
 *         description: Validasi gagal (booking/order id kosong, channel tidak dikenal).
 *       "404":
 *         description: Booking tidak ditemukan.
 *       "409":
 *         description: Booking sudah dibayar/kuota habis.
 *       "413":
 *         description: Payload terlalu besar (jarang terjadi).
 *       "500":
 *         description: Gagal membuat token pembayaran.
 */

// Anotasi OpenAPI saja; tidak dieksekusi.
