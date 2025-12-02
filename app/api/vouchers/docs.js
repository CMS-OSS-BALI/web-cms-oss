/**
 * @openapi
 * tags:
 *   - name: Vouchers
 *     description: Voucher diskon event (FIXED/PERCENT) dengan validasi publik via code, admin dapat listing/CRUD.
 *
 * components:
 *   schemas:
 *     VoucherItem:
 *       type: object
 *       properties:
 *         id: { type: string }
 *         code:
 *           type: string
 *           description: Huruf/angka/underscore/dash, uppercase.
 *         type:
 *           type: string
 *           enum: [FIXED, PERCENT]
 *         value:
 *           type: integer
 *           description: Nominal rupiah (FIXED) atau persentase 1-100 (PERCENT).
 *         max_discount:
 *           type: integer
 *           nullable: true
 *           description: Batas rupiah maksimum untuk tipe PERCENT; null jika FIXED.
 *         is_active: { type: boolean }
 *         max_uses:
 *           type: integer
 *           nullable: true
 *           description: Batas total penggunaan; null artinya tanpa batas.
 *         used_count:
 *           type: integer
 *         valid_from:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         valid_to:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         event_id:
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
 *         valid_from_ts:
 *           type: integer
 *           nullable: true
 *         valid_to_ts:
 *           type: integer
 *           nullable: true
 *     VoucherListResponse:
 *       type: object
 *       properties:
 *         message: { type: string, example: "OK" }
 *         data:
 *           type: array
 *           items:
 *             $ref: "#/components/schemas/VoucherItem"
 *         meta:
 *           type: object
 *           properties:
 *             page: { type: integer }
 *             perPage: { type: integer }
 *             total: { type: integer }
 *             totalPages: { type: integer }
 *     VoucherCreateRequest:
 *       type: object
 *       required: [code, type, value]
 *       properties:
 *         code:
 *           type: string
 *           description: Uppercase; hanya A-Z 0-9 _ -, max 64.
 *         type:
 *           type: string
 *           enum: [FIXED, PERCENT]
 *         value:
 *           type: integer
 *           description: FIXED (rupiah >=0); PERCENT (1..100).
 *         max_discount:
 *           type: integer
 *           nullable: true
 *           description: Wajib >=0 jika diisi pada PERCENT; diabaikan pada FIXED.
 *         is_active:
 *           type: boolean
 *           default: true
 *         max_uses:
 *           type: integer
 *           nullable: true
 *           description: Batas pakai; null = unlimited.
 *         valid_from:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         valid_to:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         event_id:
 *           type: string
 *           nullable: true
 *           description: Limit voucher hanya untuk event tertentu.
 *     VoucherUpdateRequest:
 *       type: object
 *       properties:
 *         code: { type: string }
 *         type: { type: string, enum: [FIXED, PERCENT] }
 *         value: { type: integer }
 *         max_discount: { type: integer, nullable: true }
 *         is_active: { type: boolean }
 *         max_uses: { type: integer, nullable: true }
 *         valid_from: { type: string, format: date-time, nullable: true }
 *         valid_to: { type: string, format: date-time, nullable: true }
 *         event_id: { type: string, nullable: true }
 *     VoucherValidateResponse:
 *       type: object
 *       properties:
 *         valid: { type: boolean }
 *         reason:
 *           type: string
 *           nullable: true
 *           example: MAX_USED
 *         data:
 *           type: object
 *           nullable: true
 *           properties:
 *             code: { type: string }
 *             type: { type: string, enum: [FIXED, PERCENT] }
 *             value: { type: integer }
 *             max_discount:
 *               type: integer
 *               nullable: true
 *     VoucherError:
 *       type: object
 *       properties:
 *         error:
 *           type: object
 *           properties:
 *             code: { type: string }
 *             message: { type: string }
 *             field:
 *               type: string
 *               nullable: true
 *
 * /api/vouchers:
 *   get:
 *     tags: [Vouchers]
 *     summary: Validasi voucher publik atau daftar voucher (admin)
 *     description: |
 *       - Mode publik: berikan query `code` (opsional `event_id`) untuk cek validitas.
 *       - Mode admin: tanpa `code`, butuh sesi admin untuk listing dengan filter/pagination.
 *     parameters:
 *       - in: query
 *         name: code
 *         schema: { type: string }
 *         description: Jika diisi, melakukan validasi publik dan mengabaikan filter lain.
 *       - in: query
 *         name: event_id
 *         schema: { type: string }
 *         description: Opsional untuk validasi publik (voucher harus cocok event).
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: perPage
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           example: created_at:desc
 *         description: created_at|updated_at|code|type|value|is_active + asc/desc.
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: Cari di code (admin list).
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [FIXED, PERCENT] }
 *       - in: query
 *         name: is_active
 *         schema: { type: string, enum: ["0", "1"] }
 *       - in: query
 *         name: event_id
 *         schema: { type: string }
 *         description: Filter admin list berdasarkan event.
 *     responses:
 *       "200":
 *         description: |
 *           Validasi publik: {valid, reason?, data?}. Admin list: daftar voucher dengan meta.
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: "#/components/schemas/VoucherValidateResponse"
 *                 - $ref: "#/components/schemas/VoucherListResponse"
 *       "401":
 *         description: Unauthorized (mode admin).
 *       "403":
 *         description: Forbidden (mode admin).
 *       "500":
 *         description: Gagal memuat data.
 *   post:
 *     tags: [Vouchers]
 *     summary: Buat voucher (admin)
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/VoucherCreateRequest"
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: "#/components/schemas/VoucherCreateRequest"
 *         multipart/form-data:
 *           schema:
 *             $ref: "#/components/schemas/VoucherCreateRequest"
 *     responses:
 *       "201":
 *         description: Voucher berhasil dibuat.
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
 *       "409":
 *         description: Code sudah digunakan.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/VoucherError"
 *       "500":
 *         description: Gagal membuat data.
 */

// Anotasi OpenAPI saja; tidak dieksekusi.
