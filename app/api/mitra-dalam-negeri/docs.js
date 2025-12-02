/**
 * @openapi
 * tags:
 *   - name: Mitra Dalam Negeri
 *     description: Pengajuan & listing mitra dalam negeri. Publik dapat submit; listing detail penuh hanya untuk admin (status, data sensitif, soft delete).
 *
 * components:
 *   schemas:
 *     MitraItem:
 *       type: object
 *       properties:
 *         id: { type: string }
 *         admin_user_id: { type: string, nullable: true }
 *         category:
 *           type: object
 *           nullable: true
 *           properties:
 *             id: { type: string }
 *             slug: { type: string }
 *             name: { type: string, nullable: true }
 *             locale_used: { type: string, nullable: true }
 *         merchant_name:
 *           type: string
 *           nullable: true
 *         about:
 *           type: string
 *           nullable: true
 *         locale_used:
 *           type: string
 *           nullable: true
 *         email:
 *           type: string
 *           format: email
 *         phone:
 *           type: string
 *         nik:
 *           type: string
 *           nullable: true
 *         website:
 *           type: string
 *           format: uri
 *           nullable: true
 *         instagram:
 *           type: string
 *           nullable: true
 *         twitter:
 *           type: string
 *           nullable: true
 *         mou_url:
 *           type: string
 *           format: uri
 *           nullable: true
 *         image_url:
 *           type: string
 *           format: uri
 *           nullable: true
 *         address:
 *           type: string
 *         city:
 *           type: string
 *           nullable: true
 *         province:
 *           type: string
 *           nullable: true
 *         postal_code:
 *           type: string
 *           nullable: true
 *         contact_name:
 *           type: string
 *           nullable: true
 *         contact_position:
 *           type: string
 *           nullable: true
 *         contact_whatsapp:
 *           type: string
 *           nullable: true
 *         status:
 *           type: string
 *           enum: [PENDING, APPROVED, DECLINED]
 *         review_notes:
 *           type: string
 *           nullable: true
 *         reviewed_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         reviewed_by:
 *           type: string
 *           nullable: true
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
 *         created_ts:
 *           type: integer
 *           nullable: true
 *         updated_ts:
 *           type: integer
 *           nullable: true
 *     MitraListResponse:
 *       type: object
 *       properties:
 *         message: { type: string }
 *         data:
 *           type: array
 *           items:
 *             $ref: "#/components/schemas/MitraItem"
 *         meta:
 *           type: object
 *           properties:
 *             page: { type: integer }
 *             perPage: { type: integer }
 *             total: { type: integer }
 *             totalPages: { type: integer }
 *             locale: { type: string }
 *             fallback: { type: string }
 *     MitraCreateRequest:
 *       type: object
 *       required:
 *         - merchant_name
 *         - email
 *         - phone
 *         - nik
 *         - address
 *       properties:
 *         merchant_name:
 *           type: string
 *         email:
 *           type: string
 *           format: email
 *         phone:
 *           type: string
 *         nik:
 *           type: string
 *           description: Wajib 16 digit.
 *         address:
 *           type: string
 *         category_id:
 *           type: string
 *           nullable: true
 *         category_slug:
 *           type: string
 *           nullable: true
 *         website:
 *           type: string
 *           format: uri
 *           nullable: true
 *         instagram:
 *           type: string
 *           nullable: true
 *         twitter:
 *           type: string
 *           nullable: true
 *         mou_url:
 *           type: string
 *           format: uri
 *           nullable: true
 *         image_url:
 *           type: string
 *           format: uri
 *           nullable: true
 *           description: Jika upload file, abaikan field ini.
 *         city:
 *           type: string
 *           nullable: true
 *         province:
 *           type: string
 *           nullable: true
 *         postal_code:
 *           type: string
 *           nullable: true
 *         contact_name:
 *           type: string
 *           nullable: true
 *         contact_position:
 *           type: string
 *           nullable: true
 *         contact_whatsapp:
 *           type: string
 *           nullable: true
 *         about:
 *           type: string
 *           nullable: true
 *         locale:
 *           type: string
 *           default: id
 *         autoTranslate:
 *           type: boolean
 *           default: true
 *         image_file:
 *           type: string
 *           format: binary
 *           description: Upload logo/image (JPEG/PNG/WebP/SVG, max 10MB).
 *         attachments:
 *           type: array
 *           items:
 *             type: string
 *             format: binary
 *           description: Berkas pendukung (PDF/Office/Image/TXT, max 20MB tiap file).
 *     MitraCreateResponse:
 *       type: object
 *       properties:
 *         message: { type: string }
 *         data:
 *           type: object
 *           properties:
 *             id: { type: string }
 *             status:
 *               type: string
 *               example: PENDING
 *
 * /api/mitra-dalam-negeri:
 *   get:
 *     tags: [Mitra Dalam Negeri]
 *     summary: Daftar mitra
 *     description: |
 *       Publik hanya melihat status APPROVED yang tidak terhapus. Admin dapat memfilter status, include soft-delete, dan melihat semua field.
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: Cari pada nama, deskripsi, kontak, alamat, sosial, NIK.
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: perPage
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 10 }
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           example: created_at:desc
 *         description: created_at|updated_at|status dengan asc/desc.
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           example: APPROVED,PENDING
 *         description: Hanya efektif untuk admin; publik dipaksa APPROVED.
 *       - in: query
 *         name: locale
 *         schema: { type: string, default: id }
 *       - in: query
 *         name: fallback
 *         schema: { type: string, default: en }
 *       - in: query
 *         name: category_id
 *         schema: { type: string }
 *       - in: query
 *         name: category_slug
 *         schema: { type: string }
 *       - in: query
 *         name: date_from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: date_to
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: includeDeleted
 *         schema: { type: string, enum: ["0", "1"] }
 *         description: Admin saja; sertakan data deleted.
 *       - in: query
 *         name: with_deleted
 *         schema: { type: string, enum: ["0", "1"] }
 *       - in: query
 *         name: only_deleted
 *         schema: { type: string, enum: ["0", "1"] }
 *     responses:
 *       "200":
 *         description: Berhasil mengambil daftar mitra.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/MitraListResponse"
 *       "401":
 *         description: Unauthorized (jika non-admin meminta data privat).
 *       "500":
 *         description: Gagal memuat data.
 *   post:
 *     tags: [Mitra Dalam Negeri]
 *     summary: Ajukan mitra (publik)
 *     description: |
 *       Publik mengirim formulir dengan logo wajib (URL atau upload). Attachment opsional. Status awal PENDING hingga direview admin. Auto-translate ke EN jika locale bukan EN.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/MitraCreateRequest"
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: "#/components/schemas/MitraCreateRequest"
 *         multipart/form-data:
 *           schema:
 *             $ref: "#/components/schemas/MitraCreateRequest"
 *     responses:
 *       "201":
 *         description: Pengajuan diterima.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/MitraCreateResponse"
 *       "400":
 *         description: Validasi gagal (merchant_name/email/phone/nik/address atau kategori/logo).
 *       "401":
 *         description: Unauthorized (untuk path privat).
 *       "413":
 *         description: Gambar > 10MB atau lampiran > 20MB.
 *       "415":
 *         description: Tipe file tidak didukung.
 *       "500":
 *         description: Gagal memproses pengajuan.
 */

// Anotasi OpenAPI saja; tidak dieksekusi.
