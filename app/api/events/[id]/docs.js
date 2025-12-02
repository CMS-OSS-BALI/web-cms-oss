/**
 * @openapi
 * tags:
 *   - name: Events
 *     description: Detail & mutasi event (publik bisa lihat detail published; admin dapat update & soft delete).
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
 *     EventUpdateRequest:
 *       type: object
 *       properties:
 *         title_id: { type: string }
 *         description_id:
 *           type: string
 *           nullable: true
 *         title_en: { type: string }
 *         description_en:
 *           type: string
 *           nullable: true
 *         start_at:
 *           type: string
 *           format: date-time
 *         end_at:
 *           type: string
 *           format: date-time
 *         location: { type: string }
 *         is_published: { type: boolean }
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
 *         banner_url:
 *           type: string
 *           format: uri
 *           nullable: true
 *         file:
 *           type: string
 *           format: binary
 *           description: Upload banner (JPEG/PNG/WebP, max 10MB).
 *         booth_price:
 *           type: integer
 *         booth_quota:
 *           type: integer
 *           nullable: true
 *         autoTranslate:
 *           type: boolean
 *           default: false
 *           description: Jika true dan mengubah title/description ID, isi EN otomatis.
 *     EventMutationResponse:
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
 *     EventDeleteResponse:
 *       type: object
 *       properties:
 *         message: { type: string }
 *         data:
 *           type: object
 *           properties:
 *             id: { type: string }
 *
 * /api/events/{id}:
 *   get:
 *     tags: [Events]
 *     summary: Detail event
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: locale
 *         schema: { type: string, default: id }
 *       - in: query
 *         name: fallback
 *         schema: { type: string, default: id }
 *       - in: query
 *         name: include_category
 *         schema: { type: string, enum: ["0", "1"] }
 *     responses:
 *       "200":
 *         description: Detail ditemukan.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *                 data:
 *                   $ref: "#/components/schemas/EventItem"
 *       "404":
 *         description: Tidak ditemukan.
 *       "500":
 *         description: Gagal memuat data.
 *   put:
 *     tags: [Events]
 *     summary: Alias PATCH update event (admin)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/EventUpdateRequest"
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: "#/components/schemas/EventUpdateRequest"
 *         multipart/form-data:
 *           schema:
 *             allOf:
 *               - $ref: "#/components/schemas/EventUpdateRequest"
 *               - type: object
 *                 properties:
 *                   file:
 *                     type: string
 *                     format: binary
 *     responses:
 *       "200":
 *         description: Event diperbarui.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/EventMutationResponse"
 *       "400":
 *         description: Validasi gagal (waktu tidak valid, slug/banner url jika ada, harga/booth invalid).
 *       "401":
 *         description: Unauthorized.
 *       "403":
 *         description: Forbidden.
 *       "404":
 *         description: Tidak ditemukan.
 *       "413":
 *         description: File > 10MB.
 *       "415":
 *         description: Tipe file tidak didukung.
 *       "500":
 *         description: Gagal memperbarui data.
 *   patch:
 *     tags: [Events]
 *     summary: Update event (admin)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/EventUpdateRequest"
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: "#/components/schemas/EventUpdateRequest"
 *         multipart/form-data:
 *           schema:
 *             allOf:
 *               - $ref: "#/components/schemas/EventUpdateRequest"
 *               - type: object
 *                 properties:
 *                   file:
 *                     type: string
 *                     format: binary
 *     responses:
 *       "200":
 *         description: Event diperbarui.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/EventMutationResponse"
 *       "400":
 *         description: Validasi gagal.
 *       "401":
 *         description: Unauthorized.
 *       "403":
 *         description: Forbidden.
 *       "404":
 *         description: Tidak ditemukan.
 *       "413":
 *         description: File > 10MB.
 *       "415":
 *         description: Tipe file tidak didukung.
 *       "500":
 *         description: Gagal memperbarui data.
 *   delete:
 *     tags: [Events]
 *     summary: Soft delete event (admin)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       "200":
 *         description: Event dihapus (soft delete).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/EventDeleteResponse"
 *       "401":
 *         description: Unauthorized.
 *       "403":
 *         description: Forbidden.
 *       "404":
 *         description: Tidak ditemukan.
 *       "500":
 *         description: Gagal menghapus.
 */

// Anotasi OpenAPI saja; tidak dieksekusi.
