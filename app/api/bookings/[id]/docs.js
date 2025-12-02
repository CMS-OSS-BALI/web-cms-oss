/**
 * @openapi
 * tags:
 *   - name: Bookings
 *     description: Detail & pembatalan booking booth (admin).
 *
 * components:
 *   schemas:
 *     BoothBookingStatus:
 *       type: string
 *       enum: [PENDING, PAID, EXPIRED, CANCELLED, FAILED, REVIEW]
 *     BoothBookingPaymentItem:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         order_id:
 *           type: string
 *         channel:
 *           type: string
 *           nullable: true
 *         status:
 *           type: string
 *         gross_amount:
 *           type: integer
 *         created_at:
 *           type: string
 *           format: date-time
 *     BoothBookingEventSummary:
 *       type: object
 *       properties:
 *         booth_price:
 *           type: integer
 *         booth_quota:
 *           type: integer
 *           nullable: true
 *         booth_sold_count:
 *           type: integer
 *         start_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         end_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *     BoothBookingDetail:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         order_id:
 *           type: string
 *           nullable: true
 *         event_id:
 *           type: string
 *         status:
 *           $ref: "#/components/schemas/BoothBookingStatus"
 *         amount:
 *           type: integer
 *         voucher_code:
 *           type: string
 *           nullable: true
 *         rep_name:
 *           type: string
 *         campus_name:
 *           type: string
 *         country:
 *           type: string
 *         address:
 *           type: string
 *         whatsapp:
 *           type: string
 *         email:
 *           type: string
 *           nullable: true
 *         created_at:
 *           type: string
 *           format: date-time
 *         paid_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         event:
 *           $ref: "#/components/schemas/BoothBookingEventSummary"
 *         payments:
 *           type: array
 *           items:
 *             $ref: "#/components/schemas/BoothBookingPaymentItem"
 *     BoothBookingDetailResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *         data:
 *           $ref: "#/components/schemas/BoothBookingDetail"
 *     BoothBookingMutationResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *         data:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *             status:
 *               $ref: "#/components/schemas/BoothBookingStatus"
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
 * /api/bookings/{id}:
 *   get:
 *     tags: [Bookings]
 *     summary: Detail booking booth (admin)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       "200":
 *         description: Data booking ditemukan.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/BoothBookingDetailResponse"
 *       "401":
 *         description: Unauthorized (bukan admin).
 *       "403":
 *         description: Forbidden.
 *       "404":
 *         description: Booking tidak ditemukan.
 *       "500":
 *         description: Gagal memuat data booking.
 *   delete:
 *     tags: [Bookings]
 *     summary: Batalkan/hapus booking booth (admin)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       "200":
 *         description: Booking dihapus (jika belum PAID).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/BoothBookingMutationResponse"
 *       "401":
 *         description: Unauthorized (bukan admin).
 *       "403":
 *         description: Forbidden.
 *       "404":
 *         description: Booking tidak ditemukan.
 *       "409":
 *         description: State tidak valid (sudah dibayar) atau FK constraint.
 *       "500":
 *         description: Gagal membatalkan booking.
 */

// Anotasi OpenAPI saja; tidak dieksekusi.
