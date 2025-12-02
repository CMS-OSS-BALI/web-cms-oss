/**
 * @openapi
 * tags:
 *   - name: Auth
 *     description: Layanan autentikasi admin.
 *
 * /api/auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Kirim kode reset password (4 digit) ke email admin
 *     description: |
 *       Menghasilkan kode 4 digit, disimpan sebagai hash, dan (jika SMTP aktif) dikirim ke email.
 *       Response selalu `200 OK` untuk mencegah enumerasi email, walaupun email tidak terdaftar
 *       atau sedang dalam masa cooldown pengiriman ulang.
 *     security: []  # tidak perlu bearer; public endpoint
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *           example:
 *             email: admin@example.com
 *     responses:
 *       "200":
 *         description: Permintaan diterima (kode dikirim atau diam-diam diabaikan).
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: OK
 *       "400":
 *         description: Email tidak diisi.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Email wajib diisi
 *       "500":
 *         description: Kesalahan server saat memproses permintaan.
 */

// File ini hanya berisi anotasi OpenAPI; tidak dieksekusi.
