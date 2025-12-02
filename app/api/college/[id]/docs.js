/**
 * @openapi
 * tags:
 *   - name: College
 *     description: Detail & mutasi college (detail publik; mutasi admin).
 *
 * components:
 *   schemas:
 *     CollegeItem:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         admin_user_id:
 *           type: string
 *         slug:
 *           type: string
 *         country:
 *           type: string
 *           nullable: true
 *         jenjang:
 *           type: string
 *           nullable: true
 *         website:
 *           type: string
 *           format: uri
 *           nullable: true
 *         mou_url:
 *           type: string
 *           format: uri
 *           nullable: true
 *         logo_url:
 *           type: string
 *           format: uri
 *           nullable: true
 *         address:
 *           type: string
 *           nullable: true
 *         city:
 *           type: string
 *           nullable: true
 *         postal_code:
 *           type: string
 *           nullable: true
 *         tuition_min:
 *           type: number
 *           nullable: true
 *         tuition_max:
 *           type: number
 *           nullable: true
 *         living_cost_estimate:
 *           type: number
 *           nullable: true
 *         currency:
 *           type: string
 *           example: IDR
 *         contact_name:
 *           type: string
 *           nullable: true
 *         no_telp:
 *           type: string
 *           nullable: true
 *         email:
 *           type: string
 *           format: email
 *           nullable: true
 *         catatan:
 *           type: string
 *           nullable: true
 *           description: Catatan internal admin (HTML).
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *         locale_used:
 *           type: string
 *           nullable: true
 *         name:
 *           type: string
 *           nullable: true
 *         description:
 *           type: string
 *           nullable: true
 *     CollegeUpdateRequest:
 *       type: object
 *       properties:
 *         locale:
 *           type: string
 *           default: id
 *         name:
 *           type: string
 *         description:
 *           type: string
 *           nullable: true
 *         slug:
 *           type: string
 *         country:
 *           type: string
 *           nullable: true
 *         jenjang:
 *           type: string
 *           nullable: true
 *           description: Alias `type` juga diterima.
 *         website:
 *           type: string
 *           format: uri
 *           nullable: true
 *         mou_url:
 *           type: string
 *           format: uri
 *           nullable: true
 *         logo_url:
 *           type: string
 *           format: uri
 *           nullable: true
 *         address:
 *           type: string
 *           nullable: true
 *         city:
 *           type: string
 *           nullable: true
 *         postal_code:
 *           type: string
 *           nullable: true
 *         tuition_min:
 *           type: number
 *           nullable: true
 *         tuition_max:
 *           type: number
 *           nullable: true
 *         living_cost_estimate:
 *           type: number
 *           nullable: true
 *         contact_name:
 *           type: string
 *           nullable: true
 *         no_telp:
 *           type: string
 *           nullable: true
 *         email:
 *           type: string
 *           format: email
 *           nullable: true
 *         catatan:
 *           type: string
 *           nullable: true
 *           description: Catatan internal admin.
 *         autoTranslate:
 *           type: boolean
 *           default: false
 *           description: Jika true dan mengubah name/description, isi EN otomatis.
 *     CollegeMutationResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *             logo_url:
 *               type: string
 *               format: uri
 *               nullable: true
 *     CollegeDeleteResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *         data:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *     CollegeError:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *
 * /api/college/{id}:
 *   get:
 *     tags: [College]
 *     summary: Detail college (by id atau slug) - publik
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Bisa UUID (id) atau slug.
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
 *         description: Data ditemukan.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/CollegeItem"
 *       "400":
 *         description: Parameter id kosong.
 *       "404":
 *         description: Tidak ditemukan.
 *       "500":
 *         description: Gagal memuat data.
 *   put:
 *     tags: [College]
 *     summary: Alias PATCH update college (admin)
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
 *             $ref: "#/components/schemas/CollegeUpdateRequest"
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: "#/components/schemas/CollegeUpdateRequest"
 *         multipart/form-data:
 *           schema:
 *             allOf:
 *               - $ref: "#/components/schemas/CollegeUpdateRequest"
 *               - type: object
 *                 properties:
 *                   logo:
 *                     type: string
 *                     format: binary
 *                   file:
 *                     type: string
 *                     format: binary
 *                   logo_file:
 *                     type: string
 *                     format: binary
 *     responses:
 *       "200":
 *         description: College diperbarui.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/CollegeMutationResponse"
 *       "400":
 *         description: Validasi gagal (mis. name kosong saat update terjemahan, logo_url > 1024).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/CollegeError"
 *       "401":
 *         description: Unauthorized.
 *       "403":
 *         description: Forbidden (bukan admin).
 *       "404":
 *         description: Tidak ditemukan.
 *       "413":
 *         description: Logo lebih dari 10MB.
 *       "415":
 *         description: Tipe file tidak didukung.
 *       "500":
 *         description: Gagal memperbarui data.
 *   patch:
 *     tags: [College]
 *     summary: Update college (admin)
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
 *             $ref: "#/components/schemas/CollegeUpdateRequest"
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: "#/components/schemas/CollegeUpdateRequest"
 *         multipart/form-data:
 *           schema:
 *             allOf:
 *               - $ref: "#/components/schemas/CollegeUpdateRequest"
 *               - type: object
 *                 properties:
 *                   logo:
 *                     type: string
 *                     format: binary
 *                   file:
 *                     type: string
 *                     format: binary
 *                   logo_file:
 *                     type: string
 *                     format: binary
 *     responses:
 *       "200":
 *         description: College diperbarui.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/CollegeMutationResponse"
 *       "400":
 *         description: Validasi gagal.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/CollegeError"
 *       "401":
 *         description: Unauthorized.
 *       "403":
 *         description: Forbidden (bukan admin).
 *       "404":
 *         description: Tidak ditemukan.
 *       "413":
 *         description: Logo lebih dari 10MB.
 *       "415":
 *         description: Tipe file tidak didukung.
 *       "500":
 *         description: Gagal memperbarui data.
 *   delete:
 *     tags: [College]
 *     summary: Soft delete college (admin)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       "200":
 *         description: Berhasil dihapus (soft delete).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/CollegeDeleteResponse"
 *       "400":
 *         description: Parameter id kosong.
 *       "401":
 *         description: Unauthorized.
 *       "403":
 *         description: Forbidden (bukan admin).
 *       "500":
 *         description: Gagal menghapus.
 */

// Anotasi OpenAPI saja; tidak dieksekusi.
