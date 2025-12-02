/**
 * @openapi
 * tags:
 *   - name: College
 *     description: Listing & pembuatan data college (publik; mutasi admin-only).
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
 *           description: Jenjang/program text (alias field `type` lama).
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
 *     CollegeListResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: array
 *           items:
 *             $ref: "#/components/schemas/CollegeItem"
 *     CollegeCreateRequest:
 *       type: object
 *       required: [name]
 *       properties:
 *         locale:
 *           type: string
 *           default: id
 *         name:
 *           type: string
 *           description: Nama lokal (wajib).
 *         description:
 *           type: string
 *           nullable: true
 *         slug:
 *           type: string
 *           description: Kosongkan untuk auto-generate dari name.
 *         country:
 *           type: string
 *           nullable: true
 *         jenjang:
 *           type: string
 *           nullable: true
 *           description: Alias `type` lama masih diterima.
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
 *           description: Jika upload file, abaikan field ini.
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
 *           default: true
 *           description: Isi otomatis terjemahan EN jika locale bukan EN.
 *     CollegeCreateResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *             slug:
 *               type: string
 *             logo_url:
 *               type: string
 *               format: uri
 *               nullable: true
 *     CollegeError:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *
 * /api/college:
 *   get:
 *     tags: [College]
 *     summary: Daftar college (publik)
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: perPage
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Pencarian bebas (nama/description/city/country).
 *       - in: query
 *         name: country
 *         schema:
 *           type: string
 *       - in: query
 *         name: jenjang
 *         schema:
 *           type: string
 *         description: Filter jenjang (alias `type`).
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Alias untuk `jenjang`.
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
 *         description: Berhasil mengambil daftar college.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/CollegeListResponse"
 *       "500":
 *         description: Gagal mengambil data.
 *   post:
 *     tags: [College]
 *     summary: Buat college (admin)
 *     security:
 *       - BearerAuth: []
 *     description: |
 *       Menerima JSON, x-www-form-urlencoded, atau multipart/form-data. Untuk upload logo kirim file pada field `logo`/`file`/`logo_file` (maks 10MB; JPG/PNG/WebP/SVG). `currency` dikunci IDR.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/CollegeCreateRequest"
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: "#/components/schemas/CollegeCreateRequest"
 *         multipart/form-data:
 *           schema:
 *             allOf:
 *               - $ref: "#/components/schemas/CollegeCreateRequest"
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
 *       "201":
 *         description: College berhasil dibuat.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/CollegeCreateResponse"
 *       "400":
 *         description: Validasi gagal (mis. name kosong, logo_url terlalu panjang).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/CollegeError"
 *       "401":
 *         description: Unauthorized.
 *       "403":
 *         description: Forbidden (bukan admin).
 *       "413":
 *         description: Logo lebih dari 10MB.
 *       "415":
 *         description: Tipe file tidak didukung.
 *       "500":
 *         description: Gagal membuat data.
 */

// Anotasi OpenAPI saja; tidak dieksekusi.
