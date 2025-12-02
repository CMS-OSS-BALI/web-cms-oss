/**
 * @openapi
 * tags:
 *   - name: Consultants
 *     description: Kelola gambar program konsultan (admin).
 *
 * components:
 *   schemas:
 *     ConsultantProgramImage:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         id_consultant:
 *           type: string
 *         image_url:
 *           type: string
 *           format: uri
 *         sort:
 *           type: integer
 *     ConsultantProgramImageError:
 *       type: object
 *       properties:
 *         error:
 *           type: object
 *           properties:
 *             code:
 *               type: string
 *             message:
 *               type: string
 *
 * /api/consultants/{id}/program-images/{imageId}:
 *   put:
 *     tags: [Consultants]
 *     summary: Ganti 1 gambar program (crop 16:9 WebP)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: imageId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       "200":
 *         description: Gambar diperbarui.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: "#/components/schemas/ConsultantProgramImage"
 *       "400":
 *         description: Bad id.
 *       "401":
 *         description: Unauthorized.
 *       "404":
 *         description: Data tidak ditemukan.
 *       "413":
 *         description: File > 10MB.
 *       "415":
 *         description: Tipe file tidak didukung (JPEG/PNG/WebP).
 *       "422":
 *         description: File tidak dikirim.
 *       "500":
 *         description: Gagal memperbarui gambar.
 *   patch:
 *     tags: [Consultants]
 *     summary: Alias PUT ganti gambar program (admin)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: imageId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       "200":
 *         description: Gambar diperbarui.
 *   delete:
 *     tags: [Consultants]
 *     summary: Hapus 1 gambar program (admin)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: imageId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       "204":
 *         description: Gambar dihapus & sort di-reindex.
 *       "400":
 *         description: Bad id.
 *       "401":
 *         description: Unauthorized.
 *       "404":
 *         description: Tidak ditemukan.
 *       "500":
 *         description: Gagal menghapus.
 */

// Anotasi OpenAPI saja; tidak dieksekusi.
