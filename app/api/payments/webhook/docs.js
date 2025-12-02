/**
 * @openapi
 * tags:
 *   - name: Payments
 *     description: Webhook Midtrans untuk update status pembayaran booking booth.
 *
 * components:
 *   schemas:
 *     PaymentWebhookPayload:
 *       type: object
 *       properties:
 *         order_id: { type: string }
 *         status_code: { type: string }
 *         signature_key: { type: string }
 *         transaction_status: { type: string }
 *         payment_type: { type: string }
 *         gross_amount: { type: string }
 *     PaymentWebhookResponse:
 *       type: object
 *       properties:
 *         message: { type: string }
 *         data:
 *           type: object
 *           properties:
 *             id: { type: string }
 *             status: { type: string }
 *
 * /api/payments/webhook:
 *   post:
 *     tags: [Payments]
 *     summary: Terima webhook Midtrans
 *     description: |
 *       Memverifikasi signature, menyimpan log pembayaran, dan memperbarui status booking (PAID/REVIEW/FAILED/EXPIRED/CANCELLED). Juga menangani increment kuota booth dan voucher usage. Payload mengikuti format Midtrans.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/PaymentWebhookPayload"
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: "#/components/schemas/PaymentWebhookPayload"
 *         multipart/form-data:
 *           schema:
 *             $ref: "#/components/schemas/PaymentWebhookPayload"
 *     responses:
 *       "200":
 *         description: Webhook diterima/diproses.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/PaymentWebhookResponse"
 *       "400":
 *         description: order_id kosong.
 *       "401":
 *         description: Signature tidak valid.
 *       "404":
 *         description: Booking tidak ditemukan.
 *       "500":
 *         description: Gagal memproses webhook.
 */

// Anotasi OpenAPI saja; tidak dieksekusi.
