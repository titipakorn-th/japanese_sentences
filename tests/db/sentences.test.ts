import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { initTestDb, cleanupTestDb } from './test-db';
import { sentences } from '../../src/lib/db/schema';
import {
  getAllSentences,
  getSentenceById,
  createSentence,
  updateSentence,
  deleteSentence,
  parseFuriganaData
} from '../../src/lib/db/queries/sentences';
import Database from 'better-sqlite3';
import { eq } from 'drizzle-orm';

// Override the actual database connection with our test database
import * as dbModule from '../../src/lib/db/index.js';

describe('Furigana Data Parsing', () => {
  it('should correctly parse furigana data', () => {
    const furiganaData = JSON.stringify([
      { text: "日本語", reading: "にほんご", start: 0, end: 3 },
      { text: "勉強", reading: "べんきょう", start: 5, end: 7 }
    ]);
    
    const result = parseFuriganaData(furiganaData);
    
    expect(result).toHaveLength(2);
    expect(result[0].text).toBe("日本語");
    expect(result[0].reading).toBe("にほんご");
    expect(result[1].text).toBe("勉強");
    expect(result[1].reading).toBe("べんきょう");
  });
  
  it('should return an empty array when parsing invalid furigana data', () => {
    const invalidData = "not valid JSON";
    
    // Mock console.error to prevent it from appearing in test output
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    const result = parseFuriganaData(invalidData);
    
    expect(result).toEqual([]);
    
    // Verify that console.error was called with the expected arguments
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error parsing furigana data:',
      expect.any(SyntaxError)
    );
    
    // Restore the original console.error
    consoleErrorSpy.mockRestore();
  });
  
  it('should return an empty array when furigana data is undefined', () => {
    const result = parseFuriganaData(undefined);
    
    expect(result).toEqual([]);
  });
});

describe('Sentence Database Queries', () => {
  let sqlite: Database.Database;
  let db: any;
  let testDbSetupComplete = false;
  
  // Set up a new test database for each test
  beforeEach(async () => {
    // Create a new database for each test
    const testDb = initTestDb();
    sqlite = testDb.sqlite;
    db = testDb.db;
    
    // Mock the actual db used in the queries
    vi.spyOn(dbModule, 'db', 'get').mockReturnValue(db);
    
    testDbSetupComplete = true;
  });
  
  // Clean up after each test
  afterEach(() => {
    if (testDbSetupComplete) {
      cleanupTestDb(sqlite);
      vi.restoreAllMocks();
    }
  });
  
  it('should get all sentences', async () => {
    // Insert test sentences
    await db.insert(sentences).values({
      sentence: "テストの文章です。",
      translation: "This is a test sentence.",
      difficultyLevel: 1,
      tags: "test,basic",
      source: "test",
      llmProcessed: false
    });
    
    await db.insert(sentences).values({
      sentence: "これは二つ目のテスト文です。",
      translation: "This is the second test sentence.",
      difficultyLevel: 2,
      tags: "test,intermediate",
      source: "test",
      llmProcessed: true,
      furiganaData: JSON.stringify([
        { text: "これ", reading: "これ", start: 0, end: 2 },
        { text: "二つ目", reading: "ふたつめ", start: 3, end: 6 }
      ])
    });
    
    const result = await getAllSentences();
    
    // The database should now have exactly 2 sentences
    expect(result).toHaveLength(2);
    expect(result.map(s => s.sentence)).toContain("テストの文章です。");
    expect(result.map(s => s.sentence)).toContain("これは二つ目のテスト文です。");
  });
  
  it('should get a sentence by id', async () => {
    // Insert a test sentence
    const inserted = await db.insert(sentences).values({
      sentence: "テストの文章です。",
      translation: "This is a test sentence.",
      difficultyLevel: 1,
      tags: "test,basic",
      source: "test",
      llmProcessed: false
    }).returning();
    
    const sentenceId = inserted[0].sentenceId;
    
    const result = await getSentenceById(sentenceId);
    
    expect(result).not.toBeUndefined();
    expect(result?.sentence).toBe("テストの文章です。");
    expect(result?.translation).toBe("This is a test sentence.");
  });
  
  it('should create a new sentence', async () => {
    const newSentence = {
      sentence: "新しいテスト文です。",
      translation: "This is a new test sentence.",
      difficultyLevel: 3,
      tags: "test,advanced",
      source: "test-create"
    };
    
    // Get the count before inserting
    const beforeCount = (await db.query.sentences.findMany()).length;
    
    const result = await createSentence(newSentence);
    
    // Get the count after inserting
    const afterCount = (await db.query.sentences.findMany()).length;
    
    expect(result).not.toBeUndefined();
    expect(result.sentence).toBe(newSentence.sentence);
    expect(result.translation).toBe(newSentence.translation);
    expect(result.llmProcessed).toBe(false); // Default value
    
    // Verify we've added exactly one sentence
    expect(afterCount).toBe(beforeCount + 1);
  });
  
  it('should update a sentence', async () => {
    // Insert a test sentence
    const inserted = await db.insert(sentences).values({
      sentence: "テストの文章です。",
      translation: "This is a test sentence.",
      difficultyLevel: 1,
      tags: "test,basic",
      source: "test",
      llmProcessed: false
    }).returning();
    
    const sentenceId = inserted[0].sentenceId;
    
    const updateData = {
      translation: "Updated translation",
      difficultyLevel: 4,
      llmProcessed: true
    };
    
    const result = await updateSentence(sentenceId, updateData);
    
    expect(result).not.toBeUndefined();
    expect(result?.translation).toBe(updateData.translation);
    expect(result?.difficultyLevel).toBe(updateData.difficultyLevel);
    expect(result?.llmProcessed).toBe(updateData.llmProcessed);
    
    // Original data should remain unchanged
    expect(result?.sentence).toBe(inserted[0].sentence);
  });
  
  it('should delete a sentence', async () => {
    // Insert a test sentence
    const inserted = await db.insert(sentences).values({
      sentence: "テストの文章です。",
      translation: "This is a test sentence.",
      difficultyLevel: 1,
      tags: "test,basic",
      source: "test",
      llmProcessed: false
    }).returning();
    
    const sentenceId = inserted[0].sentenceId;
    
    // Get the count before deleting
    const beforeCount = (await db.query.sentences.findMany()).length;
    
    const result = await deleteSentence(sentenceId);
    
    // Get the count after deleting
    const afterCount = (await db.query.sentences.findMany()).length;
    
    expect(result).toBe(true);
    
    // Verify we've deleted exactly one sentence
    expect(afterCount).toBe(beforeCount - 1);
    
    // Verify the specific sentence is gone
    const checkDeleted = await getSentenceById(sentenceId);
    expect(checkDeleted).toBeUndefined();
  });
}); 