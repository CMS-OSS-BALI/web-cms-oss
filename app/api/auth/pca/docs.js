/**
 * @openapi
 * tags:
 *   - name: Auth
 *     description: Layanan autentikasi admin.
 *
 * components:
 *   schemas:
 *     PCAStatusResponse:
 *       type: object
 *       properties:
 *         pca:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: Timestamp password_changed_at terakhir (ISO). null jika belum ada.
 *     UnauthorizedError:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *           example: unauthorized
 *
 * /api/auth/pca:
 *   get:
 *     tags: [Auth]
 *     summary: Ambil timestamp perubahan password terbaru (PCA) untuk sesi saat ini
 *     description: |
 *       Membutuhkan cookie sesi NextAuth yang valid. Nilai `pca` dipakai FE untuk
 *       memutus sesi jika password diganti.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       "200":
 *         description: Timestamp PCA berhasil diambil.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/PCAStatusResponse"
 *       "401":
 *         description: Token/kuki sesi tidak valid.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/UnauthorizedError"
 */

// Hanya anotasi OpenAPI, tidak dieksekusi.
