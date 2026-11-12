CREATE TABLE `answer_revisions` (
	`id` text PRIMARY KEY NOT NULL,
	`answer_id` text NOT NULL,
	`revision` integer NOT NULL,
	`body` text NOT NULL,
	`author` text NOT NULL,
	`kind` text NOT NULL,
	`source_url` text NOT NULL,
	`source_title` text NOT NULL,
	`observed_at` text NOT NULL,
	`edited_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `answer_revision_unique` ON `answer_revisions` (`answer_id`,`revision`);--> statement-breakpoint
CREATE TABLE `answers` (
	`id` text PRIMARY KEY NOT NULL,
	`question_id` text NOT NULL,
	`body` text NOT NULL,
	`author` text NOT NULL,
	`kind` text NOT NULL,
	`source_url` text NOT NULL,
	`source_title` text NOT NULL,
	`observed_at` text NOT NULL,
	`key_hash` text NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE INDEX `answers_question_idx` ON `answers` (`question_id`,`deleted_at`);--> statement-breakpoint
CREATE TABLE `questions` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`category` text NOT NULL,
	`timeframe` text NOT NULL,
	`author` text NOT NULL,
	`key_hash` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE INDEX `questions_updated_idx` ON `questions` (`updated_at`);--> statement-breakpoint
CREATE TABLE `write_limits` (
	`id` text PRIMARY KEY NOT NULL,
	`window` integer NOT NULL,
	`count` integer NOT NULL
);
