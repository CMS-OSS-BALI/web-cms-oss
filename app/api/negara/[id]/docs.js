/**
 * @openapi
 * tags:
 *   - name: Negara
 *     description: Placeholder docs; lengkapi schema & contoh sesuai kebutuhan.
 *
 * components:
 *   schemas:
 *     NegaraItem:
 *       type: object
 *       properties:
 *         id: { type: string }
 *         name:
 *           type: string
 *           nullable: true
 *         locale_used:
 *           type: string
 *           nullable: true
 *         is_active:
 *           type: boolean
 *         flag:
 *           type: string
 *           format: uri
 *           nullable: true
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *     NegaraUpdateRequest:
 *       type: object
 *       properties:
 *         name_id:
 *           type: string
 *         name_en:
 *           type: string
 *         is_active:
 *           type: boolean
 *         flag:
 *           type: string
 *           format: uri
 *           nullable: true
 *         file:
 *           type: string
 *           format: binary
 *           description: Upload bendera (JPEG/PNG/WebP, max 10MB).
 *         autoTranslate:
 *           type: boolean
 *           default: false
 *           description: Jika true dan name_id diubah, isi EN otomatis.
 *     NegaraMutationResponse:
 *       type: object
 *       properties:
 *         message: { type: string }
 *         data:
 *           type: object
 *           properties:
 *             id: { type: string }
 *             flag:
 *               type: string
 *               format: uri
 *               nullable: true
 *
 * /api/negara/{id}:
 *   get:
 *     tags: [Negara]
 *     summary: GET /api/negara/{id} (undocumented placeholder)
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
 *                   $ref: "#/components/schemas/NegaraItem"
 *   put:
 *     tags: [Negara]
 *     summary: Alias PATCH negara (admin)
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       "200":
 *         description: Negara diperbarui.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/NegaraMutationResponse"
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
 *     tags: [Negara]
 *     summary: Update negara (admin)
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       "200":
 *         description: Negara diperbarui.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/NegaraMutationResponse"
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
 *     tags: [Negara]
 *     summary: Hapus negara (admin)
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       "200":
 *         description: Negara dihapus.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/NegaraMutationResponse"
 *       "401":
 *         description: Unauthorized.
 *       "403":
 *         description: Forbidden.
 *       "404":
 *         description: Tidak ditemukan.
 *       "500":
 *         description: Gagal menghapus.
 */

// Auto-generated placeholder docs; update dengan detail request/response.
