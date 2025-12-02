/**
 * @openapi
 * tags:
 *   - name: Referral
 *     description: Ringkasan statistik referral (admin).
 *
 * components:
 *   schemas:
 *     ReferralSummaryResponse:
 *       type: object
 *       properties:
 *         total: { type: integer }
 *         verified: { type: integer }
 *         pending: { type: integer }
 *         rejected: { type: integer }
 *         with_leads: { type: integer }
 *
 * /api/referral/summary:
 *   get:
 *     tags: [Referral]
 *     summary: Ringkasan referral (admin)
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       "200":
 *         description: Berhasil mengambil ringkasan.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ReferralSummaryResponse"
 *       "401":
 *         description: Unauthorized.
 *       "403":
 *         description: Forbidden.
 *       "500":
 *         description: Gagal memuat ringkasan.
 */

// Anotasi OpenAPI saja; tidak dieksekusi.
