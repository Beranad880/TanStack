CREATE TABLE `protocols` (
	`id` integer PRIMARY KEY NOT NULL,
	`timestamp` text,
	`status` text NOT NULL,
	`ip` text,
	`user_agent` text,
	`details` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `todos` (
	`id` integer PRIMARY KEY NOT NULL,
	`text` text NOT NULL,
	`completed` integer DEFAULT false NOT NULL,
	`created_at` text
);
