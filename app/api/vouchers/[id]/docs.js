/**
 * @openapi
 * tags:
 *   - name: Vouchers
 *     description: Voucher diskon event (FIXED/PERCENT) dengan validasi publik via code, admin dapat listing/CRUD.
 *
 * /api/vouchers/{id}:
 *   get:
 *     tags: [Vouchers]
 *     summary: Detail voucher (admin)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       "200":
 *         description: Berhasil mengambil detail voucher.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "OK" }
 *                 data:
 *                   $ref: "#/components/schemas/VoucherItem"
 *       "401":
 *         description: Unauthorized.
 *       "403":
 *         description: Forbidden.
 *       "404":
 *         description: Data tidak ditemukan.
 *       "500":
 *         description: Gagal memuat data.
 *   patch:
 *     tags: [Vouchers]
 *     summary: Perbarui voucher (admin)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/VoucherUpdateRequest"
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: "#/components/schemas/VoucherUpdateRequest"
 *         multipart/form-data:
 *           schema:
 *             $ref: "#/components/schemas/VoucherUpdateRequest"
 *     responses:
 *       "200":
 *         description: Voucher berhasil diperbarui.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *                 data:
 *                   $ref: "#/components/schemas/VoucherItem"
 *       "400":
 *         description: Validasi gagal (code/value/type/valid_from-to/max_uses).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/VoucherError"
 *       "401":
 *         description: Unauthorized.
 *       "403":
 *         description: Forbidden.
 *       "404":
 *         description: Data tidak ditemukan.
 *       "409":
 *         description: Code sudah digunakan.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/VoucherError"
 *       "500":
 *         description: Gagal memperbarui data.
 *   delete:
 *     tags: [Vouchers]
 *     summary: Nonaktifkan voucher (admin, soft-off)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       "200":
 *         description: Voucher dinonaktifkan.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *                 data:
 *                   type: object
 *                   properties:
 *                     id: { type: string }
 *                     is_active: { type: boolean }
 *                     updated_ts:
 *                       type: integer
 *                       nullable: true
 *       "401":
 *         description: Unauthorized.
 *       "403":
 *         description: Forbidden.
 *       "404":
 *         description: Data tidak ditemukan.
 *       "500":
 *         description: Gagal menonaktifkan data.
 */

// Anotasi OpenAPI saja; tidak dieksekusi.
