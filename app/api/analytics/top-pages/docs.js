/**
 * @openapi
 * tags:
 *   - name: Analytics
 *     description: Endpoint analitik (membutuhkan sesi admin atau header kunci baca).
 *
 * components:
 *   schemas:
 *     TopPageRow:
 *       type: object
 *       properties:
 *         path:
 *           type: string
 *         pageviews:
 *           type: integer
 *         sessions:
 *           type: integer
 *         visitors:
 *           type: integer
 *     TopPagesResponse:
 *       type: object
 *       properties:
 *         rows:
 *           type: array
 *           items:
 *             $ref: "#/components/schemas/TopPageRow"
 *     TopPagesError:
 *       type: object
 *       properties:
 *         error:
 *           type: object
 *           properties:
 *             message:
 *               type: string
 *
 * /api/analytics/top-pages:
 *   get:
 *     tags: [Analytics]
 *     summary: Daftar halaman terpopuler
 *     description: Membutuhkan sesi admin atau header `x-analytics-key` yang cocok dengan `ANALYTICS_READ_KEY`.
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           example: 30d
 *         description: Rentang waktu, misal 30d/12w/6m/5y/ytd. Default 30d.
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *       - in: query
 *         name: path_prefix
 *         schema:
 *           type: string
 *         description: Filter path yang dimulai dengan prefix tertentu (misal `/blog`).
 *     responses:
 *       "200":
 *         description: Berhasil mengambil top pages.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/TopPagesResponse"
 *       "401":
 *         description: Unauthorized.
 *       "429":
 *         description: Rate limited.
 *       "500":
 *         description: Kesalahan server.
 */

// Anotasi OpenAPI saja; tidak dieksekusi.
