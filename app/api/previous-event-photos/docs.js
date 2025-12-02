/**
 * @openapi
 * tags:
 *   - name: Previous Event Photos
 *     description: Galeri foto event sebelumnya. Publik dapat mengambil list; upload/manajemen hanya admin.
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
 *     PreviousEventPhotoListResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: array
 *           items:
 *             $ref: "#/components/schemas/PreviousEventPhoto"
 *     PreviousEventPhotoCreateResponse:
 *       type: object
 *       properties:
 *         data:
 *           $ref: "#/components/schemas/PreviousEventPhoto"
 *     PreviousEventPhotoError:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *
 * /api/previous-event-photos:
 *   get:
 *     tags: [Previous Event Photos]
 *     summary: Daftar foto event sebelumnya
 *     description: Publik dapat mengambil foto yang belum dihapus; filter `published` tersedia untuk admin dan publik.
 *     parameters:
 *       - in: query
 *         name: published
 *         schema:
 *           type: string
 *           enum: ["0", "1"]
 *         description: Gunakan 1 untuk published, 0 untuk unpublished; kosong untuk semua non-deleted.
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 200
 *           default: 50
 *     responses:
 *       "200":
 *         description: Berhasil mengambil daftar foto.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/PreviousEventPhotoListResponse"
 *       "500":
 *         description: Gagal memuat data.
 *   post:
 *     tags: [Previous Event Photos]
 *     summary: Upload foto event sebelumnya (admin)
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *               is_published:
 *                 type: string
 *                 enum: ["0", "1", "true", "false", "yes", "no", "on", "off"]
 *             required: [image]
 *     responses:
 *       "201":
 *         description: Foto berhasil diunggah.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/PreviousEventPhotoCreateResponse"
 *       "400":
 *         description: Body tidak valid / field wajib hilang.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/PreviousEventPhotoError"
 *       "401":
 *         description: Unauthorized.
 *       "403":
 *         description: Forbidden.
 *       "413":
 *         description: File lebih dari 10MB.
 *       "415":
 *         description: Tipe file tidak didukung (harus JPEG/PNG/WebP).
 *       "500":
 *         description: Gagal mengunggah.
 */

// Anotasi OpenAPI saja; tidak dieksekusi.
