/**
 * @openapi
 * tags:
 *   - name: College
 *     description: Detail & mutasi persyaratan college (public read, admin write).
 *
 * components:
 *   schemas:
 *     CollegeRequirementItem:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         college_id:
 *           type: string
 *         prodi_id:
 *           type: string
 *           nullable: true
 *         sort:
 *           type: integer
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *         locale_used:
 *           type: string
 *           nullable: true
 *         text:
 *           type: string
 *           nullable: true
 *     CollegeRequirementUpdateRequest:
 *       type: object
 *       properties:
 *         locale:
 *           type: string
 *           default: id
 *         text:
 *           type: string
 *           nullable: true
 *         prodi_id:
 *           type: string
 *           nullable: true
 *         sort:
 *           type: integer
 *           nullable: true
 *         autoTranslate:
 *           type: boolean
 *           default: true
 *           description: Jika true dan text diubah, versi EN diisi otomatis.
 *     CollegeRequirementMutationResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *             deleted:
 *               type: boolean
 *               nullable: true
 *     CollegeRequirementError:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *
 * /api/college/{id}/requirements/{reqId}:
 *   get:
 *     tags: [College]
 *     summary: Detail persyaratan (publik)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: reqId
 *         required: true
 *         schema:
 *           type: string
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
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: "#/components/schemas/CollegeRequirementItem"
 *       "400":
 *         description: Parameter tidak lengkap.
 *       "404":
 *         description: Tidak ditemukan.
 *       "500":
 *         description: Gagal memuat data.
 *   put:
 *     tags: [College]
 *     summary: Alias PATCH persyaratan (admin)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: reqId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/CollegeRequirementUpdateRequest"
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: "#/components/schemas/CollegeRequirementUpdateRequest"
 *         multipart/form-data:
 *           schema:
 *             $ref: "#/components/schemas/CollegeRequirementUpdateRequest"
 *     responses:
 *       "200":
 *         description: Persyaratan diperbarui.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/CollegeRequirementMutationResponse"
 *       "400":
 *         description: Validasi gagal (sort bukan integer, prodi_id tidak cocok, text kosong saat update terjemahan).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/CollegeRequirementError"
 *       "401":
 *         description: Unauthorized.
 *       "403":
 *         description: Forbidden (bukan admin).
 *       "404":
 *         description: Tidak ditemukan.
 *       "500":
 *         description: Gagal memperbarui data.
 *   patch:
 *     tags: [College]
 *     summary: Update persyaratan (admin)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: reqId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/CollegeRequirementUpdateRequest"
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: "#/components/schemas/CollegeRequirementUpdateRequest"
 *         multipart/form-data:
 *           schema:
 *             $ref: "#/components/schemas/CollegeRequirementUpdateRequest"
 *     responses:
 *       "200":
 *         description: Persyaratan diperbarui.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/CollegeRequirementMutationResponse"
 *       "400":
 *         description: Validasi gagal.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/CollegeRequirementError"
 *       "401":
 *         description: Unauthorized.
 *       "403":
 *         description: Forbidden (bukan admin).
 *       "404":
 *         description: Tidak ditemukan.
 *       "500":
 *         description: Gagal memperbarui data.
 *   delete:
 *     tags: [College]
 *     summary: Hapus persyaratan (admin)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: reqId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       "200":
 *         description: Persyaratan dihapus.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/CollegeRequirementMutationResponse"
 *       "400":
 *         description: Parameter tidak lengkap.
 *       "401":
 *         description: Unauthorized.
 *       "403":
 *         description: Forbidden (bukan admin).
 *       "404":
 *         description: Tidak ditemukan.
 *       "500":
 *         description: Gagal menghapus.
 */

// Anotasi OpenAPI saja; tidak dieksekusi.
