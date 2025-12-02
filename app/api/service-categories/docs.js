/**
 * @openapi
 * tags:
 *   - name: Service Categories
 *     description: Kategori layanan dengan slug unik. Listing publik; mutasi admin.
 *
 * components:
 *   schemas:
 *     ServiceCategoryItem:
 *       type: object
 *       properties:
 *         id: { type: string }
 *         name: { type: string }
 *         slug: { type: string }
 *         created_at: { type: string, format: date-time }
 *         updated_at: { type: string, format: date-time }
 *         services_count:
 *           type: integer
 *           nullable: true
 *           description: Hanya muncul jika include_counts=1.
 *     ServiceCategoryListResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: array
 *           items:
 *             $ref: "#/components/schemas/ServiceCategoryItem"
 *         meta:
 *           type: object
 *           properties:
 *             page: { type: integer }
 *             perPage: { type: integer }
 *             total: { type: integer }
 *             totalPages: { type: integer }
 *     ServiceCategoryCreateRequest:
 *       type: object
 *       required: [name]
 *       properties:
 *         name:
 *           type: string
 *           description: Wajib, maksimal 150 karakter.
 *         slug:
 *           type: string
 *           description: Kosongkan untuk auto-slugify dari name.
 *     ServiceCategoryCreateResponse:
 *       type: object
 *       properties:
 *         data:
 *           $ref: "#/components/schemas/ServiceCategoryItem"
 *
 * /api/service-categories:
 *   get:
 *     tags: [Service Categories]
 *     summary: Daftar kategori layanan
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: Cari pada slug/name.
 *       - in: query
 *         name: include_counts
 *         schema: { type: string, enum: ["0", "1"] }
 *         description: Jika 1, sertakan jumlah services dalam kategori.
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *     responses:
 *       "200":
 *         description: Berhasil mengambil daftar kategori.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ServiceCategoryListResponse"
 *       "500":
 *         description: Gagal memuat data.
 *   post:
 *     tags: [Service Categories]
 *     summary: Buat kategori layanan (admin)
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/ServiceCategoryCreateRequest"
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: "#/components/schemas/ServiceCategoryCreateRequest"
 *         multipart/form-data:
 *           schema:
 *             $ref: "#/components/schemas/ServiceCategoryCreateRequest"
 *     responses:
 *       "201":
 *         description: Kategori berhasil dibuat.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ServiceCategoryCreateResponse"
 *       "400":
 *         description: Validasi gagal (name kosong/slug invalid).
 *       "401":
 *         description: Unauthorized.
 *       "403":
 *         description: Forbidden.
 *       "409":
 *         description: Slug sudah digunakan.
 *       "500":
 *         description: Gagal membuat data.
 */

// Anotasi OpenAPI saja; tidak dieksekusi.
