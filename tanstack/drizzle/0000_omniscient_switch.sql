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
	FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON UPDATE no action ON DELETE cascade
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
	FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `protocols` (
	`id` integer PRIMARY KEY NOT NULL,
	`timestamp` text,
	`status` text NOT NULL,
	`ip` text,
	`user_agent` text,
	`details` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sites` (
	`id` text PRIMARY KEY NOT NULL,
	`url` text NOT NULL,
	`session_id` text,
	`ip` text,
	`latency_ms` integer NOT NULL,
	`cost_usd` real NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `todos` (
	`id` integer PRIMARY KEY NOT NULL,
	`text` text NOT NULL,
	`completed` integer DEFAULT false NOT NULL,
	`created_at` text
);
