/**
 * @openapi
 * tags:
 *   - name: Profile
 *     description: Profil admin (NextAuth session). Hanya bisa baca & ubah nama/password akun admin yang sedang login.
 *
 * components:
 *   schemas:
 *     ProfileResponse:
 *       type: object
 *       properties:
 *         name: { type: string }
 *         email: { type: string, format: email }
 *     ProfileUpdateNameRequest:
 *       type: object
 *       required: [name]
 *       properties:
 *         name:
 *           type: string
 *           description: Nama admin baru (maks 191).
 *     ProfileUpdatePasswordRequest:
 *       type: object
 *       required: [current_password, new_password]
 *       properties:
 *         current_password:
 *           type: string
 *         new_password:
 *           type: string
 *           description: Minimal 6 karakter.
 *
 * /api/profile:
 *   get:
 *     tags: [Profile]
 *     summary: Ambil profil admin yang login
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       "200":
 *         description: Profil ditemukan.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ProfileResponse"
 *       "401":
 *         description: Unauthorized.
 *       "403":
 *         description: Forbidden.
 *       "500":
 *         description: Gagal memuat profil.
 *   patch:
 *     tags: [Profile]
 *     summary: Perbarui profil admin
 *     description: |
 *       - Default (tanpa query `action`) → update nama admin.
 *       - `?action=password` → ubah password (wajib current_password & new_password).
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *           enum: [password]
 *         description: Jika `password`, body mengikuti schema ProfileUpdatePasswordRequest.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - $ref: "#/components/schemas/ProfileUpdateNameRequest"
 *               - $ref: "#/components/schemas/ProfileUpdatePasswordRequest"
 *         application/x-www-form-urlencoded:
 *           schema:
 *             oneOf:
 *               - $ref: "#/components/schemas/ProfileUpdateNameRequest"
 *               - $ref: "#/components/schemas/ProfileUpdatePasswordRequest"
 *     responses:
 *       "200":
 *         description: Berhasil diperbarui (nama atau password).
 *       "400":
 *         description: Validasi gagal (nama kosong, password salah/panjang kurang).
 *       "401":
 *         description: Unauthorized.
 *       "403":
 *         description: Forbidden.
 *       "500":
 *         description: Gagal memperbarui.
 */

// Anotasi OpenAPI saja; tidak dieksekusi.
