/**
 * @openapi
 * tags:
 *   - name: Blast
 *     description: Kirim email blast ke daftar penerima (butuh sesi admin).
 *
 * components:
 *   schemas:
 *     BlastAttachment:
 *       type: object
 *       properties:
 *         filename:
 *           type: string
 *         path:
 *           type: string
 *           description: Path lokal atau URL file.
 *         content:
 *           type: string
 *           description: Konten base64 (opsional).
 *         encoding:
 *           type: string
 *           description: Encoding konten jika memakai field `content`.
 *         contentType:
 *           type: string
 *     BlastRequest:
 *       type: object
 *       required: [subject]
 *       properties:
 *         subject:
 *           type: string
 *           maxLength: 256
 *         html:
 *           type: string
 *           description: Body HTML (akan disisipi footer gambar jika tersedia).
 *         text:
 *           type: string
 *           description: Body plain text.
 *         emails:
 *           type: array
 *           description: Daftar email manual (diprioritaskan dedup).
 *           items:
 *             type: string
 *             format: email
 *         collegeIds:
 *           type: array
 *           description: Ambil email dari model `college` (prioritas baru).
 *           items:
 *             type: string
 *         partnerIds:
 *           type: array
 *           description: Legacy; ambil email dari partners.contact.
 *           items:
 *             type: string
 *         merchantIds:
 *           type: array
 *           description: Ambil email dari mitra/mitra_dalam_negeri.
 *           items:
 *             type: string
 *         cc:
 *           type: array
 *           items:
 *             type: string
 *             format: email
 *         bcc:
 *           type: array
 *           items:
 *             type: string
 *             format: email
 *         attachments:
 *           type: array
 *           items:
 *             $ref: "#/components/schemas/BlastAttachment"
 *         dryRun:
 *           type: boolean
 *           default: false
 *           description: Jika true, hanya pratinjau penerima tanpa mengirim email.
 *         maxPerRequest:
 *           type: integer
 *           minimum: 1
 *           maximum: 500
 *           default: 200
 *         concurrency:
 *           type: integer
 *           minimum: 1
 *           maximum: 20
 *           default: 5
 *     BlastDryRunResponse:
 *       type: object
 *       properties:
 *         ok:
 *           type: boolean
 *           example: true
 *         count:
 *           type: integer
 *           description: Total penerima setelah dedup.
 *         recipients:
 *           type: array
 *           items:
 *             type: string
 *             format: email
 *         sources:
 *           type: object
 *           properties:
 *             colleges:
 *               type: array
 *               items:
 *                 type: string
 *                 format: email
 *             partners:
 *               type: array
 *               items:
 *                 type: string
 *                 format: email
 *             merchants:
 *               type: array
 *               items:
 *                 type: string
 *                 format: email
 *             mitraDalamNegeri:
 *               type: array
 *               items:
 *                 type: string
 *                 format: email
 *             manual:
 *               type: array
 *               items:
 *                 type: string
 *                 format: email
 *     BlastNdjsonEvent:
 *       type: object
 *       description: Event streaming NDJSON selama pengiriman.
 *       properties:
 *         type:
 *           type: string
 *           description: start | progress | done | error
 *         total:
 *           type: integer
 *           description: Terkirim + gagal (hanya pada event start/done).
 *         concurrency:
 *           type: integer
 *         sent:
 *           type: integer
 *         failed:
 *           type: integer
 *         to:
 *           type: string
 *           format: email
 *         ok:
 *           type: boolean
 *         error:
 *           type: string
 *           description: Pesan error singkat jika gagal.
 *         message:
 *           type: string
 *           description: Error global jika terjadi kegagalan umum.
 *     BlastError:
 *       type: object
 *       properties:
 *         ok:
 *           type: boolean
 *           example: false
 *         error:
 *           type: string
 *       example:
 *         ok: false
 *         error: NO_SUBJECT
 *     BlastTooManyError:
 *       type: object
 *       properties:
 *         ok:
 *           type: boolean
 *           example: false
 *         error:
 *           type: string
 *           example: TOO_MANY
 *         count:
 *           type: integer
 *         limit:
 *           type: integer
 *
 * /api/blast:
 *   post:
 *     tags: [Blast]
 *     summary: Kirim email blast (streaming NDJSON)
 *     description: |
 *       Mengirim email blast ke penerima gabungan (manual, college, partner legacy, merchant).
 *       Jika `dryRun=true`, hanya mengembalikan pratinjau penerima tanpa mengirim.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/BlastRequest"
 *     responses:
 *       "200":
 *         description: |
 *           Berhasil. Jika `dryRun=true`, response JSON. Jika mengirim, response NDJSON streaming dengan event progress.
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: "#/components/schemas/BlastDryRunResponse"
 *                 - $ref: "#/components/schemas/BlastError"
 *           application/x-ndjson:
 *             schema:
 *               $ref: "#/components/schemas/BlastNdjsonEvent"
 *             examples:
 *               start:
 *                 value: {"type":"start","total":10,"concurrency":5}
 *               progress:
 *                 value: {"type":"progress","to":"user@example.com","ok":true}
 *               done:
 *                 value: {"type":"done","sent":9,"failed":1,"total":10}
 *       "400":
 *         description: Validasi gagal (tidak ada subject/konten/penerima).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/BlastError"
 *       "401":
 *         description: Tidak terautentikasi.
 *       "413":
 *         description: Jumlah penerima melebihi batas.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/BlastTooManyError"
 *       "500":
 *         description: Kesalahan server saat pengiriman.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/BlastError"
 */

// File ini hanya memuat anotasi OpenAPI; tidak dieksekusi.
