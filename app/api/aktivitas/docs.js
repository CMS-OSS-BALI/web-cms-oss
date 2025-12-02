/**
 * @openapi
 * tags:
 *   - name: Aktivitas
 *     description: Konten aktivitas (daftar, detail, CRUD admin).
 *
 * components:
 *   schemas:
 *     AktivitasItem:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         image_url:
 *           type: string
 *           format: uri
 *         sort:
 *           type: integer
 *         is_published:
 *           type: boolean
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
 *         deleted_at_ts:
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
 *     AktivitasListResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *         data:
 *           type: array
 *           items:
 *             $ref: "#/components/schemas/AktivitasItem"
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
 *     AktivitasDetailResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *         data:
 *           $ref: "#/components/schemas/AktivitasItem"
 *     AktivitasCreateRequest:
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
 *           description: Judul bahasa Inggris (auto-translate jika kosong dan autoTranslate true).
 *         description_en:
 *           type: string
 *           nullable: true
 *         image_url:
 *           type: string
 *           format: uri
 *           description: Alternatif jika tidak mengirim file multipart.
 *         sort:
 *           type: integer
 *           default: 0
 *         is_published:
 *           type: boolean
 *           default: false
 *         autoTranslate:
 *           type: boolean
 *           default: true
 *           description: Isi otomatis terjemahan ID/EN jika pasangan kosong.
 *     AktivitasUpdateRequest:
 *       type: object
 *       properties:
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
 *         image_url:
 *           type: string
 *           format: uri
 *         sort:
 *           type: integer
 *         is_published:
 *           type: boolean
 *         autoTranslate:
 *           type: boolean
 *           default: true
 *           description: Isi otomatis terjemahan jika salah satu bahasa kosong.
 *     AktivitasDeleteResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *         data:
 *           $ref: "#/components/schemas/AktivitasItem"
 *
 * /api/aktivitas:
 *   get:
 *     tags: [Aktivitas]
 *     summary: Daftar aktivitas
 *     description: |
 *       Mendukung pencarian, paging, sort, filter publikasi, dan soft-delete. Locale dan fallback menentukan translasi yang dipakai.
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
 *           example: sort:asc
 *         description: sort|created_at|updated_at, asc|desc. Default sort:asc lalu created_at desc.
 *       - in: query
 *         name: with_deleted
 *         schema:
 *           type: string
 *           enum: ["1", "0"]
 *         description: Sertakan yang terhapus (soft delete). Jika 1, hanya menyertakan.
 *       - in: query
 *         name: only_deleted
 *         schema:
 *           type: string
 *           enum: ["1", "0"]
 *         description: Hanya data yang sudah soft-delete.
 *       - in: query
 *         name: is_published
 *         schema:
 *           type: string
 *           enum: ["true", "false"]
 *         description: Filter status publish.
 *     responses:
 *       "200":
 *         description: Berhasil mengambil daftar aktivitas.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/AktivitasListResponse"
 *       "500":
 *         description: Gagal memuat data.
 *   post:
 *     tags: [Aktivitas]
 *     summary: Buat aktivitas (admin)
 *     description: |
 *       Menerima JSON atau multipart/form-data. Jika multipart, kirim file pada field `file`/`image`.
 *       Auto-translate ID/EN jika `autoTranslate` tidak disetel ke false.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/AktivitasCreateRequest"
 *         multipart/form-data:
 *           schema:
 *             allOf:
 *               - $ref: "#/components/schemas/AktivitasCreateRequest"
 *               - type: object
 *                 properties:
 *                   file:
 *                     type: string
 *                     format: binary
 *                   image:
 *                     type: string
 *                     format: binary
 *     responses:
 *       "200":
 *         description: Aktivitas berhasil dibuat.
 *       "400":
 *         description: Validasi gagal (misal name_id atau gambar tidak ada).
 *       "401":
 *         description: Unauthorized.
 *       "413":
 *         description: File terlalu besar.
 *       "415":
 *         description: Tipe file tidak didukung.
 *       "500":
 *         description: Gagal membuat aktivitas.
 */

// Anotasi OpenAPI saja; tidak dieksekusi.
