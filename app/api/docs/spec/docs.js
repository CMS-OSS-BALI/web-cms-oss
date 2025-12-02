/**
 * @openapi
 * tags:
 *   - name: Docs
 *     description: Endpoint untuk mengeluarkan spesifikasi OpenAPI (swagger) dinamis. Menambahkan `servers` sesuai host permintaan. Mendukung format JSON dan YAML.
 *
 * components:
 *   schemas:
 *     OpenApiSpec:
 *       type: object
 *       description: Spesifikasi OpenAPI 3.0 yang dihasilkan oleh swagger-jsdoc.
 *       properties:
 *         openapi:
 *           type: string
 *           example: "3.0.0"
 *         info:
 *           type: object
 *           properties:
 *             title:
 *               type: string
 *             version:
 *               type: string
 *             description:
 *               type: string
 *         servers:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               url:
 *                 type: string
 *
 * /api/docs/spec:
 *   get:
 *     tags: [Docs]
 *     summary: Ambil spesifikasi OpenAPI
 *     description: |
 *       Mengembalikan spesifikasi OpenAPI 3.0 berbasis anotasi swagger-jsdoc.
 *       Endpoint ini selalu aktif di semua environment. `servers` akan disesuaikan dengan host dari permintaan saat dipanggil.
 *       Mendukung output JSON (default) atau YAML (`?format=yaml` / `?format=yml` atau header Accept: application/yaml).
 *     parameters:
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, yaml, yml]
 *         description: Gunakan `yaml`/`yml` untuk respons YAML; default JSON.
 *     responses:
 *       "200":
 *         description: Spesifikasi OpenAPI berhasil dihasilkan.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/OpenApiSpec"
 *           application/yaml:
 *             schema:
 *               type: string
 *       "500":
 *         description: Gagal membangkitkan spesifikasi.
 */

// Anotasi OpenAPI saja; tidak dieksekusi.
