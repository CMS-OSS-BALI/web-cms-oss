-- CreateTable
CREATE TABLE `admin_users` (
    `id` VARCHAR(36) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NOT NULL,
    `deleted_at` DATETIME(6) NULL,
    `password_changed_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `name` VARCHAR(191) NULL,
    `no_whatsapp` VARCHAR(32) NULL,
    `profile_photo` VARCHAR(512) NULL,

    UNIQUE INDEX `email`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reset_password_tokens` (
    `id` VARCHAR(36) NOT NULL,
    `token` VARCHAR(128) NOT NULL,
    `expires_at` DATETIME(6) NOT NULL,
    `used_at` DATETIME(6) NULL,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `admin_user_id` VARCHAR(36) NOT NULL,

    UNIQUE INDEX `uq_reset_password_tokens_token`(`token`),
    INDEX `idx_reset_tokens_admin`(`admin_user_id`),
    INDEX `idx_reset_tokens_expires`(`expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `blog` (
    `id` VARCHAR(36) NOT NULL,
    `admin_user_id` VARCHAR(36) NOT NULL,
    `image_url` VARCHAR(255) NOT NULL,
    `views_count` BIGINT UNSIGNED NOT NULL DEFAULT 0,
    `likes_count` BIGINT UNSIGNED NOT NULL DEFAULT 0,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `deleted_at` DATETIME(6) NULL,
    `category_id` VARCHAR(36) NULL,

    INDEX `idx_blog_admin_user`(`admin_user_id`),
    INDEX `idx_blog_created_at`(`created_at`),
    INDEX `idx_blog_deleted_at`(`deleted_at`),
    INDEX `idx_blog_category`(`category_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `blog_translate` (
    `id` VARCHAR(36) NOT NULL,
    `id_blog` VARCHAR(36) NOT NULL,
    `locale` CHAR(5) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` LONGTEXT NULL,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    INDEX `idx_blogtr_locale`(`locale`),
    UNIQUE INDEX `uniq_blog_locale`(`id_blog`, `locale`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `blog_categories` (
    `id` VARCHAR(36) NOT NULL,
    `slug` VARCHAR(100) NOT NULL,
    `sort` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NOT NULL,
    `deleted_at` DATETIME(6) NULL,

    UNIQUE INDEX `blog_categories_slug_key`(`slug`),
    INDEX `idx_blogcat_deleted`(`deleted_at`),
    INDEX `idx_blogcat_sort`(`sort`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `blog_categories_translate` (
    `id` VARCHAR(36) NOT NULL,
    `category_id` VARCHAR(36) NOT NULL,
    `locale` CHAR(5) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `created_at` DATETIME(6) NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NULL DEFAULT CURRENT_TIMESTAMP(6),

    INDEX `idx_blogcat_locale`(`locale`),
    UNIQUE INDEX `uniq_blogcat_locale`(`category_id`, `locale`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `testimonials` (
    `id` VARCHAR(36) NOT NULL,
    `admin_user_id` VARCHAR(36) NOT NULL,
    `photo_url` VARCHAR(255) NOT NULL,
    `youtube_url` VARCHAR(255) NULL,
    `kampus_negara_tujuan` VARCHAR(255) NULL,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NOT NULL,
    `deleted_at` DATETIME(6) NULL,
    `star` TINYINT UNSIGNED NOT NULL DEFAULT 5,
    `category_id` VARCHAR(36) NULL,

    INDEX `idx_testimonials_admin`(`admin_user_id`),
    INDEX `idx_testimonials_category`(`category_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `testimonials_translate` (
    `id` VARCHAR(36) NOT NULL,
    `id_testimonials` VARCHAR(36) NOT NULL,
    `locale` CHAR(5) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `message` TEXT NULL,
    `created_at` DATETIME(6) NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NULL DEFAULT CURRENT_TIMESTAMP(6),

    INDEX `idx_locale`(`locale`),
    UNIQUE INDEX `uniq_testimonials_locale`(`id_testimonials`, `locale`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `testimonial_categories` (
    `id` VARCHAR(36) NOT NULL,
    `slug` VARCHAR(100) NOT NULL,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NOT NULL,

    UNIQUE INDEX `testimonial_categories_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `testimonial_categories_translate` (
    `id` VARCHAR(36) NOT NULL,
    `category_id` VARCHAR(36) NOT NULL,
    `locale` CHAR(5) NOT NULL,
    `name` VARCHAR(191) NOT NULL,

    INDEX `idx_testimonial_category_locale`(`locale`),
    UNIQUE INDEX `uniq_testimonial_category_locale`(`category_id`, `locale`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `event_categories` (
    `id` VARCHAR(36) NOT NULL,
    `slug` VARCHAR(100) NOT NULL,
    `sort` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NOT NULL,
    `deleted_at` DATETIME(6) NULL,

    UNIQUE INDEX `event_categories_slug_key`(`slug`),
    INDEX `idx_eventcat_deleted`(`deleted_at`),
    INDEX `idx_eventcat_sort`(`sort`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `event_categories_translate` (
    `id` VARCHAR(36) NOT NULL,
    `category_id` VARCHAR(36) NOT NULL,
    `locale` CHAR(5) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `created_at` DATETIME(6) NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NULL DEFAULT CURRENT_TIMESTAMP(6),

    INDEX `idx_eventcat_locale`(`locale`),
    UNIQUE INDEX `uniq_eventcat_locale`(`category_id`, `locale`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `events` (
    `id` VARCHAR(36) NOT NULL,
    `admin_user_id` VARCHAR(36) NOT NULL,
    `start_at` DATETIME(6) NOT NULL,
    `end_at` DATETIME(6) NOT NULL,
    `location` VARCHAR(255) NOT NULL,
    `banner_url` VARCHAR(512) NOT NULL,
    `is_published` BOOLEAN NOT NULL DEFAULT false,
    `capacity` INTEGER NULL,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NOT NULL,
    `deleted_at` DATETIME(6) NULL,
    `pricing_type` ENUM('FREE', 'PAID') NOT NULL DEFAULT 'FREE',
    `ticket_price` INTEGER NOT NULL DEFAULT 0,
    `category_id` VARCHAR(36) NULL,
    `booth_price` INTEGER NOT NULL DEFAULT 0,
    `booth_quota` INTEGER UNSIGNED NULL,
    `booth_sold_count` INTEGER UNSIGNED NOT NULL DEFAULT 0,

    INDEX `idx_events_admin`(`admin_user_id`),
    INDEX `idx_events_dates`(`start_at`, `end_at`),
    INDEX `idx_events_published_start`(`is_published`, `start_at`),
    INDEX `idx_events_category`(`category_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `events_translate` (
    `id` VARCHAR(36) NOT NULL,
    `id_events` VARCHAR(36) NOT NULL,
    `locale` CHAR(5) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` LONGTEXT NULL,
    `created_at` DATETIME(6) NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NULL DEFAULT CURRENT_TIMESTAMP(6),

    INDEX `idx_locale`(`locale`),
    UNIQUE INDEX `uniq_events_locale`(`id_events`, `locale`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tickets` (
    `id` VARCHAR(36) NOT NULL,
    `event_id` VARCHAR(36) NOT NULL,
    `full_name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `whatsapp` VARCHAR(64) NULL,
    `school_or_campus` VARCHAR(191) NULL,
    `class_or_semester` VARCHAR(191) NULL,
    `domicile` VARCHAR(191) NULL,
    `ticket_code` VARCHAR(64) NOT NULL,
    `qr_url` VARCHAR(512) NULL,
    `status` ENUM('PENDING', 'CONFIRMED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `total_price` INTEGER NOT NULL DEFAULT 0,
    `payment_method` VARCHAR(64) NULL,
    `payment_reference` VARCHAR(128) NULL,
    `paid_at` DATETIME(6) NULL,
    `expires_at` DATETIME(6) NULL,
    `checkin_status` ENUM('NOT_CHECKED_IN', 'CHECKED_IN') NOT NULL DEFAULT 'NOT_CHECKED_IN',
    `checked_in_at` DATETIME(6) NULL,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NOT NULL,
    `deleted_at` DATETIME(6) NULL,

    UNIQUE INDEX `uq_tickets_ticket_code`(`ticket_code`),
    INDEX `idx_tickets_checkin`(`checkin_status`),
    INDEX `idx_tickets_email`(`email`),
    INDEX `idx_tickets_event`(`event_id`),
    INDEX `idx_tickets_status`(`status`),
    INDEX `idx_tickets_checked_in_at`(`checked_in_at`),
    UNIQUE INDEX `uq_tickets_event_email`(`event_id`, `email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ticket_checkin_logs` (
    `id` VARCHAR(36) NOT NULL,
    `ticket_id` VARCHAR(36) NOT NULL,
    `admin_id` VARCHAR(36) NOT NULL,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    INDEX `ticket_checkin_logs_ticket_id_idx`(`ticket_id`),
    INDEX `ticket_checkin_logs_admin_id_idx`(`admin_id`),
    INDEX `ticket_checkin_logs_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `event_booth_bookings` (
    `id` VARCHAR(36) NOT NULL,
    `event_id` VARCHAR(36) NOT NULL,
    `order_id` VARCHAR(191) NULL,
    `rep_name` VARCHAR(191) NOT NULL,
    `country` VARCHAR(191) NOT NULL,
    `campus_name` VARCHAR(191) NOT NULL,
    `address` VARCHAR(191) NOT NULL,
    `whatsapp` VARCHAR(32) NOT NULL,
    `email` VARCHAR(150) NULL,
    `voucher_code` VARCHAR(64) NULL,
    `amount` INTEGER NOT NULL,
    `status` ENUM('PENDING', 'PAID', 'EXPIRED', 'CANCELLED', 'FAILED', 'REVIEW') NOT NULL DEFAULT 'PENDING',
    `paid_at` DATETIME(6) NULL,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NOT NULL,

    UNIQUE INDEX `event_booth_bookings_order_id_key`(`order_id`),
    INDEX `idx_boothbooking_event`(`event_id`),
    INDEX `idx_boothbooking_status`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payments` (
    `id` VARCHAR(36) NOT NULL,
    `booking_id` VARCHAR(36) NULL,
    `order_id` VARCHAR(100) NOT NULL,
    `channel` VARCHAR(64) NULL,
    `status` VARCHAR(32) NOT NULL,
    `gross_amount` INTEGER NOT NULL,
    `raw` JSON NOT NULL,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NOT NULL,

    UNIQUE INDEX `payments_order_id_key`(`order_id`),
    INDEX `idx_payments_booking`(`booking_id`),
    INDEX `idx_payments_status`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vouchers` (
    `id` VARCHAR(36) NOT NULL,
    `code` VARCHAR(64) NOT NULL,
    `value` INTEGER NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `max_uses` INTEGER UNSIGNED NULL,
    `used_count` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `valid_from` DATETIME(6) NULL,
    `valid_to` DATETIME(6) NULL,
    `event_id` VARCHAR(36) NULL,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NOT NULL,
    `max_discount` INTEGER UNSIGNED NULL,
    `type` ENUM('FIXED', 'PERCENT') NOT NULL DEFAULT 'FIXED',

    UNIQUE INDEX `vouchers_code_key`(`code`),
    INDEX `idx_vouchers_event`(`event_id`),
    INDEX `idx_vouchers_active`(`is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `analytics_pageviews` (
    `id` VARCHAR(36) NOT NULL,
    `path` VARCHAR(255) NOT NULL,
    `referrer` VARCHAR(255) NULL,
    `user_agent` VARCHAR(255) NULL,
    `visitor_id` VARCHAR(64) NOT NULL,
    `session_id` VARCHAR(64) NOT NULL,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    INDEX `analytics_pageviews_created_at_idx`(`created_at`),
    INDEX `analytics_pageviews_visitor_id_idx`(`visitor_id`),
    INDEX `analytics_pageviews_session_id_idx`(`session_id`),
    INDEX `analytics_pageviews_path_idx`(`path`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `jurusan` (
    `id` VARCHAR(36) NOT NULL,
    `college_id` VARCHAR(36) NOT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `deleted_at` DATETIME(0) NULL,
    `harga` DECIMAL(12, 2) NULL,
    `in_take` LONGTEXT NULL,

    INDEX `idx_jurusan_deleted`(`deleted_at`),
    INDEX `idx_jurusan_college`(`college_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `jurusan_translate` (
    `id` VARCHAR(36) NOT NULL,
    `id_jurusan` VARCHAR(36) NOT NULL,
    `locale` VARCHAR(5) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` LONGTEXT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_jurusan_translate_locale`(`locale`),
    UNIQUE INDEX `jurusan_locale_unique`(`id_jurusan`, `locale`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `prodi` (
    `id` VARCHAR(36) NOT NULL,
    `jurusan_id` VARCHAR(36) NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `deleted_at` DATETIME(0) NULL,
    `college_id` VARCHAR(36) NULL,
    `harga` DECIMAL(12, 2) NULL,
    `in_take` LONGTEXT NULL,

    INDEX `idx_prodi_deleted`(`deleted_at`),
    INDEX `idx_prodi_jurusan`(`jurusan_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `prodi_translate` (
    `id` VARCHAR(36) NOT NULL,
    `id_prodi` VARCHAR(36) NOT NULL,
    `locale` VARCHAR(5) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` LONGTEXT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_jurusan_translate_locale`(`locale`),
    UNIQUE INDEX `prodi_locale_unique`(`id_prodi`, `locale`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `consultants` (
    `id` VARCHAR(36) NOT NULL,
    `whatsapp` VARCHAR(30) NULL,
    `email` VARCHAR(191) NULL,
    `profile_image_url` VARCHAR(512) NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `uq_consultants_whatsapp`(`whatsapp`),
    UNIQUE INDEX `uq_consultants_email`(`email`),
    INDEX `idx_consultants_email`(`email`),
    INDEX `idx_consultants_whatsapp`(`whatsapp`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `consultants_translate` (
    `id` VARCHAR(36) NOT NULL,
    `id_consultant` VARCHAR(36) NOT NULL,
    `locale` VARCHAR(5) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `description` LONGTEXT NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_ct_id_consultant`(`id_consultant`),
    UNIQUE INDEX `uniq_ct_consultant_locale`(`id_consultant`, `locale`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `consultant_program_images` (
    `id` VARCHAR(36) NOT NULL,
    `id_consultant` VARCHAR(36) NOT NULL,
    `image_url` VARCHAR(512) NOT NULL,
    `sort` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_cpi_consultant`(`id_consultant`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `leads` (
    `id` VARCHAR(36) NOT NULL,
    `full_name` VARCHAR(150) NOT NULL,
    `domicile` VARCHAR(100) NULL,
    `whatsapp` VARCHAR(30) NULL,
    `email` VARCHAR(191) NULL,
    `education_last` VARCHAR(50) NULL,
    `assigned_to` VARCHAR(36) NULL,
    `assigned_at` TIMESTAMP(0) NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `deleted_at` TIMESTAMP(0) NULL,
    `referral_id` VARCHAR(36) NULL,

    INDEX `idx_leads_assigned_at`(`assigned_at`),
    INDEX `idx_leads_assigned_to`(`assigned_to`),
    INDEX `idx_leads_created_at`(`created_at`),
    INDEX `idx_leads_deleted_at`(`deleted_at`),
    INDEX `idx_leads_email`(`email`),
    INDEX `idx_leads_whatsapp`(`whatsapp`),
    INDEX `idx_leads_referral`(`referral_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `referral` (
    `id` VARCHAR(36) NOT NULL,
    `nik` VARCHAR(16) NOT NULL,
    `full_name` VARCHAR(150) NOT NULL,
    `date_of_birth` DATETIME(6) NULL,
    `gender` ENUM('MALE', 'FEMALE') NOT NULL,
    `address_line` VARCHAR(191) NULL,
    `rt` VARCHAR(3) NULL,
    `rw` VARCHAR(3) NULL,
    `kelurahan` VARCHAR(64) NULL,
    `kecamatan` VARCHAR(64) NULL,
    `city` VARCHAR(64) NULL,
    `province` VARCHAR(64) NULL,
    `whatsapp` VARCHAR(32) NOT NULL,
    `whatsapp_e164` VARCHAR(20) NULL,
    `status` ENUM('PENDING', 'REJECTED', 'VERIFIED') NOT NULL DEFAULT 'PENDING',
    `notes` VARCHAR(255) NULL,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NOT NULL,
    `deleted_at` DATETIME(6) NULL,
    `email` VARCHAR(191) NOT NULL,
    `consent_agreed` BOOLEAN NOT NULL DEFAULT false,
    `domicile` VARCHAR(100) NULL,
    `postal_code` VARCHAR(10) NULL,
    `front_url` VARCHAR(512) NOT NULL,
    `code` VARCHAR(64) NULL,
    `leads_count` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `pic_consultant_id` VARCHAR(36) NULL,
    `pekerjaan` VARCHAR(100) NULL,

    UNIQUE INDEX `uq_referral_nik`(`nik`),
    UNIQUE INDEX `uq_referral_code`(`code`),
    INDEX `idx_referral_status_created_at`(`status`, `created_at`),
    INDEX `idx_referral_full_name`(`full_name`),
    INDEX `idx_referral_region`(`city`, `province`),
    INDEX `idx_referral_whatsapp`(`whatsapp`),
    INDEX `idx_referral_whatsapp_e164`(`whatsapp_e164`),
    INDEX `idx_referral_email`(`email`),
    INDEX `idx_referral_created_at`(`created_at`),
    INDEX `idx_referral_deleted_at`(`deleted_at`),
    INDEX `fk_referral_pic_consultant`(`pic_consultant_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mitra_files` (
    `id` VARCHAR(36) NOT NULL,
    `mitra_id` VARCHAR(36) NOT NULL,
    `file_url` VARCHAR(1024) NOT NULL,
    `sort` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    INDEX `idx_mitra_files_mitra`(`mitra_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `college` (
    `id` VARCHAR(36) NOT NULL,
    `admin_user_id` VARCHAR(36) NOT NULL,
    `slug` VARCHAR(255) NOT NULL,
    `logo_url` VARCHAR(1024) NULL,
    `address` TEXT NULL,
    `city` VARCHAR(100) NULL,
    `country` VARCHAR(128) NOT NULL,
    `website` VARCHAR(512) NOT NULL,
    `contact_name` VARCHAR(191) NULL,
    `no_telp` VARCHAR(32) NULL,
    `email` VARCHAR(191) NULL,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NOT NULL,
    `deleted_at` DATETIME(6) NULL,
    `state` VARCHAR(100) NULL,
    `postal_code` VARCHAR(20) NULL,
    `tuition_min` DECIMAL(12, 2) NULL,
    `tuition_max` DECIMAL(12, 2) NULL,
    `living_cost_estimate` DECIMAL(12, 2) NULL,
    `currency` VARCHAR(3) NOT NULL DEFAULT 'IDR',
    `mou_url` VARCHAR(512) NULL,
    `jenjang` TEXT NOT NULL,

    UNIQUE INDEX `uniq_partners_slug`(`slug`),
    INDEX `idx_partners_admin`(`admin_user_id`),
    INDEX `idx_college_contact_name`(`contact_name`),
    INDEX `idx_college_email`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `college_translate` (
    `id` VARCHAR(36) NOT NULL,
    `id_college` VARCHAR(36) NOT NULL,
    `locale` CHAR(5) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` LONGTEXT NULL,
    `created_at` DATETIME(6) NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NULL DEFAULT CURRENT_TIMESTAMP(6),

    INDEX `idx_locale`(`locale`),
    UNIQUE INDEX `uniq_partners_locale`(`id_college`, `locale`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `college_requirement_items` (
    `id` VARCHAR(36) NOT NULL,
    `college_id` VARCHAR(36) NOT NULL,
    `prodi_id` VARCHAR(36) NULL,
    `sort` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    INDEX `idx_cri_college`(`college_id`),
    INDEX `idx_cri_prodi`(`prodi_id`),
    INDEX `idx_cri_sort`(`sort`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `college_requirement_item_translate` (
    `id` VARCHAR(36) NOT NULL,
    `item_id` VARCHAR(36) NOT NULL,
    `locale` CHAR(5) NOT NULL,
    `text` TEXT NOT NULL,
    `created_at` DATETIME(6) NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NULL DEFAULT CURRENT_TIMESTAMP(6),

    INDEX `idx_cri_locale`(`locale`),
    UNIQUE INDEX `uniq_cri_item_locale`(`item_id`, `locale`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `service_categories` (
    `id` VARCHAR(36) NOT NULL,
    `slug` VARCHAR(100) NOT NULL,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NOT NULL,
    `name` VARCHAR(150) NOT NULL,

    UNIQUE INDEX `service_categories_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `services` (
    `id` VARCHAR(36) NOT NULL,
    `admin_user_id` VARCHAR(36) NOT NULL,
    `image_url` VARCHAR(512) NULL,
    `service_type` ENUM('B2B', 'B2C') NOT NULL,
    `category_id` VARCHAR(36) NULL,
    `price` INTEGER NULL,
    `phone` VARCHAR(64) NULL,
    `is_published` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NOT NULL,
    `deleted_at` DATETIME(6) NULL,

    INDEX `idx_services_admin`(`admin_user_id`),
    INDEX `idx_services_category`(`category_id`),
    INDEX `idx_services_type`(`service_type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `services_translate` (
    `id` VARCHAR(36) NOT NULL,
    `id_services` VARCHAR(36) NOT NULL,
    `locale` CHAR(5) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` LONGTEXT NULL,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    INDEX `idx_services_translate_locale`(`locale`),
    INDEX `idx_services_translate_service`(`id_services`),
    UNIQUE INDEX `uq_services_translate`(`id_services`, `locale`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `aktivitas` (
    `id` VARCHAR(36) NOT NULL,
    `admin_user_id` VARCHAR(36) NOT NULL,
    `image_url` VARCHAR(512) NULL,
    `sort` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `is_published` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NOT NULL,
    `deleted_at` DATETIME(6) NULL,

    INDEX `idx_aktivitas_admin`(`admin_user_id`),
    INDEX `idx_aktivitas_published_created`(`is_published`, `created_at`),
    INDEX `idx_aktivitas_sort`(`sort`),
    INDEX `idx_aktivitas_deleted`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `aktivitas_translate` (
    `id` VARCHAR(36) NOT NULL,
    `id_aktivitas` VARCHAR(36) NOT NULL,
    `locale` CHAR(5) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` LONGTEXT NULL,
    `created_at` DATETIME(6) NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NULL DEFAULT CURRENT_TIMESTAMP(6),

    INDEX `idx_aktivitas_locale`(`locale`),
    UNIQUE INDEX `uniq_aktivitas_locale`(`id_aktivitas`, `locale`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `fcm_tokens` (
    `id` VARCHAR(36) NOT NULL,
    `token` VARCHAR(512) NOT NULL,
    `platform` ENUM('WEB', 'ANDROID', 'IOS') NOT NULL DEFAULT 'WEB',
    `user_agent` VARCHAR(255) NULL,
    `device_id` VARCHAR(128) NULL,
    `locale` CHAR(5) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `last_seen` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NOT NULL,
    `admin_user_id` VARCHAR(36) NULL,
    `consultant_id` VARCHAR(36) NULL,
    `referral_id` VARCHAR(36) NULL,

    UNIQUE INDEX `uq_fcm_token`(`token`),
    INDEX `idx_fcm_admin_user`(`admin_user_id`),
    INDEX `idx_fcm_consultant`(`consultant_id`),
    INDEX `idx_fcm_referral`(`referral_id`),
    INDEX `idx_fcm_platform`(`platform`),
    INDEX `idx_fcm_active_updated`(`is_active`, `updated_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `fcm_topics` (
    `id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(64) NOT NULL,
    `description` VARCHAR(255) NULL,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NOT NULL,

    UNIQUE INDEX `uq_fcm_topic_name`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `fcm_topic_subscriptions` (
    `id` VARCHAR(36) NOT NULL,
    `token_id` VARCHAR(36) NOT NULL,
    `topic_id` VARCHAR(36) NOT NULL,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    INDEX `idx_fcm_topic_id`(`topic_id`),
    INDEX `idx_fcm_token_id`(`token_id`),
    UNIQUE INDEX `uniq_fcm_token_topic`(`token_id`, `topic_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mitra` (
    `id` VARCHAR(36) NOT NULL,
    `admin_user_id` VARCHAR(36) NULL,
    `address` TEXT NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(64) NOT NULL,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NOT NULL,
    `deleted_at` DATETIME(6) NULL,
    `mou_url` VARCHAR(191) NULL,
    `instagram` VARCHAR(191) NULL,
    `twitter` VARCHAR(191) NULL,
    `website` VARCHAR(191) NULL,
    `image_url` VARCHAR(1024) NULL,
    `city` VARCHAR(64) NULL,
    `contact_name` VARCHAR(150) NULL,
    `contact_position` VARCHAR(100) NULL,
    `contact_whatsapp` VARCHAR(32) NULL,
    `postal_code` VARCHAR(10) NULL,
    `province` VARCHAR(64) NULL,
    `review_notes` VARCHAR(512) NULL,
    `reviewed_at` DATETIME(6) NULL,
    `reviewed_by` VARCHAR(36) NULL,
    `status` ENUM('PENDING', 'APPROVED', 'DECLINED') NOT NULL DEFAULT 'PENDING',
    `category_id` VARCHAR(36) NULL,
    `nik` VARCHAR(16) NULL,

    INDEX `fk_merchants_admin`(`admin_user_id`),
    INDEX `fk_merchants_reviewer`(`reviewed_by`),
    INDEX `idx_mitra_category`(`category_id`),
    INDEX `idx_mitra_created_at`(`created_at`),
    INDEX `idx_mitra_email`(`email`),
    INDEX `idx_mitra_phone`(`phone`),
    INDEX `idx_mitra_status`(`status`),
    INDEX `idx_mitra_nik`(`nik`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mitra_categories` (
    `id` VARCHAR(36) NOT NULL,
    `slug` VARCHAR(100) NOT NULL,
    `sort` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NOT NULL,
    `deleted_at` DATETIME(6) NULL,

    UNIQUE INDEX `mitra_dalam_negeri_categories_slug_key`(`slug`),
    INDEX `idx_mdncat_deleted`(`deleted_at`),
    INDEX `idx_mdncat_sort`(`sort`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mitra_categories_translate` (
    `id` VARCHAR(36) NOT NULL,
    `category_id` VARCHAR(36) NOT NULL,
    `locale` CHAR(5) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(6) NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NULL DEFAULT CURRENT_TIMESTAMP(6),

    INDEX `idx_mdncat_locale`(`locale`),
    UNIQUE INDEX `uniq_mdncat_locale`(`category_id`, `locale`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mitra_translate` (
    `id` VARCHAR(36) NOT NULL,
    `id_merchants` VARCHAR(36) NOT NULL,
    `locale` CHAR(5) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` LONGTEXT NULL,
    `created_at` DATETIME(6) NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NULL DEFAULT CURRENT_TIMESTAMP(6),

    INDEX `idx_mitra_tr_locale`(`locale`),
    UNIQUE INDEX `uniq_merchants_locale`(`id_merchants`, `locale`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `previous_event_photos` (
    `id` VARCHAR(36) NOT NULL,
    `admin_user_id` VARCHAR(36) NOT NULL,
    `image_url` VARCHAR(512) NOT NULL,
    `is_published` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `deleted_at` DATETIME(6) NULL,

    INDEX `idx_prev_event_photos_admin`(`admin_user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `reset_password_tokens` ADD CONSTRAINT `fk_reset_password_tokens_admin` FOREIGN KEY (`admin_user_id`) REFERENCES `admin_users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `blog` ADD CONSTRAINT `fk_blog_admin_users` FOREIGN KEY (`admin_user_id`) REFERENCES `admin_users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `blog` ADD CONSTRAINT `fk_blog_category` FOREIGN KEY (`category_id`) REFERENCES `blog_categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `blog_translate` ADD CONSTRAINT `fk_blogtr_blog` FOREIGN KEY (`id_blog`) REFERENCES `blog`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `blog_categories_translate` ADD CONSTRAINT `fk_blogcat_tr_category` FOREIGN KEY (`category_id`) REFERENCES `blog_categories`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `testimonials` ADD CONSTRAINT `testimonials_admin_user_id_fkey` FOREIGN KEY (`admin_user_id`) REFERENCES `admin_users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `testimonials_translate` ADD CONSTRAINT `fk_testimonials_translate_testimonials` FOREIGN KEY (`id_testimonials`) REFERENCES `testimonials`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `testimonial_categories_translate` ADD CONSTRAINT `testimonial_categories_translate_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `testimonial_categories`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event_categories_translate` ADD CONSTRAINT `fk_eventcat_tr_category` FOREIGN KEY (`category_id`) REFERENCES `event_categories`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `events` ADD CONSTRAINT `fk_events_admin` FOREIGN KEY (`admin_user_id`) REFERENCES `admin_users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `events` ADD CONSTRAINT `fk_events_category` FOREIGN KEY (`category_id`) REFERENCES `event_categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `events_translate` ADD CONSTRAINT `fk_events_translate_events` FOREIGN KEY (`id_events`) REFERENCES `events`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tickets` ADD CONSTRAINT `fk_tickets_event` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ticket_checkin_logs` ADD CONSTRAINT `fk_checkin_admin` FOREIGN KEY (`admin_id`) REFERENCES `admin_users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ticket_checkin_logs` ADD CONSTRAINT `fk_checkin_ticket` FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event_booth_bookings` ADD CONSTRAINT `fk_boothbooking_event` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `fk_payments_booking` FOREIGN KEY (`booking_id`) REFERENCES `event_booth_bookings`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vouchers` ADD CONSTRAINT `fk_voucher_event` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `jurusan` ADD CONSTRAINT `fk_jurusan_college` FOREIGN KEY (`college_id`) REFERENCES `college`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `jurusan_translate` ADD CONSTRAINT `fk_jurusan_translate_jurusan` FOREIGN KEY (`id_jurusan`) REFERENCES `jurusan`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `prodi_translate` ADD CONSTRAINT `fk_prodi_translate_prodi` FOREIGN KEY (`id_prodi`) REFERENCES `prodi`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `consultants_translate` ADD CONSTRAINT `fk_ct_consultant` FOREIGN KEY (`id_consultant`) REFERENCES `consultants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `consultant_program_images` ADD CONSTRAINT `fk_cpi_consultant` FOREIGN KEY (`id_consultant`) REFERENCES `consultants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leads` ADD CONSTRAINT `fk_leads_assigned_to_consultants` FOREIGN KEY (`assigned_to`) REFERENCES `consultants`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leads` ADD CONSTRAINT `fk_leads_referral` FOREIGN KEY (`referral_id`) REFERENCES `referral`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `referral` ADD CONSTRAINT `fk_referral_pic_consultant` FOREIGN KEY (`pic_consultant_id`) REFERENCES `consultants`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mitra_files` ADD CONSTRAINT `fk_mitra_files_mitra` FOREIGN KEY (`mitra_id`) REFERENCES `mitra`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `college` ADD CONSTRAINT `fk_partners_admin` FOREIGN KEY (`admin_user_id`) REFERENCES `admin_users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `college_translate` ADD CONSTRAINT `fk_partners_translate_partners` FOREIGN KEY (`id_college`) REFERENCES `college`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `college_requirement_item_translate` ADD CONSTRAINT `fk_cri_translate_item` FOREIGN KEY (`item_id`) REFERENCES `college_requirement_items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `services` ADD CONSTRAINT `services_admin_user_id_fkey` FOREIGN KEY (`admin_user_id`) REFERENCES `admin_users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `services` ADD CONSTRAINT `services_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `service_categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `services_translate` ADD CONSTRAINT `services_translate_id_services_fkey` FOREIGN KEY (`id_services`) REFERENCES `services`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `aktivitas` ADD CONSTRAINT `fk_aktivitas_admin` FOREIGN KEY (`admin_user_id`) REFERENCES `admin_users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `aktivitas_translate` ADD CONSTRAINT `fk_aktivitas_tr_aktivitas` FOREIGN KEY (`id_aktivitas`) REFERENCES `aktivitas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fcm_tokens` ADD CONSTRAINT `fk_fcm_admin_user` FOREIGN KEY (`admin_user_id`) REFERENCES `admin_users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fcm_tokens` ADD CONSTRAINT `fk_fcm_consultant` FOREIGN KEY (`consultant_id`) REFERENCES `consultants`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fcm_tokens` ADD CONSTRAINT `fk_fcm_referral` FOREIGN KEY (`referral_id`) REFERENCES `referral`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fcm_topic_subscriptions` ADD CONSTRAINT `fk_fcm_sub_token` FOREIGN KEY (`token_id`) REFERENCES `fcm_tokens`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fcm_topic_subscriptions` ADD CONSTRAINT `fk_fcm_sub_topic` FOREIGN KEY (`topic_id`) REFERENCES `fcm_topics`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mitra` ADD CONSTRAINT `fk_merchants_admin` FOREIGN KEY (`admin_user_id`) REFERENCES `admin_users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mitra` ADD CONSTRAINT `fk_merchants_reviewer` FOREIGN KEY (`reviewed_by`) REFERENCES `admin_users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mitra` ADD CONSTRAINT `fk_mitra_category` FOREIGN KEY (`category_id`) REFERENCES `mitra_categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mitra_categories_translate` ADD CONSTRAINT `fk_mdncat_tr_category` FOREIGN KEY (`category_id`) REFERENCES `mitra_categories`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mitra_translate` ADD CONSTRAINT `fk_merchants_translate_merchants` FOREIGN KEY (`id_merchants`) REFERENCES `mitra`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `previous_event_photos` ADD CONSTRAINT `fk_prev_event_photos_admin` FOREIGN KEY (`admin_user_id`) REFERENCES `admin_users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
