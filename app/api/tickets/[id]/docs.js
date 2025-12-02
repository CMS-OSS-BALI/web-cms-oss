/**
 * @openapi
 * tags:
 *   - name: Tickets
 *     description: Tiket event dengan QR, status bayar/check-in. Publik bisa membuat tiket; listing/detail & mutasi diakses admin.
 *
 * /api/tickets/{id}:
 *   get:
 *     tags: [Tickets]
 *     summary: Detail tiket (admin)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: locale
 *         schema: { type: string, default: id }
 *         description: Locale utama untuk judul event (fallback ke en).
 *     responses:
 *       "200":
 *         description: Berhasil mengambil detail tiket.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: "#/components/schemas/TicketItem"
 *       "400":
 *         description: id tidak ada/invalid.
 *       "401":
 *         description: Unauthorized.
 *       "403":
 *         description: Forbidden.
 *       "404":
 *         description: Data tidak ditemukan / soft-deleted.
 *       "500":
 *         description: Gagal memuat data.
 *   patch:
 *     tags: [Tickets]
 *     summary: Perbarui tiket (admin)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: locale
 *         schema: { type: string, default: id }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/TicketUpdateRequest"
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: "#/components/schemas/TicketUpdateRequest"
 *         multipart/form-data:
 *           schema:
 *             $ref: "#/components/schemas/TicketUpdateRequest"
 *     responses:
 *       "200":
 *         description: Tiket berhasil diperbarui (atau email dikirim ulang jika action=resend).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/TicketItem"
 *       "400":
 *         description: id tidak ada/invalid atau payload form-data tidak valid.
 *       "401":
 *         description: Unauthorized.
 *       "403":
 *         description: Forbidden.
 *       "404":
 *         description: Data tidak ditemukan.
 *       "500":
 *         description: Gagal memperbarui data.
 *   delete:
 *     tags: [Tickets]
 *     summary: Hapus tiket (admin, soft delete)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       "200":
 *         description: Tiket berhasil dihapus (soft delete).
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *                 data:
 *                   $ref: "#/components/schemas/TicketItem"
 *       "400":
 *         description: id tidak ada/invalid.
 *       "401":
 *         description: Unauthorized.
 *       "403":
 *         description: Forbidden.
 *       "500":
 *         description: Gagal menghapus data.
 */

// Anotasi OpenAPI saja; tidak dieksekusi.
