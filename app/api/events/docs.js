/**
 * @openapi
 * tags:
 *   - name: Events
 *     description: Listing & pembuatan event (publik melihat yang published; admin bisa CRUD, soft delete, dan include data booth).
 *
 * components:
 *   schemas:
 *     EventItem:
 *       type: object
 *       properties:
 *         id: { type: string }
 *         banner_url:
 *           type: string
 *           format: uri
 *           nullable: true
 *         is_published:
 *           type: boolean
 *         start_at:
 *           type: string
 *           format: date-time
 *         end_at:
 *           type: string
 *           format: date-time
 *         start_ts:
 *           type: integer
 *           nullable: true
 *         end_ts:
 *           type: integer
 *           nullable: true
 *         location:
 *           type: string
 *         capacity:
 *           type: integer
 *           nullable: true
 *         pricing_type:
 *           type: string
 *           enum: [FREE, PAID]
 *         ticket_price:
 *           type: integer
 *         category_id:
 *           type: string
 *           nullable: true
 *         category_slug:
 *           type: string
 *           nullable: true
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *         created_ts:
 *           type: integer
 *           nullable: true
 *         updated_ts:
 *           type: integer
 *           nullable: true
 *         title:
 *           type: string
 *           nullable: true
 *         description:
 *           type: string
 *           nullable: true
 *         locale_used:
 *           type: string
 *           nullable: true
 *         sold:
 *           type: integer
 *         remaining:
 *           type: integer
 *           nullable: true
 *         category_name:
 *           type: string
 *           nullable: true
 *         category_description:
 *           type: string
 *           nullable: true
 *         category_locale_used:
 *           type: string
 *           nullable: true
 *         booth_price:
 *           type: integer
 *         booth_quota:
 *           type: integer
 *           nullable: true
 *         booth_sold_count:
 *           type: integer
 *         booth_remaining:
 *           type: integer
 *           nullable: true
 *     EventListResponse:
 *       type: object
 *       properties:
 *         message: { type: string }
 *         data:
 *           type: array
 *           items:
 *             $ref: "#/components/schemas/EventItem"
 *         meta:
 *           type: object
 *           properties:
 *             page: { type: integer }
 *             perPage: { type: integer }
 *             total: { type: integer }
 *             totalPages: { type: integer }
 *             locale: { type: string }
 *             fallback: { type: string }
 *     EventCreateRequest:
 *       type: object
 *       required: [title_id, start_at, end_at, location]
 *       properties:
 *         title_id:
 *           type: string
 *           description: Judul Bahasa Indonesia (wajib).
 *         description_id:
 *           type: string
 *           nullable: true
 *         title_en:
 *           type: string
 *           nullable: true
 *         description_en:
 *           type: string
 *           nullable: true
 *         start_at:
 *           type: string
 *           format: date-time
 *         end_at:
 *           type: string
 *           format: date-time
 *         location:
 *           type: string
 *         is_published:
 *           type: boolean
 *           default: false
 *         capacity:
 *           type: integer
 *           nullable: true
 *         pricing_type:
 *           type: string
 *           enum: [FREE, PAID]
 *           default: FREE
 *         ticket_price:
 *           type: integer
 *           description: Wajib >=1 jika pricing_type=PAID; diabaikan jika FREE.
 *         category_id:
 *           type: string
 *           nullable: true
 *         category_slug:
 *           type: string
 *           nullable: true
 *         banner_url:
 *           type: string
 *           format: uri
 *           nullable: true
 *           description: Jika upload file, abaikan field ini.
 *         booth_price:
 *           type: integer
 *           default: 0
 *         booth_quota:
 *           type: integer
 *           nullable: true
 *         autoTranslate:
 *           type: boolean
 *           default: true
 *           description: Isi otomatis terjemahan EN jika field EN kosong.
 *     EventCreateResponse:
 *       type: object
 *       properties:
 *         message: { type: string }
 *         data:
 *           type: object
 *           properties:
 *             id: { type: string }
 *             banner_url:
 *               type: string
 *               format: uri
 *               nullable: true
 *             title_id: { type: string }
 *             description_id:
 *               type: string
 *               nullable: true
 *             title_en:
 *               type: string
 *               nullable: true
 *             description_en:
 *               type: string
 *               nullable: true
 *             category_id:
 *               type: string
 *               nullable: true
 *             booth_price:
 *               type: integer
 *             booth_quota:
 *               type: integer
 *               nullable: true
 *             booth_sold_count:
 *               type: integer
 *               nullable: true
 *
 * /api/events:
 *   get:
 *     tags: [Events]
 *     summary: Daftar event
 *     description: Publik hanya melihat event published & tidak terhapus. Admin dapat menyertakan soft-delete, filter is_published, dan include kategori.
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: Cari di judul/deskripsi lokasi/kategori sesuai locale+fallback.
 *       - in: query
 *         name: locale
 *         schema: { type: string, default: id }
 *       - in: query
 *         name: fallback
 *         schema: { type: string, default: id }
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: perPage
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 12 }
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           example: start_at:asc
 *         description: start_at|end_at|created_at|updated_at dengan asc/desc; default di helper getOrderBy.
 *       - in: query
 *         name: with_deleted
 *         schema: { type: string, enum: ["0", "1"] }
 *         description: Sertakan soft-delete (admin).
 *       - in: query
 *         name: only_deleted
 *         schema: { type: string, enum: ["0", "1"] }
 *         description: Hanya data soft-delete (admin).
 *       - in: query
 *         name: include_category
 *         schema: { type: string, enum: ["0", "1"] }
 *       - in: query
 *         name: is_published
 *         schema: { type: string, enum: ["0", "1", "true", "false"] }
 *         description: Hanya efektif untuk admin; publik selalu true.
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date-time }
 *         description: Filter start_at >= from.
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date-time }
 *         description: Filter end_at <= to.
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [done, upcoming, ongoing, active]
 *         description: done=end_at<now; ongoing=start<=now<=end; active=end_at>=now; upcoming=start_at>now.
 *       - in: query
 *         name: category_id
 *         schema: { type: string }
 *       - in: query
 *         name: category_slug
 *         schema: { type: string }
 *     responses:
 *       "200":
 *         description: Berhasil mengambil daftar event.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/EventListResponse"
 *       "500":
 *         description: Gagal memuat data.
 *   post:
 *     tags: [Events]
 *     summary: Buat event (admin)
 *     security:
 *       - BearerAuth: []
 *     description: |
 *       Terima JSON, x-www-form-urlencoded, atau multipart/form-data. Untuk upload banner kirim file di field `file` (max 10MB; JPEG/PNG/WebP, auto-crop di helper). `pricing_type=FREE` mengabaikan ticket_price.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/EventCreateRequest"
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: "#/components/schemas/EventCreateRequest"
 *         multipart/form-data:
 *           schema:
 *             allOf:
 *               - $ref: "#/components/schemas/EventCreateRequest"
 *               - type: object
 *                 properties:
 *                   file:
 *                     type: string
 *                     format: binary
 *     responses:
 *       "201":
 *         description: Event berhasil dibuat.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/EventCreateResponse"
 *       "400":
 *         description: Validasi gagal (title kosong, waktu tidak valid, harga/booth invalid, banner_url kepanjangan).
 *       "401":
 *         description: Unauthorized.
 *       "403":
 *         description: Forbidden.
 *       "413":
 *         description: File > 10MB.
 *       "415":
 *         description: Tipe file tidak didukung.
 *       "422":
 *         description: Kategori tidak ditemukan.
 *       "500":
 *         description: Gagal membuat data.
 */

// Anotasi OpenAPI saja; tidak dieksekusi.
