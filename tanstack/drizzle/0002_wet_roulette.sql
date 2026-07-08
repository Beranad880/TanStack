PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_ads` (
	`id` text PRIMARY KEY NOT NULL,
	`site_id` text NOT NULL,
	`creative_idea` text NOT NULL,
	`primary_text` text NOT NULL,
	`headline` text NOT NULL,
	`description` text NOT NULL,
	`cta` text NOT NULL,
	`image_url` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_ads`("id", "site_id", "creative_idea", "primary_text", "headline", "description", "cta", "image_url", "created_at", "updated_at") SELECT "id", "site_id", "creative_idea", "primary_text", "headline", "description", "cta", "image_url", "created_at", "updated_at" FROM `ads`;--> statement-breakpoint
DROP TABLE `ads`;--> statement-breakpoint
ALTER TABLE `__new_ads` RENAME TO `ads`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_brand_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`site_id` text NOT NULL,
	`company_name` text NOT NULL,
	`description` text NOT NULL,
	`target_audience` text NOT NULL,
	`value_proposition` text NOT NULL,
	`tone_of_voice` text NOT NULL,
	`color_palette` text NOT NULL,
	`candidate_images` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_brand_profiles`("id", "site_id", "company_name", "description", "target_audience", "value_proposition", "tone_of_voice", "color_palette", "candidate_images", "created_at") SELECT "id", "site_id", "company_name", "description", "target_audience", "value_proposition", "tone_of_voice", "color_palette", "candidate_images", "created_at" FROM `brand_profiles`;--> statement-breakpoint
DROP TABLE `brand_profiles`;--> statement-breakpoint
ALTER TABLE `__new_brand_profiles` RENAME TO `brand_profiles`;