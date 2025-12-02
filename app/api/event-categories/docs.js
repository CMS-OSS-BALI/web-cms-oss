/**
 * @openapi
 * tags:
 *   - name: Event Categories
 *     description: Kategori event dengan multi-locale & soft delete (admin mutasi, list publik).
 *
 * components:
 *   schemas:
 *     EventCategoryItem:
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
 *         name:
 *           type: string
 *           nullable: true
 *         description:
 *           type: string
 *           nullable: true
 *         locale_used:
 *           type: string
 *           nullable: true
 *     EventCategoryListResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *         data:
 *           type: array
 *           items:
 *             $ref: "#/components/schemas/EventCategoryItem"
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
 *     EventCategoryCreateRequest:
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
 *           nullable: true
 *           description: Akan diisi otomatis jika kosong dan autoTranslate=true.
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
 *     EventCategoryCreateResponse:
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
 *     EventCategoryUpdateRequest:
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
 *           description: Jika true dan mengubah name/description ID, isi EN otomatis.
 *     EventCategoryMutationResponse:
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
 * /api/event-categories:
 *   get:
 *     tags: [Event Categories]
 *     summary: Daftar kategori event
 *     description: |
 *       Mendukung pencarian teks, pagination, locale + fallback. Soft delete bisa disertakan (admin).
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Cari pada name/description (locale & fallback).
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
 *         description: sort|created_at|updated_at dengan asc/desc. Default sort asc.
 *       - in: query
 *         name: with_deleted
 *         schema:
 *           type: string
 *           enum: ["0", "1"]
 *         description: Sertakan soft-delete (admin).
 *       - in: query
 *         name: only_deleted
 *         schema:
 *           type: string
 *           enum: ["0", "1"]
 *         description: Hanya data soft-delete (admin).
 *     responses:
 *       "200":
 *         description: Berhasil mengambil daftar kategori event.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/EventCategoryListResponse"
 *       "500":
 *         description: Gagal memuat data.
 *   post:
 *     tags: [Event Categories]
 *     summary: Buat kategori event (admin)
 *     security:
 *       - BearerAuth: []
 *     description: Menerima JSON, x-www-form-urlencoded, atau multipart form (hanya field teks). autoTranslate default true.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/EventCategoryCreateRequest"
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: "#/components/schemas/EventCategoryCreateRequest"
 *         multipart/form-data:
 *           schema:
 *             $ref: "#/components/schemas/EventCategoryCreateRequest"
 *     responses:
 *       "201":
 *         description: Kategori event berhasil dibuat.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/EventCategoryCreateResponse"
 *       "400":
 *         description: Validasi gagal (mis. slug tidak valid, nama kosong).
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
