/**
 * @openapi
 * tags:
 *   - name: Aktivitas
 *     description: Konten aktivitas (detail & CRUD admin).
 *
 * /api/aktivitas/{id}:
 *   get:
 *     tags: [Aktivitas]
 *     summary: Detail aktivitas
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
 *     responses:
 *       "200":
 *         description: Detail aktivitas ditemukan.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/AktivitasDetailResponse"
 *       "404":
 *         description: Tidak ditemukan.
 *       "500":
 *         description: Gagal mengambil data.
 *   patch:
 *     tags: [Aktivitas]
 *     summary: Perbarui aktivitas (admin)
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
 *             $ref: "#/components/schemas/AktivitasUpdateRequest"
 *         multipart/form-data:
 *           schema:
 *             allOf:
 *               - $ref: "#/components/schemas/AktivitasUpdateRequest"
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
 *         description: Aktivitas berhasil diperbarui.
 *       "400":
 *         description: Validasi gagal.
 *       "401":
 *         description: Unauthorized.
 *       "413":
 *         description: File terlalu besar.
 *       "415":
 *         description: Tipe file tidak didukung.
 *       "500":
 *         description: Gagal memperbarui.
 *   delete:
 *     tags: [Aktivitas]
 *     summary: Hapus aktivitas (soft delete, admin)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       "200":
 *         description: Aktivitas dihapus.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/AktivitasDeleteResponse"
 *       "400":
 *         description: ID tidak valid.
 *       "401":
 *         description: Unauthorized.
 *       "500":
 *         description: Gagal menghapus.
 */

// Anotasi OpenAPI saja; tidak dieksekusi.
