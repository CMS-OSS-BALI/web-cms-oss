/**
 * @openapi
 * tags:
 *   - name: Blog Categories
 *     description: Pengelolaan kategori blog (multi-locale, soft delete untuk admin).
 *
 * components:
 *   schemas:
 *     BlogCategoryItem:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         slug:
 *           type: string
 *         sort:
 *           type: integer
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *         deleted_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         created_ts:
 *           type: integer
 *           nullable: true
 *         updated_ts:
 *           type: integer
 *           nullable: true
 *         name:
 *           type: string
 *           nullable: true
 *         description:
 *           type: string
 *           nullable: true
 *         locale_used:
 *           type: string
 *           nullable: true
 *     BlogCategoryListResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *         data:
 *           type: array
 *           items:
 *             $ref: "#/components/schemas/BlogCategoryItem"
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
 *     BlogCategoryCreateRequest:
 *       type: object
 *       required: [name_id]
 *       properties:
 *         name_id:
 *           type: string
 *           description: Nama kategori Bahasa Indonesia (wajib).
 *         description_id:
 *           type: string
 *           nullable: true
 *         name_en:
 *           type: string
 *           description: Judul EN (akan diisi otomatis bila kosong dan autoTranslate true).
 *         description_en:
 *           type: string
 *           nullable: true
 *         slug:
 *           type: string
 *           description: Kosongkan untuk auto-slugify dari name_id.
 *         sort:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         autoTranslate:
 *           type: boolean
 *           default: true
 *           description: Isi terjemahan EN jika hanya memberi versi ID.
 *     BlogCategoryCreateResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *         data:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *             slug:
 *               type: string
 *             sort:
 *               type: integer
 *             name_id:
 *               type: string
 *             description_id:
 *               type: string
 *               nullable: true
 *             name_en:
 *               type: string
 *               nullable: true
 *             description_en:
 *               type: string
 *               nullable: true
 *     BlogCategoryUpdateRequest:
 *       type: object
 *       properties:
 *         slug:
 *           type: string
 *         sort:
 *           type: integer
 *           minimum: 0
 *         name_id:
 *           type: string
 *         description_id:
 *           type: string
 *           nullable: true
 *         name_en:
 *           type: string
 *         description_en:
 *           type: string
 *           nullable: true
 *         autoTranslate:
 *           type: boolean
 *           default: false
 *           description: Jika true dan mengubah name/description ID, otomatis mengisi versi EN.
 *     BlogCategoryMutationResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *         data:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *
 * /api/blog-categories:
 *   get:
 *     tags: [Blog Categories]
 *     summary: Daftar kategori blog
 *     description: |
 *       Mendukung pencarian teks, pagination, dan pemilihan locale (dengan fallback). Data soft-delete bisa disertakan untuk admin.
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Cari pada name/description locale aktif.
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
 *           default: 12
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           example: created_at:desc
 *         description: created_at|updated_at|sort dengan arah asc/desc. Default ditentukan util `buildOrderBy`.
 *       - in: query
 *         name: with_deleted
 *         schema:
 *           type: string
 *           enum: ["0", "1"]
 *         description: Sertakan yang sudah soft-delete (khusus admin).
 *       - in: query
 *         name: only_deleted
 *         schema:
 *           type: string
 *           enum: ["0", "1"]
 *         description: Hanya kembalikan data yang terhapus (khusus admin).
 *     responses:
 *       "200":
 *         description: Berhasil mengambil daftar kategori.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/BlogCategoryListResponse"
 *       "500":
 *         description: Gagal memuat data.
 *   post:
 *     tags: [Blog Categories]
 *     summary: Buat kategori blog (admin)
 *     security:
 *       - BearerAuth: []
 *     description: Menerima JSON, x-www-form-urlencoded, atau multipart form (hanya field teks). autoTranslate default true.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/BlogCategoryCreateRequest"
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: "#/components/schemas/BlogCategoryCreateRequest"
 *         multipart/form-data:
 *           schema:
 *             $ref: "#/components/schemas/BlogCategoryCreateRequest"
 *     responses:
 *       "201":
 *         description: Kategori berhasil dibuat.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/BlogCategoryCreateResponse"
 *       "400":
 *         description: Validasi gagal (mis. nama/slug tidak valid).
 *       "401":
 *         description: Unauthorized.
 *       "403":
 *         description: Forbidden (bukan admin).
 *       "409":
 *         description: Slug sudah digunakan.
 *       "500":
 *         description: Gagal membuat data.
 */

// Anotasi OpenAPI saja; tidak dieksekusi.
