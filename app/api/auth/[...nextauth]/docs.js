/**
 * @openapi
 * tags:
 *   - name: Auth
 *     description: Login admin berbasis NextAuth Credentials serta pengecekan sesi.
 *
 * /api/auth/[...nextauth]/callback/credentials:
 *   post:
 *     tags: [Auth]
 *     summary: Login admin (email & password)
 *     description: |
 *       Gunakan NextAuth Credentials provider. Saat berhasil, server mengirim cookie sesi
 *       (httpOnly) dan response JSON berisi URL tujuan. Contoh di FE: `signIn("credentials", { email, password, redirect: false })`.
 *     security: [] # tidak perlu bearer; cookie dikirim di respons saat sukses
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *           example:
 *             email: admin@example.com
 *             password: secret123
 *     responses:
 *       "200":
 *         description: Login berhasil; cookie sesi di-set.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url:
 *                   type: string
 *                   format: uri
 *                   description: URL tujuan setelah login (callbackUrl).
 *                 status:
 *                   type: number
 *                   description: Kode status login (2xx untuk sukses).
 *       "400":
 *         description: Payload tidak lengkap.
 *       "401":
 *         description: Kredensial salah.
 *
 * /api/auth/session:
 *   get:
 *     tags: [Auth]
 *     summary: Ambil sesi login aktif
 *     description: Mengembalikan payload session NextAuth jika cookie sesi valid.
 *     security: [] # cookie sesi dikirim otomatis oleh browser
 *     responses:
 *       "200":
 *         description: Sesi tersedia.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                       format: email
 *                     name:
 *                       type: string
 *                     image:
 *                       type: string
 *                       format: uri
 *                     role:
 *                       type: string
 *                 expires:
 *                   type: string
 *                   format: date-time
 *       "401":
 *         description: Tidak ada sesi (unauthorized).
 */

// File ini hanya memuat anotasi OpenAPI untuk NextAuth. Tidak ada kode runtime.
