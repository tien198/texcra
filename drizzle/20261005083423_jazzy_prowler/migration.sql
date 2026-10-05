CREATE TABLE `categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`title` text NOT NULL,
	`generate_slug` integer DEFAULT true,
	`slug` text NOT NULL,
	`parent_id` integer,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	CONSTRAINT `fk_categories_parent_id_categories_id_fk` FOREIGN KEY (`parent_id`) REFERENCES `categories`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE TABLE `categories_breadcrumbs` (
	`_order` integer NOT NULL,
	`_parent_id` integer NOT NULL,
	`id` text PRIMARY KEY,
	`doc_id` integer,
	`url` text,
	`label` text,
	CONSTRAINT `fk_categories_breadcrumbs__parent_id_categories_id_fk` FOREIGN KEY (`_parent_id`) REFERENCES `categories`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_categories_breadcrumbs_doc_id_categories_id_fk` FOREIGN KEY (`doc_id`) REFERENCES `categories`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE TABLE `media` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`alt` text,
	`caption` text,
	`folder_id` integer,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`url` text,
	`thumbnail_u_r_l` text,
	`filename` text,
	`mime_type` text,
	`filesize` numeric,
	`width` numeric,
	`height` numeric,
	`focal_x` numeric,
	`focal_y` numeric,
	`sizes_thumbnail_url` text,
	`sizes_thumbnail_width` numeric,
	`sizes_thumbnail_height` numeric,
	`sizes_thumbnail_mime_type` text,
	`sizes_thumbnail_filesize` numeric,
	`sizes_thumbnail_filename` text,
	`sizes_square_url` text,
	`sizes_square_width` numeric,
	`sizes_square_height` numeric,
	`sizes_square_mime_type` text,
	`sizes_square_filesize` numeric,
	`sizes_square_filename` text,
	`sizes_small_url` text,
	`sizes_small_width` numeric,
	`sizes_small_height` numeric,
	`sizes_small_mime_type` text,
	`sizes_small_filesize` numeric,
	`sizes_small_filename` text,
	`sizes_medium_url` text,
	`sizes_medium_width` numeric,
	`sizes_medium_height` numeric,
	`sizes_medium_mime_type` text,
	`sizes_medium_filesize` numeric,
	`sizes_medium_filename` text,
	`sizes_large_url` text,
	`sizes_large_width` numeric,
	`sizes_large_height` numeric,
	`sizes_large_mime_type` text,
	`sizes_large_filesize` numeric,
	`sizes_large_filename` text,
	`sizes_xlarge_url` text,
	`sizes_xlarge_width` numeric,
	`sizes_xlarge_height` numeric,
	`sizes_xlarge_mime_type` text,
	`sizes_xlarge_filesize` numeric,
	`sizes_xlarge_filename` text,
	`sizes_og_url` text,
	`sizes_og_width` numeric,
	`sizes_og_height` numeric,
	`sizes_og_mime_type` text,
	`sizes_og_filesize` numeric,
	`sizes_og_filename` text,
	CONSTRAINT `fk_media_folder_id_payload_folders_id_fk` FOREIGN KEY (`folder_id`) REFERENCES `payload_folders`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE TABLE `payload_folders` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`name` text NOT NULL,
	`folder_id` integer,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	CONSTRAINT `fk_payload_folders_folder_id_payload_folders_id_fk` FOREIGN KEY (`folder_id`) REFERENCES `payload_folders`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE TABLE `payload_folders_folder_type` (
	`order` integer NOT NULL,
	`parent_id` integer NOT NULL,
	`value` text,
	`id` integer PRIMARY KEY AUTOINCREMENT,
	CONSTRAINT `fk_payload_folders_folder_type_parent_id_payload_folders_id_fk` FOREIGN KEY (`parent_id`) REFERENCES `payload_folders`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `posts` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`title` text,
	`hero_image_id` integer,
	`content` text,
	`meta_title` text,
	`meta_image_id` integer,
	`meta_description` text,
	`published_at` integer,
	`generate_slug` integer DEFAULT true,
	`slug` text,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`_status` text DEFAULT 'draft',
	CONSTRAINT `fk_posts_hero_image_id_media_id_fk` FOREIGN KEY (`hero_image_id`) REFERENCES `media`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_posts_meta_image_id_media_id_fk` FOREIGN KEY (`meta_image_id`) REFERENCES `media`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE TABLE `posts_populated_authors` (
	`_order` integer NOT NULL,
	`_parent_id` integer NOT NULL,
	`id` text PRIMARY KEY,
	`name` text,
	CONSTRAINT `fk_posts_populated_authors__parent_id_posts_id_fk` FOREIGN KEY (`_parent_id`) REFERENCES `posts`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `posts_rels` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`order` integer,
	`parent_id` integer NOT NULL,
	`path` text NOT NULL,
	`posts_id` integer,
	`categories_id` integer,
	`users_id` integer,
	CONSTRAINT `fk_posts_rels_parent_id_posts_id_fk` FOREIGN KEY (`parent_id`) REFERENCES `posts`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_posts_rels_posts_id_posts_id_fk` FOREIGN KEY (`posts_id`) REFERENCES `posts`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_posts_rels_categories_id_categories_id_fk` FOREIGN KEY (`categories_id`) REFERENCES `categories`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_posts_rels_users_id_users_id_fk` FOREIGN KEY (`users_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `_posts_v` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`parent_id` integer,
	`version_title` text,
	`version_hero_image_id` integer,
	`version_content` text,
	`version_meta_title` text,
	`version_meta_image_id` integer,
	`version_meta_description` text,
	`version_published_at` integer,
	`version_generate_slug` integer DEFAULT true,
	`version_slug` text,
	`version_updated_at` integer,
	`version_created_at` integer,
	`version__status` text DEFAULT 'draft',
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`latest` integer,
	`autosave` integer,
	CONSTRAINT `fk__posts_v_parent_id_posts_id_fk` FOREIGN KEY (`parent_id`) REFERENCES `posts`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk__posts_v_version_hero_image_id_media_id_fk` FOREIGN KEY (`version_hero_image_id`) REFERENCES `media`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk__posts_v_version_meta_image_id_media_id_fk` FOREIGN KEY (`version_meta_image_id`) REFERENCES `media`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE TABLE `_posts_v_rels` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`order` integer,
	`parent_id` integer NOT NULL,
	`path` text NOT NULL,
	`posts_id` integer,
	`categories_id` integer,
	`users_id` integer,
	CONSTRAINT `fk__posts_v_rels_parent_id__posts_v_id_fk` FOREIGN KEY (`parent_id`) REFERENCES `_posts_v`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk__posts_v_rels_posts_id_posts_id_fk` FOREIGN KEY (`posts_id`) REFERENCES `posts`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk__posts_v_rels_categories_id_categories_id_fk` FOREIGN KEY (`categories_id`) REFERENCES `categories`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk__posts_v_rels_users_id_users_id_fk` FOREIGN KEY (`users_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `_posts_v_version_populated_authors` (
	`_order` integer NOT NULL,
	`_parent_id` integer NOT NULL,
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`_uuid` text,
	`name` text,
	CONSTRAINT `fk__posts_v_version_populated_authors__parent_id__posts_v_id_fk` FOREIGN KEY (`_parent_id`) REFERENCES `_posts_v`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `search` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`title` text,
	`priority` numeric,
	`slug` text,
	`meta_title` text,
	`meta_description` text,
	`meta_image_id` integer,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	CONSTRAINT `fk_search_meta_image_id_media_id_fk` FOREIGN KEY (`meta_image_id`) REFERENCES `media`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE TABLE `search_categories` (
	`_order` integer NOT NULL,
	`_parent_id` integer NOT NULL,
	`id` text PRIMARY KEY,
	`relation_to` text,
	`category_i_d` text,
	`title` text,
	CONSTRAINT `fk_search_categories__parent_id_search_id_fk` FOREIGN KEY (`_parent_id`) REFERENCES `search`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `search_rels` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`order` integer,
	`parent_id` integer NOT NULL,
	`path` text NOT NULL,
	`posts_id` integer,
	CONSTRAINT `fk_search_rels_parent_id_search_id_fk` FOREIGN KEY (`parent_id`) REFERENCES `search`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_search_rels_posts_id_posts_id_fk` FOREIGN KEY (`posts_id`) REFERENCES `posts`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`name` text,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`email` text NOT NULL,
	`reset_password_token` text,
	`reset_password_expiration` integer,
	`salt` text,
	`hash` text,
	`login_attempts` numeric DEFAULT 0,
	`lock_until` integer
);
--> statement-breakpoint
CREATE TABLE `users_sessions` (
	`_order` integer NOT NULL,
	`_parent_id` integer NOT NULL,
	`id` text PRIMARY KEY,
	`created_at` integer,
	`expires_at` integer NOT NULL,
	CONSTRAINT `fk_users_sessions__parent_id_users_id_fk` FOREIGN KEY (`_parent_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX `categories_created_at_idx` ON `categories` (`created_at`);--> statement-breakpoint
CREATE INDEX `categories_parent_idx` ON `categories` (`parent_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `categories_slug_idx` ON `categories` (`slug`);--> statement-breakpoint
CREATE INDEX `categories_updated_at_idx` ON `categories` (`updated_at`);--> statement-breakpoint
CREATE INDEX `categories_breadcrumbs_doc_idx` ON `categories_breadcrumbs` (`doc_id`);--> statement-breakpoint
CREATE INDEX `categories_breadcrumbs_order_idx` ON `categories_breadcrumbs` (`_order`);--> statement-breakpoint
CREATE INDEX `categories_breadcrumbs_parent_id_idx` ON `categories_breadcrumbs` (`_parent_id`);--> statement-breakpoint
CREATE INDEX `media_created_at_idx` ON `media` (`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `media_filename_idx` ON `media` (`filename`);--> statement-breakpoint
CREATE INDEX `media_folder_idx` ON `media` (`folder_id`);--> statement-breakpoint
CREATE INDEX `media_sizes_large_sizes_large_filename_idx` ON `media` (`sizes_large_filename`);--> statement-breakpoint
CREATE INDEX `media_sizes_medium_sizes_medium_filename_idx` ON `media` (`sizes_medium_filename`);--> statement-breakpoint
CREATE INDEX `media_sizes_og_sizes_og_filename_idx` ON `media` (`sizes_og_filename`);--> statement-breakpoint
CREATE INDEX `media_sizes_small_sizes_small_filename_idx` ON `media` (`sizes_small_filename`);--> statement-breakpoint
CREATE INDEX `media_sizes_square_sizes_square_filename_idx` ON `media` (`sizes_square_filename`);--> statement-breakpoint
CREATE INDEX `media_sizes_thumbnail_sizes_thumbnail_filename_idx` ON `media` (`sizes_thumbnail_filename`);--> statement-breakpoint
CREATE INDEX `media_sizes_xlarge_sizes_xlarge_filename_idx` ON `media` (`sizes_xlarge_filename`);--> statement-breakpoint
CREATE INDEX `media_updated_at_idx` ON `media` (`updated_at`);--> statement-breakpoint
CREATE INDEX `payload_folders_created_at_idx` ON `payload_folders` (`created_at`);--> statement-breakpoint
CREATE INDEX `payload_folders_folder_idx` ON `payload_folders` (`folder_id`);--> statement-breakpoint
CREATE INDEX `payload_folders_name_idx` ON `payload_folders` (`name`);--> statement-breakpoint
CREATE INDEX `payload_folders_updated_at_idx` ON `payload_folders` (`updated_at`);--> statement-breakpoint
CREATE INDEX `payload_folders_folder_type_order_idx` ON `payload_folders_folder_type` (`order`);--> statement-breakpoint
CREATE INDEX `payload_folders_folder_type_parent_idx` ON `payload_folders_folder_type` (`parent_id`);--> statement-breakpoint
CREATE INDEX `posts__status_idx` ON `posts` (`_status`);--> statement-breakpoint
CREATE INDEX `posts_created_at_idx` ON `posts` (`created_at`);--> statement-breakpoint
CREATE INDEX `posts_hero_image_idx` ON `posts` (`hero_image_id`);--> statement-breakpoint
CREATE INDEX `posts_meta_meta_image_idx` ON `posts` (`meta_image_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `posts_slug_idx` ON `posts` (`slug`);--> statement-breakpoint
CREATE INDEX `posts_updated_at_idx` ON `posts` (`updated_at`);--> statement-breakpoint
CREATE INDEX `posts_populated_authors_order_idx` ON `posts_populated_authors` (`_order`);--> statement-breakpoint
CREATE INDEX `posts_populated_authors_parent_id_idx` ON `posts_populated_authors` (`_parent_id`);--> statement-breakpoint
CREATE INDEX `posts_rels_categories_id_idx` ON `posts_rels` (`categories_id`);--> statement-breakpoint
CREATE INDEX `posts_rels_order_idx` ON `posts_rels` (`order`);--> statement-breakpoint
CREATE INDEX `posts_rels_parent_idx` ON `posts_rels` (`parent_id`);--> statement-breakpoint
CREATE INDEX `posts_rels_path_idx` ON `posts_rels` (`path`);--> statement-breakpoint
CREATE INDEX `posts_rels_posts_id_idx` ON `posts_rels` (`posts_id`);--> statement-breakpoint
CREATE INDEX `posts_rels_users_id_idx` ON `posts_rels` (`users_id`);--> statement-breakpoint
CREATE INDEX `_posts_v_autosave_idx` ON `_posts_v` (`autosave`);--> statement-breakpoint
CREATE INDEX `_posts_v_created_at_idx` ON `_posts_v` (`created_at`);--> statement-breakpoint
CREATE INDEX `_posts_v_latest_idx` ON `_posts_v` (`latest`);--> statement-breakpoint
CREATE INDEX `_posts_v_parent_idx` ON `_posts_v` (`parent_id`);--> statement-breakpoint
CREATE INDEX `_posts_v_updated_at_idx` ON `_posts_v` (`updated_at`);--> statement-breakpoint
CREATE INDEX `_posts_v_version_meta_version_meta_image_idx` ON `_posts_v` (`version_meta_image_id`);--> statement-breakpoint
CREATE INDEX `_posts_v_version_version__status_idx` ON `_posts_v` (`version__status`);--> statement-breakpoint
CREATE INDEX `_posts_v_version_version_created_at_idx` ON `_posts_v` (`version_created_at`);--> statement-breakpoint
CREATE INDEX `_posts_v_version_version_hero_image_idx` ON `_posts_v` (`version_hero_image_id`);--> statement-breakpoint
CREATE INDEX `_posts_v_version_version_slug_idx` ON `_posts_v` (`version_slug`);--> statement-breakpoint
CREATE INDEX `_posts_v_version_version_updated_at_idx` ON `_posts_v` (`version_updated_at`);--> statement-breakpoint
CREATE INDEX `_posts_v_rels_categories_id_idx` ON `_posts_v_rels` (`categories_id`);--> statement-breakpoint
CREATE INDEX `_posts_v_rels_order_idx` ON `_posts_v_rels` (`order`);--> statement-breakpoint
CREATE INDEX `_posts_v_rels_parent_idx` ON `_posts_v_rels` (`parent_id`);--> statement-breakpoint
CREATE INDEX `_posts_v_rels_path_idx` ON `_posts_v_rels` (`path`);--> statement-breakpoint
CREATE INDEX `_posts_v_rels_posts_id_idx` ON `_posts_v_rels` (`posts_id`);--> statement-breakpoint
CREATE INDEX `_posts_v_rels_users_id_idx` ON `_posts_v_rels` (`users_id`);--> statement-breakpoint
CREATE INDEX `_posts_v_version_populated_authors_order_idx` ON `_posts_v_version_populated_authors` (`_order`);--> statement-breakpoint
CREATE INDEX `_posts_v_version_populated_authors_parent_id_idx` ON `_posts_v_version_populated_authors` (`_parent_id`);--> statement-breakpoint
CREATE INDEX `search_created_at_idx` ON `search` (`created_at`);--> statement-breakpoint
CREATE INDEX `search_meta_meta_image_idx` ON `search` (`meta_image_id`);--> statement-breakpoint
CREATE INDEX `search_slug_idx` ON `search` (`slug`);--> statement-breakpoint
CREATE INDEX `search_updated_at_idx` ON `search` (`updated_at`);--> statement-breakpoint
CREATE INDEX `search_categories_order_idx` ON `search_categories` (`_order`);--> statement-breakpoint
CREATE INDEX `search_categories_parent_id_idx` ON `search_categories` (`_parent_id`);--> statement-breakpoint
CREATE INDEX `search_rels_order_idx` ON `search_rels` (`order`);--> statement-breakpoint
CREATE INDEX `search_rels_parent_idx` ON `search_rels` (`parent_id`);--> statement-breakpoint
CREATE INDEX `search_rels_path_idx` ON `search_rels` (`path`);--> statement-breakpoint
CREATE INDEX `search_rels_posts_id_idx` ON `search_rels` (`posts_id`);--> statement-breakpoint
CREATE INDEX `users_created_at_idx` ON `users` (`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_idx` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `users_updated_at_idx` ON `users` (`updated_at`);--> statement-breakpoint
CREATE INDEX `users_sessions_order_idx` ON `users_sessions` (`_order`);--> statement-breakpoint
CREATE INDEX `users_sessions_parent_id_idx` ON `users_sessions` (`_parent_id`);