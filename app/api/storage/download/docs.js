/**
 * @openapi
 * tags:
 *   - name: Storage
 *     description: Buat signed URL download dari Object Storage (OSS) untuk lampiran/admin; TTL pendek dengan API key backend.
 *
 * components:
 *   schemas:
 *     StorageDownloadRequest:
 *       type: object
 *       required: [key]
 *       properties:
 *         key:
 *           type: string
 *           description: Path objek di bucket (mis. "public/merchants/logo.png" atau "private/docs/report.pdf").
 *         expiresIn:
 *           type: integer
 *           minimum: 5
 *           maximum: 3600
 *           description: |
 *             Masa berlaku link dalam detik (dibulatkan; min 5 detik, max 1 jam). Kosongkan untuk default gateway. Alias `expires_in` juga diterima di body.
 *     StorageDownloadResponse:
 *       type: object
 *       required: [url]
 *       properties:
 *         url:
 *           type: string
 *           format: uri
 *           description: URL download utama yang siap dipakai.
 *         downloadUrl:
 *           type: string
 *           format: uri
 *           nullable: true
 *           description: Alias camelCase dari gateway; fallback ke `url`.
 *         download_url:
 *           type: string
 *           format: uri
 *           nullable: true
 *           description: Alias snake_case; fallback ke `url`.
 *         signedUrl:
 *           type: string
 *           format: uri
 *           nullable: true
 *           description: Alias camelCase lain yang mungkin dikirim gateway.
 *         signed_url:
 *           type: string
 *           format: uri
 *           nullable: true
 *           description: Alias snake_case lain yang mungkin dikirim gateway.
 *         publicUrl:
 *           type: string
 *           format: uri
 *           nullable: true
 *           description: URL CDN publik jika objek disetel publik.
 *         public_url:
 *           type: string
 *           format: uri
 *           nullable: true
 *           description: Alias snake_case untuk URL publik (jika ada).
 *         expiresIn:
 *           type: integer
 *           nullable: true
 *           description: Sisa masa berlaku link dalam detik (bila disediakan gateway).
 *         expires_in:
 *           type: integer
 *           nullable: true
 *           description: Alias snake_case untuk TTL.
 *         raw:
 *           type: object
 *           nullable: true
 *           description: Payload mentah dari gateway storage untuk keperluan debugging.
 *     StorageError:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *
 * /api/storage/download:
 *   post:
 *     tags: [Storage]
 *     summary: Buat signed URL download (POST)
 *     description: |
 *       Menghasilkan link unduhan sementara untuk objek di OSS menggunakan API key backend. Tidak memerlukan autentikasi user; TTL dibatasi 5 detik s.d. 1 jam.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/StorageDownloadRequest"
 *     responses:
 *       "200":
 *         description: Link unduhan berhasil dibuat.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/StorageDownloadResponse"
 *       "400":
 *         description: Parameter `key` kosong/tidak ada.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/StorageError"
 *       "401":
 *         description: API key OSS ditolak oleh gateway storage.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/StorageError"
 *       "404":
 *         description: File tidak ditemukan (status diteruskan dari gateway storage).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/StorageError"
 *       "502":
 *         description: Gateway storage tidak mengembalikan URL unduhan.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/StorageError"
 *       "500":
 *         description: Gagal membuat signed URL atau error lain dari gateway storage.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/StorageError"
 *   get:
 *     tags: [Storage]
 *     summary: Buat signed URL download (GET)
 *     description: Varian query string untuk kebutuhan sederhana (mis. klik unduh di UI). TTL tetap dibatasi 5-3600 detik.
 *     parameters:
 *       - in: query
 *         name: key
 *         required: true
 *         schema: { type: string }
 *         description: Path objek di bucket.
 *       - in: query
 *         name: expiresIn
 *         schema:
 *           type: integer
 *           minimum: 5
 *           maximum: 3600
 *         description: Masa berlaku link dalam detik; dibulatkan dan dibatasi.
 *     responses:
 *       "200":
 *         description: Link unduhan berhasil dibuat.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/StorageDownloadResponse"
 *       "400":
 *         description: Parameter `key` kosong/tidak ada.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/StorageError"
 *       "401":
 *         description: API key OSS ditolak oleh gateway storage.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/StorageError"
 *       "404":
 *         description: File tidak ditemukan (status diteruskan dari gateway storage).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/StorageError"
 *       "502":
 *         description: Gateway storage tidak mengembalikan URL unduhan.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/StorageError"
 *       "500":
 *         description: Gagal membuat signed URL atau error lain dari gateway storage.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/StorageError"
 */

// Anotasi OpenAPI saja; tidak dieksekusi.
