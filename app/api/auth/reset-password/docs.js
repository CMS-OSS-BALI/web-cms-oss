/**
 * @openapi
 * tags:
 *   - name: Auth
 *     description: Layanan autentikasi admin.
 *
 * components:
 *   schemas:
 *     ResetPasswordRequest:
 *       type: object
 *       required: [email, code, new_password]
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *         code:
 *           type: string
 *           pattern: "^\\d{4}$"
 *           description: Kode 4 digit yang dikirim via endpoint forgot-password.
 *         new_password:
 *           type: string
 *           format: password
 *           description: Minimal 8 karakter.
 *     ResetPasswordResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: Password berhasil diubah
 *     ResetPasswordError:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *
 * /api/auth/reset-password:
 *   post:
 *     tags: [Auth]
 *     summary: Verifikasi kode reset dan setel password baru
 *     description: |
 *       Menerima email, kode 4 digit, dan password baru. Jika valid, password diubah
 *       dan semua token reset lainnya dibersihkan. Kuki NextAuth dihapus agar sesi klien keluar.
 *     security: []  # public (mengandalkan kode reset)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/ResetPasswordRequest"
 *     responses:
 *       "200":
 *         description: Password berhasil diubah.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ResetPasswordResponse"
 *       "400":
 *         description: Data tidak lengkap, kode tidak valid, atau token kadaluarsa.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ResetPasswordError"
 *       "500":
 *         description: Kesalahan server saat memproses permintaan.
 */

// Hanya anotasi OpenAPI; tidak dieksekusi.
