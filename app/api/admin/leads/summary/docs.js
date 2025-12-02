/**
 * @openapi
 * tags:
 *   - name: Admin - Leads
 *     description: Ringkasan lead untuk dashboard admin.
 *
 * components:
 *   schemas:
 *     LeadsSummaryResponse:
 *       type: object
 *       properties:
 *         year:
 *           type: integer
 *           example: 2025
 *         leads:
 *           type: object
 *           properties:
 *             total:
 *               type: integer
 *             monthly:
 *               type: array
 *               items:
 *                 type: integer
 *               description: 12 angka (index 0 = Jan, 11 = Des).
 *         reps:
 *           type: object
 *           properties:
 *             total:
 *               type: integer
 *             monthly:
 *               type: array
 *               items:
 *                 type: integer
 *               description: 12 angka (index 0 = Jan, 11 = Des) untuk lead yang sudah assigned.
 *         meta:
 *           type: object
 *           properties:
 *             from:
 *               type: string
 *               format: date-time
 *             to:
 *               type: string
 *               format: date-time
 *     LeadsSummaryError:
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
 * /api/admin/leads/summary:
 *   get:
 *     tags: ["Admin - Leads"]
 *     summary: Ringkasan jumlah leads per bulan
 *     description: Membutuhkan sesi admin. Mengembalikan agregat bulanan (total dan yang sudah assigned).
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: year
 *         required: true
 *         schema:
 *           type: integer
 *           example: 2025
 *         description: Tahun yang akan diringkas.
 *     responses:
 *       "200":
 *         description: Ringkasan berhasil diambil.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/LeadsSummaryResponse"
 *       "400":
 *         description: Parameter tidak valid.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/LeadsSummaryError"
 *       "401":
 *         description: Unauthorized.
 */

// Anotasi OpenAPI saja; tidak dieksekusi.
