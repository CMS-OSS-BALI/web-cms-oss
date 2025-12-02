/**
 * @openapi
 * tags:
 *   - name: Auth
 *     description: Layanan autentikasi admin.
 *
 * components:
 *   schemas:
 *     RegisterRequest:
 *       type: object
 *       required: [email, password]
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *         password:
 *           type: string
 *           format: password
 *           description: Minimal 8 karakter.
 *     RegisterResponse:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         email:
 *           type: string
 *           format: email
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *     RegisterError:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *         field:
 *           type: string
 *           nullable: true
 *
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Buat admin baru (hanya untuk dev/testing)
 *     description: |
 *       Endpoint terbuka tanpa auth. Pastikan dinonaktifkan/diamankan sebelum ke production.
 *     security: []  # public
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/RegisterRequest"
 *     responses:
 *       "201":
 *         description: Admin berhasil dibuat.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/RegisterResponse"
 *       "400":
 *         description: Validasi gagal (email/password tidak valid).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/RegisterError"
 *       "409":
 *         description: Email sudah terdaftar.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/RegisterError"
 *       "500":
 *         description: Kesalahan server.
 */

// Anotasi OpenAPI saja; tidak dieksekusi.
