/**
 * @openapi
 * tags:
 *   - name: Previous Event Photos
 *     description: Detail & mutasi foto event sebelumnya (admin untuk mutasi, detail publik untuk non-deleted).
 *
 * components:
 *   schemas:
 *     PreviousEventPhoto:
 *       type: object
 *       properties:
 *         id: { type: string }
 *         image_url:
 *           type: string
 *           format: uri
 *         image_public_url:
 *           type: string
 *           format: uri
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
 *     PreviousEventPhotoMutationResponse:
 *       type: object
 *       properties:
 *         data:
 *           $ref: "#/components/schemas/PreviousEventPhoto"
 *
 * /api/previous-event-photos/{id}:
 *   get:
 *     tags: [Previous Event Photos]
 *     summary: Detail foto event sebelumnya
 *     responses:
 *       "200":
 *         description: Detail ditemukan.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: "#/components/schemas/PreviousEventPhoto"
 *       "404":
 *         description: Tidak ditemukan / sudah dihapus.
 *       "500":
 *         description: Gagal memuat data.
 *   patch:
 *     tags: [Previous Event Photos]
 *     summary: Ubah status publish foto (admin)
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       "200":
 *         description: Foto diperbarui.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/PreviousEventPhotoMutationResponse"
 *       "400":
 *         description: Tidak ada field yang diupdate.
 *       "401":
 *         description: Unauthorized.
 *       "403":
 *         description: Forbidden.
 *       "404":
 *         description: Tidak ditemukan.
 *       "500":
 *         description: Gagal memperbarui.
 *   delete:
 *     tags: [Previous Event Photos]
 *     summary: Soft delete foto (admin)
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       "200":
 *         description: Foto dihapus (soft delete).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/PreviousEventPhotoMutationResponse"
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
