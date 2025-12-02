/**
 * @openapi
 * tags:
 *   - name: Blog
 *     description: Statistik blog (view/like).
 *
 * components:
 *   schemas:
 *     BlogStatsRequest:
 *       type: object
 *       properties:
 *         type:
 *           type: string
 *           enum: [view, like]
 *           default: view
 *         inc:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 1
 *     BlogStatsResponse:
 *       type: object
 *       properties:
 *         ok:
 *           type: boolean
 *           example: true
 *         data:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *             views_count:
 *               type: integer
 *             likes_count:
 *               type: integer
 *             updated_at:
 *               type: string
 *               format: date-time
 *     BlogStatsError:
 *       type: object
 *       properties:
 *         ok:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *
 * /api/blog/{id}/stats:
 *   post:
 *     tags: [Blog]
 *     summary: Increment statistik view/like
 *     description: Publik; menambah views_count atau likes_count secara atomik. Nilai increment dikunci 1..50.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/BlogStatsRequest"
 *     responses:
 *       "200":
 *         description: Statistik diperbarui.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/BlogStatsResponse"
 *       "400":
 *         description: Parameter tidak lengkap/invalid.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/BlogStatsError"
 *       "500":
 *         description: Kesalahan server.
 */

// Anotasi OpenAPI saja; tidak dieksekusi.
