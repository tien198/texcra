CREATE TABLE `posts_categories` (
	`post_id` integer NOT NULL,
	`category_id` integer NOT NULL,
	`order` integer,
	CONSTRAINT `posts_categories_pk` PRIMARY KEY(`post_id`, `category_id`),
	CONSTRAINT `fk_posts_categories_post_id_posts_id_fk` FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_posts_categories_category_id_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `posts_related_posts` (
	`post_id` integer NOT NULL,
	`related_post_id` integer NOT NULL,
	`order` integer,
	CONSTRAINT `posts_related_posts_pk` PRIMARY KEY(`post_id`, `related_post_id`),
	CONSTRAINT `fk_posts_related_posts_post_id_posts_id_fk` FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_posts_related_posts_related_post_id_posts_id_fk` FOREIGN KEY (`related_post_id`) REFERENCES `posts`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `posts_users` (
	`post_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`order` integer,
	CONSTRAINT `posts_users_pk` PRIMARY KEY(`post_id`, `user_id`),
	CONSTRAINT `fk_posts_users_post_id_posts_id_fk` FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_posts_users_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `_posts_v_categories` (
	`version_id` integer NOT NULL,
	`category_id` integer NOT NULL,
	`order` integer,
	CONSTRAINT `_posts_v_categories_pk` PRIMARY KEY(`version_id`, `category_id`),
	CONSTRAINT `fk__posts_v_categories_version_id__posts_v_id_fk` FOREIGN KEY (`version_id`) REFERENCES `_posts_v`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk__posts_v_categories_category_id_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `_posts_v_related_posts` (
	`version_id` integer NOT NULL,
	`related_post_id` integer NOT NULL,
	`order` integer,
	CONSTRAINT `_posts_v_related_posts_pk` PRIMARY KEY(`version_id`, `related_post_id`),
	CONSTRAINT `fk__posts_v_related_posts_version_id__posts_v_id_fk` FOREIGN KEY (`version_id`) REFERENCES `_posts_v`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk__posts_v_related_posts_related_post_id_posts_id_fk` FOREIGN KEY (`related_post_id`) REFERENCES `posts`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `_posts_v_users` (
	`version_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`order` integer,
	CONSTRAINT `_posts_v_users_pk` PRIMARY KEY(`version_id`, `user_id`),
	CONSTRAINT `fk__posts_v_users_version_id__posts_v_id_fk` FOREIGN KEY (`version_id`) REFERENCES `_posts_v`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk__posts_v_users_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `search_posts` (
	`search_id` integer NOT NULL,
	`post_id` integer NOT NULL,
	`order` integer,
	CONSTRAINT `search_posts_pk` PRIMARY KEY(`search_id`, `post_id`),
	CONSTRAINT `fk_search_posts_search_id_search_id_fk` FOREIGN KEY (`search_id`) REFERENCES `search`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_search_posts_post_id_posts_id_fk` FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_users` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`name` text,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`email` text NOT NULL,
	`reset_password_token` text,
	`reset_password_expiration` integer,
	`salt` text,
	`hash` text,
	`login_attempts` numeric DEFAULT '0',
	`lock_until` integer
);
--> statement-breakpoint
INSERT INTO `__new_users`(`id`, `name`, `updated_at`, `created_at`, `email`, `reset_password_token`, `reset_password_expiration`, `salt`, `hash`, `login_attempts`, `lock_until`) SELECT `id`, `name`, `updated_at`, `created_at`, `email`, `reset_password_token`, `reset_password_expiration`, `salt`, `hash`, `login_attempts`, `lock_until` FROM `users`;--> statement-breakpoint
DROP TABLE `users`;--> statement-breakpoint
ALTER TABLE `__new_users` RENAME TO `users`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
DROP INDEX IF EXISTS `posts_rels_categories_id_idx`;--> statement-breakpoint
DROP INDEX IF EXISTS `posts_rels_order_idx`;--> statement-breakpoint
DROP INDEX IF EXISTS `posts_rels_parent_idx`;--> statement-breakpoint
DROP INDEX IF EXISTS `posts_rels_path_idx`;--> statement-breakpoint
DROP INDEX IF EXISTS `posts_rels_posts_id_idx`;--> statement-breakpoint
DROP INDEX IF EXISTS `posts_rels_users_id_idx`;--> statement-breakpoint
DROP INDEX IF EXISTS `_posts_v_rels_categories_id_idx`;--> statement-breakpoint
DROP INDEX IF EXISTS `_posts_v_rels_order_idx`;--> statement-breakpoint
DROP INDEX IF EXISTS `_posts_v_rels_parent_idx`;--> statement-breakpoint
DROP INDEX IF EXISTS `_posts_v_rels_path_idx`;--> statement-breakpoint
DROP INDEX IF EXISTS `_posts_v_rels_posts_id_idx`;--> statement-breakpoint
DROP INDEX IF EXISTS `_posts_v_rels_users_id_idx`;--> statement-breakpoint
DROP INDEX IF EXISTS `search_rels_order_idx`;--> statement-breakpoint
DROP INDEX IF EXISTS `search_rels_parent_idx`;--> statement-breakpoint
DROP INDEX IF EXISTS `search_rels_path_idx`;--> statement-breakpoint
DROP INDEX IF EXISTS `search_rels_posts_id_idx`;--> statement-breakpoint
CREATE INDEX `users_created_at_idx` ON `users` (`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_idx` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `users_updated_at_idx` ON `users` (`updated_at`);--> statement-breakpoint
CREATE INDEX `posts_categories_order_idx` ON `posts_categories` (`order`);--> statement-breakpoint
CREATE INDEX `posts_categories_post_id_idx` ON `posts_categories` (`post_id`);--> statement-breakpoint
CREATE INDEX `posts_categories_category_id_idx` ON `posts_categories` (`category_id`);--> statement-breakpoint
CREATE INDEX `posts_related_posts_order_idx` ON `posts_related_posts` (`order`);--> statement-breakpoint
CREATE INDEX `posts_related_posts_post_id_idx` ON `posts_related_posts` (`post_id`);--> statement-breakpoint
CREATE INDEX `posts_related_posts_related_post_id_idx` ON `posts_related_posts` (`related_post_id`);--> statement-breakpoint
CREATE INDEX `posts_users_order_idx` ON `posts_users` (`order`);--> statement-breakpoint
CREATE INDEX `posts_users_post_id_idx` ON `posts_users` (`post_id`);--> statement-breakpoint
CREATE INDEX `posts_users_user_id_idx` ON `posts_users` (`user_id`);--> statement-breakpoint
CREATE INDEX `_posts_v_categories_order_idx` ON `_posts_v_categories` (`order`);--> statement-breakpoint
CREATE INDEX `_posts_v_categories_version_id_idx` ON `_posts_v_categories` (`version_id`);--> statement-breakpoint
CREATE INDEX `_posts_v_categories_category_id_idx` ON `_posts_v_categories` (`category_id`);--> statement-breakpoint
CREATE INDEX `_posts_v_related_posts_order_idx` ON `_posts_v_related_posts` (`order`);--> statement-breakpoint
CREATE INDEX `_posts_v_related_posts_version_id_idx` ON `_posts_v_related_posts` (`version_id`);--> statement-breakpoint
CREATE INDEX `_posts_v_related_posts_related_post_id_idx` ON `_posts_v_related_posts` (`related_post_id`);--> statement-breakpoint
CREATE INDEX `_posts_v_users_order_idx` ON `_posts_v_users` (`order`);--> statement-breakpoint
CREATE INDEX `_posts_v_users_version_id_idx` ON `_posts_v_users` (`version_id`);--> statement-breakpoint
CREATE INDEX `_posts_v_users_user_id_idx` ON `_posts_v_users` (`user_id`);--> statement-breakpoint
CREATE INDEX `search_posts_order_idx` ON `search_posts` (`order`);--> statement-breakpoint
CREATE INDEX `search_posts_search_id_idx` ON `search_posts` (`search_id`);--> statement-breakpoint
CREATE INDEX `search_posts_post_id_idx` ON `search_posts` (`post_id`);--> statement-breakpoint
DROP TABLE `posts_rels`;--> statement-breakpoint
DROP TABLE `_posts_v_rels`;--> statement-breakpoint
DROP TABLE `search_rels`;