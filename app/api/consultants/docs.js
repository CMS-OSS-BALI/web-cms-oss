/**
 * @openapi
 * tags:
 *   - name: Consultants
 *     description: Listing publik & pengelolaan konsultan (admin). PII (email/whatsapp) hanya tampil untuk admin SSR (header x-ssr=1 + session).
 *
 * components:
 *   schemas:
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
 *     ConsultantItem:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         email:
 *           type: string
 *           format: email
 *           nullable: true
 *           description: Hanya hadir jika admin SSR (pii=1).
 *         whatsapp:
 *           type: string
 *           nullable: true
 *           description: Hanya hadir jika admin SSR (pii=1).
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
 *     ConsultantListResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: array
 *           items:
 *             $ref: "#/components/schemas/ConsultantItem"
 *         meta:
 *           type: object
 *           properties:
 *             page:
 *               type: integer
 *             perPage:
 *               type: integer
 *             total:
 *               type: integer
 *             totalPages:
 *               type: integer
 *             locale:
 *               type: string
 *             fallback:
 *               type: string
 *             pii:
 *               type: integer
 *               description: 1 jika email/whatsapp disertakan (admin SSR).
 *     ConsultantCreateRequest:
 *       type: object
 *       required: [name_id, role_id]
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
 *           description: Jika upload file, abaikan field ini.
 *         name_id:
 *           type: string
 *           description: Nama (Bahasa Indonesia) minimal 2 karakter.
 *         role_id:
 *           type: string
 *           description: Peran (Bahasa Indonesia) minimal 2 karakter.
 *         description_id:
 *           type: string
 *           nullable: true
 *         name_en:
 *           type: string
 *           nullable: true
 *         role_en:
 *           type: string
 *           nullable: true
 *         description_en:
 *           type: string
 *           nullable: true
 *         program_images:
 *           type: array
 *           items:
 *             type: string
 *             format: uri
 *           description: URL gambar program; file upload gunakan field files/files[].
 *         autoTranslate:
 *           type: boolean
 *           default: true
 *           description: Isi otomatis terjemahan EN jika field EN kosong.
 *     ConsultantCreateResponse:
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
 *             created_at:
 *               type: string
 *               format: date-time
 *             updated_at:
 *               type: string
 *               format: date-time
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
 * /api/consultants:
 *   get:
 *     tags: [Consultants]
 *     summary: Daftar/ambil konsultan
 *     description: |
 *       - `public=1` untuk akses publik (tanpa PII, cacheable).
 *       - Jika tidak `public=1`, butuh admin; PII hanya muncul jika header x-ssr=1.
 *     parameters:
 *       - in: query
 *         name: public
 *         schema:
 *           type: string
 *           enum: ["0", "1"]
 *         description: Gunakan "1" untuk akses publik.
 *       - in: query
 *         name: id
 *         schema:
 *           type: string
 *         description: Jika diisi, kembalikan hanya konsultan dengan id tersebut.
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Cari pada name/role/description (dan email/whatsapp jika admin).
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
 *         description: Publik dibatasi max 12; admin max 100.
 *       - in: query
 *         name: perpage
 *         schema:
 *           type: integer
 *         description: Alias perPage.
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           example: created_at:desc
 *         description: created_at|updated_at|email dengan asc/desc.
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
 *         description: Berhasil mengambil data.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ConsultantListResponse"
 *       "401":
 *         description: Unauthorized (jika bukan publik dan tidak login admin).
 *       "403":
 *         description: Forbidden (jika bukan admin).
 *       "500":
 *         description: Gagal memuat data.
 *   post:
 *     tags: [Consultants]
 *     summary: Buat konsultan (admin)
 *     security:
 *       - BearerAuth: []
 *     description: |
 *       - Terima JSON atau multipart/form-data.
 *       - Upload avatar (crop 9:16 WebP) via `profile_file`; upload gambar program (crop 16:9 WebP) via `files`/`files[]`.
 *       - `program_images` juga boleh berupa URL string; jika ada file & URL, keduanya digabung.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/ConsultantCreateRequest"
 *         multipart/form-data:
 *           schema:
 *             allOf:
 *               - $ref: "#/components/schemas/ConsultantCreateRequest"
 *               - type: object
 *                 properties:
 *                   profile_file:
 *                     type: string
 *                     format: binary
 *                   files:
 *                     type: array
 *                     items:
 *                       type: string
 *                       format: binary
 *                   "files[]":
 *                     type: array
 *                     items:
 *                       type: string
 *                       format: binary
 *     responses:
 *       "201":
 *         description: Konsultan berhasil dibuat.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ConsultantCreateResponse"
 *       "409":
 *         description: Konflik email/whatsapp unik.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ConsultantError"
 *       "413":
 *         description: File > 10MB.
 *       "415":
 *         description: Tipe file tidak didukung (hanya JPEG/PNG/WebP).
 *       "422":
 *         description: Validasi gagal (name_id/role_id minimal 2 char).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ConsultantError"
 *       "401":
 *         description: Unauthorized.
 *       "403":
 *         description: Forbidden.
 *       "500":
 *         description: Gagal membuat data.
 */

// Anotasi OpenAPI saja; tidak dieksekusi.
