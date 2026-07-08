CREATE TABLE `ads` (
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
	FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `brand_profiles` (
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
	FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sites` (
	`id` text PRIMARY KEY NOT NULL,
	`url` text NOT NULL,
	`latency_ms` integer NOT NULL,
	`cost_usd` real NOT NULL,
	`created_at` text NOT NULL
);
