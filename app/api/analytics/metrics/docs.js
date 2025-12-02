/**
 * @openapi
 * tags:
 *   - name: Analytics
 *     description: Endpoint analitik (membutuhkan sesi admin atau header kunci baca).
 *
 * components:
 *   schemas:
 *     AnalyticsSeriesPoint:
 *       type: object
 *       properties:
 *         bucket:
 *           type: string
 *           description: Label bucket (YYYY-MM-DD / YYYY-MM / YYYY / YYYY-Wxx).
 *         pageviews:
 *           type: integer
 *         sessions:
 *           type: integer
 *         visitors:
 *           type: integer
 *     AnalyticsSeriesResponse:
 *       type: object
 *       properties:
 *         series:
 *           type: array
 *           items:
 *             $ref: "#/components/schemas/AnalyticsSeriesPoint"
 *         group:
 *           type: string
 *           enum: [day, week, month, year]
 *         start:
 *           type: string
 *           format: date
 *         end:
 *           type: string
 *           format: date
 *         label:
 *           type: string
 *     AnalyticsError:
 *       type: object
 *       properties:
 *         error:
 *           type: object
 *           properties:
 *             message:
 *               type: string
 *
 * /api/analytics/metrics:
 *   get:
 *     tags: [Analytics]
 *     summary: Ringkasan pageviews, sessions, visitors
 *     description: |
 *       Membutuhkan sesi admin atau header `x-analytics-key` yang cocok dengan `ANALYTICS_READ_KEY`.
 *       Mendukung filter periode dinamis (period/start+end/days) dan pengelompokan day/week/month/year.
 *     parameters:
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *         description: Mode legacy (tanpa start/end/period/days). Jika group=month, hasil 12 bulan; jika tidak, harian selama setahun.
 *       - in: query
 *         name: group
 *         schema:
 *           type: string
 *           enum: [day, week, month, year]
 *           default: day
 *         description: Interval agregasi.
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *         description: Backward compat. Rentang mundur N hari.
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           example: 30d
 *         description: Bentuk `Nd`, `Nw`, `Nm`, `Ny`, atau `ytd`. Default 30d jika tidak ada parameter lain.
 *       - in: query
 *         name: start
 *         schema:
 *           type: string
 *           format: date
 *         description: Tanggal mulai (UTC). Jika digunakan, wajib bersama `end`.
 *       - in: query
 *         name: end
 *         schema:
 *           type: string
 *           format: date
 *         description: Tanggal akhir (UTC). Jika digunakan, wajib bersama `start`.
 *     responses:
 *       "200":
 *         description: Berhasil mengambil metrik.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/AnalyticsSeriesResponse"
 *       "400":
 *         description: Parameter tidak valid.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/AnalyticsError"
 *       "401":
 *         description: Unauthorized.
 *       "429":
 *         description: Rate limited.
 *       "500":
 *         description: Kesalahan server.
 */

// Anotasi OpenAPI saja; tidak dieksekusi.
