/**
 * @openapi
 * tags:
 *   - name: Admin - Bookings
 *     description: Listing pemesanan booth event untuk admin.
 *
 * components:
 *   schemas:
 *     BookingItem:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         event_id:
 *           type: integer
 *         rep_name:
 *           type: string
 *         campus_name:
 *           type: string
 *         voucher_code:
 *           type: string
 *           nullable: true
 *         order_id:
 *           type: string
 *           nullable: true
 *         status:
 *           type: string
 *         created_at:
 *           type: string
 *           format: date-time
 *         event_title:
 *           type: string
 *           description: Judul event (dipilih sesuai locale/fallback).
 *         event_category:
 *           type: string
 *           description: Nama kategori event (dipilih sesuai locale/fallback).
 *     BookingListResponse:
 *       type: object
 *       properties:
 *         page:
 *           type: integer
 *         perPage:
 *           type: integer
 *         total:
 *           type: integer
 *         data:
 *           type: array
 *           items:
 *             $ref: "#/components/schemas/BookingItem"
 *     BookingError:
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
 * /api/admin/bookings:
 *   get:
 *     tags: ["Admin - Bookings"]
 *     summary: Daftar bookings booth event (paged + filter)
 *     description: |
 *       Mendukung pencarian bebas, filter voucher/non-voucher, filter event_id, kategori (id atau slug),
 *       serta locale/fallback untuk judul event dan kategori.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: perPage
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Pencarian bebas (nama rep, kampus, judul event, kategori).
 *       - in: query
 *         name: locale
 *         schema:
 *           type: string
 *           default: id
 *       - in: query
 *         name: fallback
 *         schema:
 *           type: string
 *           default: en
 *       - in: query
 *         name: voucher
 *         schema:
 *           type: string
 *           enum: [all, voucher, non]
 *           default: all
 *         description: Filter apakah booking memakai voucher atau tidak.
 *       - in: query
 *         name: event_id
 *         schema:
 *           type: string
 *         description: ID event (angka atau string).
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: ID kategori (angka) atau slug.
 *       - in: query
 *         name: category_slug
 *         schema:
 *           type: string
 *         description: Alias slug kategori (akan dipakai jika `category` kosong).
 *     responses:
 *       "200":
 *         description: Berhasil mengambil daftar bookings.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/BookingListResponse"
 *       "401":
 *         description: Unauthorized.
 *       "500":
 *         description: Gagal mengambil data bookings.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/BookingError"
 */

// Anotasi OpenAPI saja; tidak dieksekusi.
