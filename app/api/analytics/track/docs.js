/**
 * @openapi
 * tags:
 *   - name: Analytics
 *     description: Endpoint analitik publik untuk mencatat pageview.
 *
 * components:
 *   schemas:
 *     TrackRequest:
 *       type: object
 *       required: [path]
 *       properties:
 *         path:
 *           type: string
 *           description: Path URL (harus diawali "/").
 *         referrer:
 *           type: string
 *           description: Optional. URL referrer (akan dipotong 250 char).
 *     TrackResponse:
 *       type: object
 *       properties:
 *         ok:
 *           type: boolean
 *           example: true
 *     TrackError:
 *       type: object
 *       properties:
 *         ok:
 *           type: boolean
 *           example: false
 *         error:
 *           type: string
 *
 * /api/analytics/track:
 *   post:
 *     tags: [Analytics]
 *     summary: Catat pageview (publik, dengan guard origin + rate limit)
 *     description: |
 *       Mencatat pageview dengan menetapkan cookie analytics (visitor_id/session_id).
 *       Rate limit per visitor+IP. Menolak Origin/Referer yang tidak sesuai host.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/TrackRequest"
 *     responses:
 *       "200":
 *         description: Tercatat.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/TrackResponse"
 *       "400":
 *         description: Payload tidak valid (misal path tidak diawali "/").
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/TrackError"
 *       "403":
 *         description: Origin/Referer tidak diizinkan.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/TrackError"
 *       "429":
 *         description: Rate limited.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/TrackError"
 *       "500":
 *         description: Kesalahan server.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/TrackError"
 */

// Anotasi OpenAPI saja; tidak dieksekusi.
