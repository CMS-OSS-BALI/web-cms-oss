/**
 * @openapi
 * tags:
 *   - name: Auth
 *     description: Layanan autentikasi admin.
 *
 * components:
 *   schemas:
 *     Profile:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         name:
 *           type: string
 *           nullable: true
 *         email:
 *           type: string
 *           format: email
 *         no_whatsapp:
 *           type: string
 *           nullable: true
 *         profile_photo:
 *           type: string
 *           format: uri
 *           nullable: true
 *         image_public_url:
 *           type: string
 *           format: uri
 *           nullable: true
 *         updated_at:
 *           type: string
 *           format: date-time
 *     ProfileUpdateRequest:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *         email:
 *           type: string
 *           format: email
 *         no_whatsapp:
 *           type: string
 *         profile_photo:
 *           type: string
 *           description: Boleh berisi URL publik atau key yang akan dinormalisasi.
 *         size:
 *           type: integer
 *           description: Opsional. Target ukuran square (px) jika upload avatar multipart. Default 600.
 *     ProfileError:
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
 * /api/auth/profile:
 *   get:
 *     tags: [Auth]
 *     summary: Ambil profil admin saat ini
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       "200":
 *         description: Profil berhasil diambil.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Profile"
 *       "401":
 *         description: Unauthorized.
 *   patch:
 *     tags: [Auth]
 *     summary: Perbarui profil admin
 *     description: |
 *       Menerima JSON atau multipart/form-data. Jika multipart, kirim avatar pada field `avatar`/`image`/`file`/`profile_photo`.
 *       Avatar akan diubah ke WebP square 1:1 dan disimpan sebagai URL publik.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/ProfileUpdateRequest"
 *         multipart/form-data:
 *           schema:
 *             allOf:
 *               - $ref: "#/components/schemas/ProfileUpdateRequest"
 *               - type: object
 *                 properties:
 *                   avatar:
 *                     type: string
 *                     format: binary
 *                   image:
 *                     type: string
 *                     format: binary
 *                   file:
 *                     type: string
 *                     format: binary
 *                   profile_photo:
 *                     type: string
 *                     format: binary
 *     responses:
 *       "200":
 *         description: Profil berhasil diperbarui.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Profile"
 *       "400":
 *         description: Validasi gagal (email sudah dipakai, format salah, dsb).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ProfileError"
 *       "401":
 *         description: Unauthorized.
 *       "413":
 *         description: File terlalu besar.
 *       "415":
 *         description: Tipe file tidak didukung.
 */

// Hanya anotasi OpenAPI; tidak dieksekusi.
