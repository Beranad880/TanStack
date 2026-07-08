CREATE TABLE `protocols` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`timestamp` text,
	`status` text NOT NULL,
	`ip` text,
	`user_agent` text,
	`details` text NOT NULL
);
