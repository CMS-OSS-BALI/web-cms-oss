/**
 * @openapi
 * tags:
 *   - name: Blog
 *     description: Detail dan update blog.
 *
 * components:
 *   schemas:
 *     BlogDetailResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *         data:
 *           $ref: "#/components/schemas/BlogItem"
 *     BlogUpdateRequest:
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
 *         category_id:
 *           type: string
 *         category_slug:
 *           type: string
 *         image_url:
 *           type: string
 *           format: uri
 *         views_count:
 *           type: integer
 *         likes_count:
 *           type: integer
 *         autoTranslate:
 *           type: boolean
 *           description: Jika true, isi terjemahan pasangan jika kosong.
 *
 * /api/blog/{id}:
 *   get:
 *     tags: [Blog]
 *     summary: Detail blog
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
 *         name: include_category
 *         schema:
 *           type: string
 *           enum: ["0", "1"]
 *     responses:
 *       "200":
 *         description: Detail ditemukan.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/BlogDetailResponse"
 *       "404":
 *         description: Tidak ditemukan.
 *   patch:
 *     tags: [Blog]
 *     summary: Update blog (admin)
 *     description: Menerima JSON atau multipart/form-data. Jika multipart, kirim file pada field `file`/`image`/`image_file`.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/BlogUpdateRequest"
 *         multipart/form-data:
 *           schema:
 *             allOf:
 *               - $ref: "#/components/schemas/BlogUpdateRequest"
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
 *         description: Blog diperbarui.
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
 *         description: Gagal memperbarui.
 *   put:
 *     tags: [Blog]
 *     summary: Alias PATCH (admin)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/BlogUpdateRequest"
 *         multipart/form-data:
 *           schema:
 *             allOf:
 *               - $ref: "#/components/schemas/BlogUpdateRequest"
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
 *         description: Blog diperbarui.
 */

// Anotasi OpenAPI saja; tidak dieksekusi.
