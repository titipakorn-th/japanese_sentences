import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// Kanji table
export const kanji = sqliteTable('kanji', {
  kanjiId: integer('kanji_id').primaryKey({ autoIncrement: true }),
  character: text('character').notNull().unique(),
  grade: integer('grade'),
  jlptLevel: integer('jlpt_level'),
  strokeCount: integer('stroke_count'),
  meaning: text('meaning'),
  onyomi: text('onyomi'),
  kunyomi: text('kunyomi'),
  examples: text('examples'), // JSON array stored as text
  radical: text('radical'),
  addedAt: integer('added_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
  source: text('source').notNull().default('system'),
});

// Vocabulary table
export const vocabulary = sqliteTable('vocabulary', {
  vocabId: integer('vocab_id').primaryKey({ autoIncrement: true }),
  word: text('word').notNull(),
  reading: text('reading').notNull(),
  meaning: text('meaning'),
  partOfSpeech: text('part_of_speech'),
  jlptLevel: integer('jlpt_level'),
  addedAt: integer('added_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
  source: text('source').notNull().default('system'),
}, (table) => {
  return {
    wordReadingUnique: primaryKey({ columns: [table.word, table.reading], name: 'word_reading_unique' })
  };
});

// Word to Kanji mapping table
export const wordKanjiMapping = sqliteTable('word_kanji_mapping', {
  mappingId: integer('mapping_id').primaryKey({ autoIncrement: true }),
  vocabId: integer('vocab_id').notNull().references(() => vocabulary.vocabId),
  kanjiId: integer('kanji_id').notNull().references(() => kanji.kanjiId),
  position: integer('position').notNull(),
});

// Sentences table
export const sentences = sqliteTable('sentences', {
  sentenceId: integer('sentence_id').primaryKey({ autoIncrement: true }),
  sentence: text('sentence').notNull(),
  translation: text('translation'),
  furiganaData: text('furigana_data'), // JSON array stored as text
  difficultyLevel: integer('difficulty_level'),
  tags: text('tags'),
  source: text('source'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
  llmProcessed: integer('llm_processed', { mode: 'boolean' }).default(false),
});

// Word instances in sentences
export const wordInstances = sqliteTable('word_instances', {
  instanceId: integer('instance_id').primaryKey({ autoIncrement: true }),
  sentenceId: integer('sentence_id').notNull().references(() => sentences.sentenceId),
  vocabId: integer('vocab_id').notNull().references(() => vocabulary.vocabId),
  positionStart: integer('position_start').notNull(),
  positionEnd: integer('position_end').notNull(),
});

// Progress tracking table
export const progress = sqliteTable('progress', {
  progressId: integer('progress_id').primaryKey({ autoIncrement: true }),
  kanjiId: integer('kanji_id').references(() => kanji.kanjiId),
  vocabId: integer('vocab_id').references(() => vocabulary.vocabId),
  sentenceId: integer('sentence_id').references(() => sentences.sentenceId),
  familiarityLevel: integer('familiarity_level').default(0),
  reviewCount: integer('review_count').default(0),
  nextReviewDate: integer('next_review_date', { mode: 'timestamp' }),
  lastReviewedAt: integer('last_reviewed_at', { mode: 'timestamp' }),
});

// Study lists table
export const studyLists = sqliteTable('study_lists', {
  listId: integer('list_id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
});

// List items table
export const listItems = sqliteTable('list_items', {
  itemId: integer('item_id').primaryKey({ autoIncrement: true }),
  listId: integer('list_id').notNull().references(() => studyLists.listId),
  kanjiId: integer('kanji_id').references(() => kanji.kanjiId),
  vocabId: integer('vocab_id').references(() => vocabulary.vocabId),
  sentenceId: integer('sentence_id').references(() => sentences.sentenceId),
  position: integer('position').default(0),
});

// Furigana cache table
export const furiganaCache = sqliteTable('furigana_cache', {
  cacheId: integer('cache_id').primaryKey({ autoIncrement: true }),
  word: text('word').notNull(),
  reading: text('reading').notNull(),
  confidence: integer('confidence').default(0),
  source: text('source').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
  lastUsedAt: integer('last_used_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
  usageCount: integer('usage_count').default(1),
}); 