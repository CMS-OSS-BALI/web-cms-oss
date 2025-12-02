/**
 * @openapi
 * tags:
 *   - name: Payments
 *     description: Cek status pembayaran booking booth (Midtrans) dengan rate-limit + token signature.
 *
 * components:
 *   schemas:
 *     PaymentCheckResponse:
 *       type: object
 *       properties:
 *         message: { type: string }
 *         data:
 *           type: object
 *           properties:
 *             booking:
 *               type: object
 *               properties:
 *                 id: { type: string }
 *                 order_id: { type: string }
 *                 status: { type: string }
 *                 amount: { type: integer }
 *                 last_payment:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     id: { type: string }
 *                     status: { type: string }
 *                     channel: { type: string }
 *                     gross_amount: { type: integer }
 *                     created_at: { type: string, format: date-time }
 *             midtrans:
 *               type: object
 *               nullable: true
 *               properties:
 *                 transaction_status: { type: string, nullable: true }
 *                 fraud_status: { type: string, nullable: true }
 *                 payment_type: { type: string, nullable: true }
 *                 mapped: { type: string, nullable: true }
 *                 gross_amount: { type: integer, nullable: true }
 *                 status_code: { type: string, nullable: true }
 *                 error: { type: string, nullable: true }
 *                 info: { type: object, nullable: true }
 *             expected_gross: { type: integer }
 *             amount_match:
 *               type: boolean
 *               nullable: true
 *             advice:
 *               type: string
 *               description: Saran UI (await_webhook_or_reconcile, none)
 *
 * /api/payments/check:
 *   get:
 *     tags: [Payments]
 *     summary: Cek status pembayaran booking booth
 *     description: Rate-limited per IP. Membutuhkan token signature (internal) atau signed nonce; digunakan frontend internal setelah redirect/cek status.
 *     parameters:
 *       - in: query
 *         name: order_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       "200":
 *         description: Status berhasil diambil.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/PaymentCheckResponse"
 *       "400":
 *         description: order_id kosong.
 *       "401":
 *         description: Unauthorized (token signature invalid).
 *       "404":
 *         description: Booking tidak ditemukan.
 *       "429":
 *         description: Terkena rate limit.
 *       "500":
 *         description: Gagal mengambil status.
 */

// Anotasi OpenAPI saja; tidak dieksekusi.
