/**
 * @openapi
 * tags:
 *   - name: Blog
 *     description: Listing dan pengelolaan konten blog (publik & admin).
 *
 * components:
 *   schemas:
 *     BlogItem:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         image_url:
 *           type: string
 *           format: uri
 *         category_id:
 *           type: string
 *           nullable: true
 *         category_slug:
 *           type: string
 *           nullable: true
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         locale_used:
 *           type: string
 *         likes_count:
 *           type: integer
 *         views_count:
 *           type: integer
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *     BlogListResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *         data:
 *           type: array
 *           items:
 *             $ref: "#/components/schemas/BlogItem"
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
 *     BlogCreateRequest:
 *       type: object
 *       required: [name_id]
 *       properties:
 *         name_id:
 *           type: string
 *           description: Judul bahasa Indonesia (wajib).
 *         description_id:
 *           type: string
 *           nullable: true
 *         name_en:
 *           type: string
 *           description: Judul bahasa Inggris (auto translate jika kosong).
 *         description_en:
 *           type: string
 *           nullable: true
 *         category_id:
 *           type: string
 *         category_slug:
 *           type: string
 *         image_url:
 *           type: string
 *           format: uri
 *           description: Alternatif jika tidak mengirim file multipart.
 *         sort:
 *           type: integer
 *         views_count:
 *           type: integer
 *         likes_count:
 *           type: integer
 *         autoTranslate:
 *           type: boolean
 *           default: true
 *           description: Isi otomatis terjemahan EN jika hanya mengisi ID (atau sebaliknya).
 *
 * /api/blog:
 *   get:
 *     tags: [Blog]
 *     summary: Daftar blog
 *     description: |
 *       Publik melihat hanya yang tidak terhapus. Admin dapat menyertakan/menampilkan yang soft-delete via query.
 *     parameters:
 *       - in: query
 *         name: q
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
 *         description: sort|created_at|updated_at; asc/desc. Default dari util `buildOrderBy`.
 *       - in: query
 *         name: category_id
 *         schema:
 *           type: string
 *         description: Filter kategori by id.
 *       - in: query
 *         name: category_slug
 *         schema:
 *           type: string
 *         description: Filter kategori by slug.
 *       - in: query
 *         name: include_category
 *         schema:
 *           type: string
 *           enum: ["0", "1"]
 *         description: Jika 1, sertakan detail kategori pada hasil.
 *       - in: query
 *         name: with_deleted
 *         schema:
 *           type: string
 *           enum: ["0", "1"]
 *         description: Hanya berlaku untuk admin; sertakan soft-delete.
 *       - in: query
 *         name: only_deleted
 *         schema:
 *           type: string
 *           enum: ["0", "1"]
 *         description: Hanya data soft-delete (admin).
 *     responses:
 *       "200":
 *         description: Berhasil mengambil daftar blog.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/BlogListResponse"
 *       "500":
 *         description: Gagal memuat data.
 *   post:
 *     tags: [Blog]
 *     summary: Buat blog (admin)
 *     security:
 *       - BearerAuth: []
 *     description: |
 *       Menerima JSON atau multipart/form-data. Jika multipart, kirim file pada field `file`/`image`/`image_file`.
 *       Auto-translate aktif jika `autoTranslate` tidak diset false.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/BlogCreateRequest"
 *         multipart/form-data:
 *           schema:
 *             allOf:
 *               - $ref: "#/components/schemas/BlogCreateRequest"
 *               - type: object
 *                 properties:
 *                   file:
 *                     type: string
 *                     format: binary
 *                   image:
 *                     type: string
 *                     format: binary
 *                   image_file:
 *                     type: string
 *                     format: binary
 *     responses:
 *       "200":
 *         description: Blog berhasil dibuat.
 *       "400":
 *         description: Validasi gagal.
 *       "401":
 *         description: Unauthorized.
 *       "413":
 *         description: File terlalu besar.
 *       "415":
 *         description: Tipe file tidak didukung.
 *       "422":
 *         description: Kategori tidak ditemukan.
 *       "500":
 *         description: Gagal membuat blog.
 */

// Anotasi OpenAPI saja; tidak dieksekusi.
