CREATE TABLE `furigana_cache` (
	`cache_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`word` text NOT NULL,
	`reading` text NOT NULL,
	`confidence` integer DEFAULT 0,
	`source` text NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	`last_used_at` integer DEFAULT (strftime('%s', 'now')),
	`usage_count` integer DEFAULT 1
);
--> statement-breakpoint
CREATE TABLE `kanji` (
	`kanji_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`character` text NOT NULL,
	`grade` integer,
	`jlpt_level` integer,
	`stroke_count` integer,
	`meaning` text,
	`onyomi` text,
	`kunyomi` text,
	`examples` text,
	`radical` text,
	`added_at` integer DEFAULT (strftime('%s', 'now')),
	`source` text DEFAULT 'system' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `kanji_character_unique` ON `kanji` (`character`);
--> statement-breakpoint
CREATE TABLE `vocabulary` (
	`vocab_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`word` text NOT NULL,
	`reading` text NOT NULL,
	`meaning` text,
	`part_of_speech` text,
	`jlpt_level` integer,
	`added_at` integer DEFAULT (strftime('%s', 'now')),
	`source` text DEFAULT 'system' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `word_reading_unique` ON `vocabulary` (`word`, `reading`);
--> statement-breakpoint
CREATE TABLE `word_kanji_mapping` (
	`mapping_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`vocab_id` integer NOT NULL,
	`kanji_id` integer NOT NULL,
	`position` integer NOT NULL,
	FOREIGN KEY (`vocab_id`) REFERENCES `vocabulary`(`vocab_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`kanji_id`) REFERENCES `kanji`(`kanji_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sentences` (
	`sentence_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sentence` text NOT NULL,
	`translation` text,
	`furigana_data` text,
	`difficulty_level` integer,
	`tags` text,
	`source` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	`llm_processed` integer DEFAULT false
);
--> statement-breakpoint
CREATE TABLE `word_instances` (
	`instance_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sentence_id` integer NOT NULL,
	`vocab_id` integer NOT NULL,
	`position_start` integer NOT NULL,
	`position_end` integer NOT NULL,
	FOREIGN KEY (`sentence_id`) REFERENCES `sentences`(`sentence_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`vocab_id`) REFERENCES `vocabulary`(`vocab_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `progress` (
	`progress_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kanji_id` integer,
	`vocab_id` integer,
	`sentence_id` integer,
	`familiarity_level` integer DEFAULT 0,
	`review_count` integer DEFAULT 0,
	`next_review_date` integer,
	`last_reviewed_at` integer,
	FOREIGN KEY (`kanji_id`) REFERENCES `kanji`(`kanji_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`vocab_id`) REFERENCES `vocabulary`(`vocab_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sentence_id`) REFERENCES `sentences`(`sentence_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `study_lists` (
	`list_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`created_at` integer DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE TABLE `list_items` (
	`item_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`list_id` integer NOT NULL,
	`kanji_id` integer,
	`vocab_id` integer,
	`sentence_id` integer,
	`position` integer DEFAULT 0,
	FOREIGN KEY (`list_id`) REFERENCES `study_lists`(`list_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`kanji_id`) REFERENCES `kanji`(`kanji_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`vocab_id`) REFERENCES `vocabulary`(`vocab_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sentence_id`) REFERENCES `sentences`(`sentence_id`) ON UPDATE no action ON DELETE no action
); 