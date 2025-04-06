import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as fs from 'fs';
import * as schema from '../../src/lib/db/schema/index.js';

// Get current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

// Test database path
const TEST_DB_PATH = path.join(rootDir, 'test_japanese_learning.db');

// SQL content from initial schema migration
const INITIAL_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS "furigana_cache" (
	"cache_id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	"word" text NOT NULL,
	"reading" text NOT NULL,
	"confidence" integer DEFAULT 0,
	"source" text NOT NULL,
	"created_at" integer DEFAULT (strftime('%s', 'now')),
	"last_used_at" integer DEFAULT (strftime('%s', 'now')),
	"usage_count" integer DEFAULT 1
);

CREATE TABLE IF NOT EXISTS "kanji" (
	"kanji_id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	"character" text NOT NULL,
	"grade" integer,
	"jlpt_level" integer,
	"stroke_count" integer,
	"meaning" text,
	"onyomi" text,
	"kunyomi" text,
	"examples" text,
	"radical" text,
	"added_at" integer DEFAULT (strftime('%s', 'now')),
	"source" text DEFAULT 'system' NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "kanji_character_unique" ON "kanji" ("character");

CREATE TABLE IF NOT EXISTS "vocabulary" (
	"vocab_id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	"word" text NOT NULL,
	"reading" text NOT NULL,
	"meaning" text,
	"part_of_speech" text,
	"jlpt_level" integer,
	"added_at" integer DEFAULT (strftime('%s', 'now')),
	"source" text DEFAULT 'system' NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "word_reading_unique" ON "vocabulary" ("word", "reading");

CREATE TABLE IF NOT EXISTS "word_kanji_mapping" (
	"mapping_id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	"vocab_id" integer NOT NULL,
	"kanji_id" integer NOT NULL,
	"position" integer NOT NULL,
	FOREIGN KEY ("vocab_id") REFERENCES "vocabulary"("vocab_id") ON UPDATE no action ON DELETE no action,
	FOREIGN KEY ("kanji_id") REFERENCES "kanji"("kanji_id") ON UPDATE no action ON DELETE no action
);

CREATE TABLE IF NOT EXISTS "sentences" (
	"sentence_id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	"sentence" text NOT NULL,
	"translation" text,
	"furigana_data" text,
	"difficulty_level" integer,
	"tags" text,
	"source" text,
	"created_at" integer DEFAULT (strftime('%s', 'now')),
	"llm_processed" integer DEFAULT false
);

CREATE TABLE IF NOT EXISTS "word_instances" (
	"instance_id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	"sentence_id" integer NOT NULL,
	"vocab_id" integer NOT NULL,
	"position_start" integer NOT NULL,
	"position_end" integer NOT NULL,
	FOREIGN KEY ("sentence_id") REFERENCES "sentences"("sentence_id") ON UPDATE no action ON DELETE no action,
	FOREIGN KEY ("vocab_id") REFERENCES "vocabulary"("vocab_id") ON UPDATE no action ON DELETE no action
);

CREATE TABLE IF NOT EXISTS "progress" (
	"progress_id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	"kanji_id" integer,
	"vocab_id" integer,
	"sentence_id" integer,
	"familiarity_level" integer DEFAULT 0,
	"review_count" integer DEFAULT 0,
	"next_review_date" integer,
	"last_reviewed_at" integer,
	FOREIGN KEY ("kanji_id") REFERENCES "kanji"("kanji_id") ON UPDATE no action ON DELETE no action,
	FOREIGN KEY ("vocab_id") REFERENCES "vocabulary"("vocab_id") ON UPDATE no action ON DELETE no action,
	FOREIGN KEY ("sentence_id") REFERENCES "sentences"("sentence_id") ON UPDATE no action ON DELETE no action
);

CREATE TABLE IF NOT EXISTS "study_lists" (
	"list_id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" integer DEFAULT (strftime('%s', 'now'))
);

CREATE TABLE IF NOT EXISTS "list_items" (
	"item_id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	"list_id" integer NOT NULL,
	"kanji_id" integer,
	"vocab_id" integer,
	"sentence_id" integer,
	"position" integer DEFAULT 0,
	FOREIGN KEY ("list_id") REFERENCES "study_lists"("list_id") ON UPDATE no action ON DELETE no action,
	FOREIGN KEY ("kanji_id") REFERENCES "kanji"("kanji_id") ON UPDATE no action ON DELETE no action,
	FOREIGN KEY ("vocab_id") REFERENCES "vocabulary"("vocab_id") ON UPDATE no action ON DELETE no action,
	FOREIGN KEY ("sentence_id") REFERENCES "sentences"("sentence_id") ON UPDATE no action ON DELETE no action
);
`;

/**
 * Initialize test database
 */
export function initTestDb() {
  try {
    // Make sure the directory exists
    const testDbDir = path.dirname(TEST_DB_PATH);
    if (!fs.existsSync(testDbDir)) {
      fs.mkdirSync(testDbDir, { recursive: true });
    }
    
    // Remove existing test DB if it exists
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
    
    // Create a new SQLite database with proper permissions
    // Open with read/write access and create if it doesn't exist
    const sqlite = new Database(TEST_DB_PATH, { fileMustExist: false });
    
    // Enable foreign keys
    sqlite.pragma('foreign_keys = ON');
    
    // Create the Drizzle ORM instance
    const db = drizzle(sqlite, { schema });
    
    // Initialize schema directly with SQL
    sqlite.exec(INITIAL_SCHEMA_SQL);
    
    return { db, sqlite };
  } catch (error) {
    console.error('Error initializing test database:', error);
    throw error;
  }
}

/**
 * Clean up test database
 */
export function cleanupTestDb(sqlite: Database.Database | undefined) {
  if (!sqlite) return;
  
  try {
    // Close the database connection
    sqlite.close();
  } catch (error) {
    console.error('Error closing SQLite connection:', error);
  }
  
  // Delete the test database file
  try {
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  } catch (error) {
    console.error('Error deleting test database file:', error);
  }
}

/**
 * Create a test database fixture with sample data
 */
export function createTestDbFixture() {
  const { db, sqlite } = initTestDb();
  
  // Insert test data here
  return { db, sqlite };
} 