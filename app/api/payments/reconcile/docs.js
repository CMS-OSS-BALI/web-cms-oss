/**
 * @openapi
 * tags:
 *   - name: Payments
 *     description: Rekonsiliasi status pembayaran Midtrans ke booking booth (webhook fallback/manual).
 *
 * components:
 *   schemas:
 *     PaymentReconcileRequest:
 *       type: object
 *       properties:
 *         order_id:
 *           type: string
 *           description: Wajib untuk single reconcile; abaikan jika memakai mode batch (tidak tersedia di route ini).
 *     PaymentReconcileResponse:
 *       type: object
 *       properties:
 *         message: { type: string }
 *         data:
 *           type: object
 *           properties:
 *             order_id: { type: string }
 *             ok: { type: boolean }
 *             status: { type: string }
 *             channel: { type: string, nullable: true }
 *             gross_amount: { type: integer, nullable: true }
 *             matched_amount: { type: boolean, nullable: true }
 *             reason:
 *               type: string
 *               nullable: true
 *               description: Alasan gagal jika ok=false.
 *
 * /api/payments/reconcile:
 *   post:
 *     tags: [Payments]
 *     summary: Rekonsiliasi status pembayaran (admin/internal)
 *     description: |
 *       Mengambil status Midtrans dan menyelaraskan data booking/payments (update status, paid_at, booth_sold_count, voucher usage) jika sudah paid. Hanya untuk environment non-prod jika ALLOW_PUBLIC_RECONCILE=1; sebaliknya perlu token signature internal.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/PaymentReconcileRequest"
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: "#/components/schemas/PaymentReconcileRequest"
 *         multipart/form-data:
 *           schema:
 *             $ref: "#/components/schemas/PaymentReconcileRequest"
 *     responses:
 *       "200":
 *         description: Rekonsiliasi selesai.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/PaymentReconcileResponse"
 *       "400":
 *         description: order_id tidak diisi.
 *       "401":
 *         description: Unauthorized (token signature atau environment tidak mengizinkan).
 *       "404":
 *         description: Booking tidak ditemukan.
 *       "500":
 *         description: Gagal rekonsiliasi.
 */

// Anotasi OpenAPI saja; tidak dieksekusi.
