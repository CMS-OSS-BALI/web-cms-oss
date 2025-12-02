/**
 * @openapi
 * tags:
 *   - name: College
 *     description: Persyaratan college per program (list publik, mutasi admin).
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
 *     CollegeRequirementListResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: array
 *           items:
 *             $ref: "#/components/schemas/CollegeRequirementItem"
 *     CollegeRequirementCreateRequest:
 *       type: object
 *       required: [text]
 *       properties:
 *         locale:
 *           type: string
 *           default: id
 *         text:
 *           type: string
 *           description: Konten persyaratan (wajib).
 *         prodi_id:
 *           type: string
 *           nullable: true
 *         sort:
 *           type: integer
 *           nullable: true
 *           description: Jika kosong, auto increment.
 *         autoTranslate:
 *           type: boolean
 *           default: true
 *           description: Isi EN otomatis jika locale bukan EN.
 *     CollegeRequirementMutationResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *     CollegeRequirementError:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *
 * /api/college/{id}/requirements:
 *   get:
 *     tags: [College]
 *     summary: Daftar persyaratan (publik)
 *     parameters:
 *       - in: path
 *         name: id
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
 *       - in: query
 *         name: prodi_id
 *         schema:
 *           type: string
 *           description: Filter per prodi (opsional).
 *     responses:
 *       "200":
 *         description: Berhasil mengambil list persyaratan.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/CollegeRequirementListResponse"
 *       "404":
 *         description: College tidak ditemukan.
 *       "500":
 *         description: Gagal memuat data.
 *   post:
 *     tags: [College]
 *     summary: Tambah persyaratan (admin)
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/CollegeRequirementCreateRequest"
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: "#/components/schemas/CollegeRequirementCreateRequest"
 *         multipart/form-data:
 *           schema:
 *             $ref: "#/components/schemas/CollegeRequirementCreateRequest"
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       "201":
 *         description: Persyaratan berhasil dibuat.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/CollegeRequirementMutationResponse"
 *       "400":
 *         description: Validasi gagal (text kosong, prodi_id invalid, sort bukan integer).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/CollegeRequirementError"
 *       "401":
 *         description: Unauthorized.
 *       "403":
 *         description: Forbidden (bukan admin).
 *       "404":
 *         description: College tidak ditemukan.
 *       "500":
 *         description: Gagal membuat data.
 */

// Anotasi OpenAPI saja; tidak dieksekusi.
