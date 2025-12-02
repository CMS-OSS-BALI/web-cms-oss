/**
 * @openapi
 * tags:
 *   - name: Consultants
 *     description: Detail & mutasi konsultan (detail publik opsional, mutasi admin).
 *
 * components:
 *   schemas:
 *     ConsultantItem:
 *       type: object
 *       properties:
 *         id: { type: string }
 *         email:
 *           type: string
 *           format: email
 *           nullable: true
 *         whatsapp:
 *           type: string
 *           nullable: true
 *         profile_image_url:
 *           type: string
 *           format: uri
 *           nullable: true
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *         name:
 *           type: string
 *           nullable: true
 *         role:
 *           type: string
 *           nullable: true
 *         description:
 *           type: string
 *           nullable: true
 *         locale_used:
 *           type: string
 *           nullable: true
 *         program_images:
 *           type: array
 *           items:
 *             $ref: "#/components/schemas/ConsultantProgramImage"
 *     ConsultantProgramImage:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         image_url:
 *           type: string
 *           format: uri
 *         sort:
 *           type: integer
 *     ConsultantUpdateRequest:
 *       type: object
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           nullable: true
 *         whatsapp:
 *           type: string
 *           nullable: true
 *         profile_image_url:
 *           type: string
 *           format: uri
 *           nullable: true
 *         profile_file:
 *           type: string
 *           format: binary
 *           description: Upload avatar (crop 9:16 WebP).
 *         name_id:
 *           type: string
 *         role_id:
 *           type: string
 *         description_id:
 *           type: string
 *           nullable: true
 *         name_en:
 *           type: string
 *         role_en:
 *           type: string
 *         description_en:
 *           type: string
 *           nullable: true
 *         program_images:
 *           type: array
 *           items:
 *             type: string
 *             format: uri
 *         program_images_mode:
 *           type: string
 *           enum: [replace, append]
 *           default: replace
 *         files:
 *           type: array
 *           items:
 *             type: string
 *             format: binary
 *           description: Upload gambar program (crop 16:9 WebP).
 *         files[]:
 *           type: array
 *           items:
 *             type: string
 *             format: binary
 *         autoTranslate:
 *           type: boolean
 *           default: false
 *           description: Jika true dan mengubah field ID, otomatis isi terjemahan EN.
 *     ConsultantMutationResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *             profile_image_url:
 *               type: string
 *               format: uri
 *               nullable: true
 *     ConsultantError:
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
 * /api/consultants/{id}:
 *   get:
 *     tags: [Consultants]
 *     summary: Detail konsultan
 *     description: |
 *       - `public=1` untuk akses publik (tanpa PII).
 *       - Jika tidak `public=1`, butuh admin; PII hanya muncul bila header `x-ssr: 1`.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: public
 *         schema:
 *           type: string
 *           enum: ["0", "1"]
 *       - in: query
 *         name: locale
 *         schema:
 *           type: string
 *           default: id
 *       - in: query
 *         name: fallback
 *         schema:
 *           type: string
 *           default: id
 *     responses:
 *       "200":
 *         description: Detail ditemukan.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: "#/components/schemas/ConsultantItem"
 *       "401":
 *         description: Unauthorized (jika bukan publik dan tidak login admin).
 *       "403":
 *         description: Forbidden.
 *       "404":
 *         description: Tidak ditemukan.
 *       "500":
 *         description: Gagal memuat data.
 *   put:
 *     tags: [Consultants]
 *     summary: Alias PATCH update konsultan (admin)
 *     security:
 *       - BearerAuth: []
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
 *             $ref: "#/components/schemas/ConsultantUpdateRequest"
 *         multipart/form-data:
 *           schema:
 *             $ref: "#/components/schemas/ConsultantUpdateRequest"
 *     responses:
 *       "200":
 *         description: Konsultan diperbarui.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ConsultantMutationResponse"
 *       "400":
 *         description: Bad id atau validasi.
 *       "401":
 *         description: Unauthorized.
 *       "403":
 *         description: Forbidden.
 *       "404":
 *         description: Tidak ditemukan.
 *       "409":
 *         description: Konflik email/whatsapp unik.
 *       "413":
 *         description: File > 10MB.
 *       "415":
 *         description: Tipe file tidak didukung (JPEG/PNG/WebP).
 *       "500":
 *         description: Gagal memperbarui data.
 *   patch:
 *     tags: [Consultants]
 *     summary: Update konsultan (admin)
 *     security:
 *       - BearerAuth: []
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
 *             $ref: "#/components/schemas/ConsultantUpdateRequest"
 *         multipart/form-data:
 *           schema:
 *             $ref: "#/components/schemas/ConsultantUpdateRequest"
 *     responses:
 *       "200":
 *         description: Konsultan diperbarui.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ConsultantMutationResponse"
 *       "400":
 *         description: Bad id atau validasi.
 *       "401":
 *         description: Unauthorized.
 *       "403":
 *         description: Forbidden.
 *       "404":
 *         description: Tidak ditemukan.
 *       "409":
 *         description: Konflik email/whatsapp unik.
 *       "413":
 *         description: File > 10MB.
 *       "415":
 *         description: Tipe file tidak didukung (JPEG/PNG/WebP).
 *       "500":
 *         description: Gagal memperbarui data.
 *   delete:
 *     tags: [Consultants]
 *     summary: Hapus konsultan (admin)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       "204":
 *         description: Berhasil dihapus (beserta cleanup gambar best-effort).
 *       "400":
 *         description: Bad id.
 *       "401":
 *         description: Unauthorized.
 *       "403":
 *         description: Forbidden.
 *       "404":
 *         description: Tidak ditemukan.
 *       "500":
 *         description: Gagal menghapus.
 */

// Anotasi OpenAPI saja; tidak dieksekusi.
