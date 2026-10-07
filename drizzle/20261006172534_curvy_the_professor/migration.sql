CREATE TABLE `authors` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`name` text NOT NULL,
	`bio` text,
	`twitter` text,
	`avatar_id` integer,
	`user_id` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	CONSTRAINT `fk_authors_avatar_id_media_id_fk` FOREIGN KEY (`avatar_id`) REFERENCES `media`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_authors_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
ALTER TABLE `posts_populated_authors` ADD `author_id` integer REFERENCES authors(id) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE `_posts_v_version_populated_authors` ADD `author_id` integer REFERENCES authors(id) ON DELETE SET NULL;--> statement-breakpoint
CREATE INDEX `authors_user_id_idx` ON `authors` (`user_id`);--> statement-breakpoint
CREATE INDEX `authors_avatar_id_idx` ON `authors` (`avatar_id`);--> statement-breakpoint
CREATE INDEX `authors_created_at_idx` ON `authors` (`created_at`);--> statement-breakpoint
CREATE INDEX `authors_updated_at_idx` ON `authors` (`updated_at`);--> statement-breakpoint
CREATE INDEX `posts_populated_authors_author_id_idx` ON `posts_populated_authors` (`author_id`);--> statement-breakpoint
CREATE INDEX `_posts_v_version_populated_authors_author_id_idx` ON `_posts_v_version_populated_authors` (`author_id`);