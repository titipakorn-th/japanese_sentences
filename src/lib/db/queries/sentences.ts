import { db } from '$lib/db';
import { sentences, vocabulary, wordInstances } from '$lib/db/schema';
import type { Sentence, FuriganaItem, SentenceWithWords } from '$lib/db/types';
import { eq, desc } from 'drizzle-orm';
import { browser } from '$app/environment';

// Only import server-side modules when in server context
let Database: any = null;
if (!browser) {
  try {
    Database = require('better-sqlite3');
  } catch (e) {
    console.log('Failed to import better-sqlite3, direct DB access will be unavailable');
  }
}

/**
 * Get all sentences with optional limit and offset
 */
export async function getAllSentences(limit = 50, offset = 0): Promise<Sentence[]> {
  console.log('DB: Getting all sentences with limit:', limit, 'offset:', offset);
  
  try {
    // First try using the ORM
    const results = await db.query.sentences.findMany({
      orderBy: [desc(sentences.createdAt)],
      limit,
      offset,
    });
    
    console.log(`DB: Retrieved ${results.length} sentences via ORM`);
    
    // Log the ids to help debug
    if (results.length > 0) {
      console.log('DB: Sentence IDs retrieved:', results.map((s: Sentence) => s.sentenceId));
      return results;
    } else {
      console.log('DB: No sentences found via ORM, trying direct SQLite connection');
      
      // If ORM didn't return results, try direct connection (server-side only)
      if (!browser) {
        try {
          // Try to get the global connection first if it exists
          let sqlite;
          const globalDb = typeof global !== 'undefined' && 
                          (global as any)?.__sveltekit_dev?.dbConnection;
          
          if (globalDb) {
            console.log('DB: Using global database connection from __sveltekit_dev');
            sqlite = globalDb;
          } else if (Database) {
            console.log('DB: Opening a new database connection to dev.db');
            sqlite = new Database('dev.db');
          } else {
            console.log('DB: Database module not available');
            return [];
          }
          
          // Get sentences directly
          const stmt = sqlite.prepare(`
            SELECT 
              sentence_id as sentenceId,
              sentence,
              translation,
              notes,
              difficulty_level as difficultyLevel,
              tags,
              furigana_data as furiganaData,
              created_at as createdAt,
              llm_processed as llmProcessed
            FROM sentences
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
          `);
          
          const rows = stmt.all(limit, offset);
          
          // Close the connection only if we created a new one
          if (sqlite !== globalDb && sqlite.close) {
            sqlite.close();
          }
          
          console.log(`DB: Retrieved ${rows.length} sentences via direct connection`);
          
          if (rows.length > 0) {
            console.log('DB: Direct connection IDs:', rows.map((r: any) => r.sentenceId));
            
            // Convert dates to proper Date objects
            return rows.map((row: any) => ({
              ...row,
              createdAt: new Date(row.createdAt)
            }));
          }
        } catch (directError) {
          console.error('DB: Error with direct connection:', directError);
        }
      } else if (browser) {
        console.log('DB: Running in browser, direct SQLite connection not available');
      }
      
      console.log('DB: No sentences found in the database');
      return [];
    }
  } catch (error) {
    console.error('DB: Error in getAllSentences:', error);
    return [];
  }
}

/**
 * Get a sentence by ID
 */
export async function getSentenceById(id: number): Promise<Sentence | undefined> {
  console.log('DB: Getting sentence by ID:', id);
  
  try {
    // First try using the ORM
    const result = await db.query.sentences.findFirst({
      where: eq(sentences.sentenceId, id),
    });
    
    if (result) {
      console.log('DB: Retrieved sentence via ORM:', result.sentenceId);
      console.log('DB: Sentence data:', JSON.stringify(result, null, 2));
      return result;
    } else {
      console.log('DB: Sentence not found via ORM, trying direct SQLite connection');
      
      // If ORM didn't return results, try direct connection (server-side only)
      if (!browser) {
        try {
          // Try to get the global connection first if it exists
          let sqlite;
          const globalDb = typeof global !== 'undefined' && 
                          (global as any)?.__sveltekit_dev?.dbConnection;
          
          if (globalDb) {
            console.log('DB: Using global database connection from __sveltekit_dev');
            sqlite = globalDb;
          } else if (Database) {
            console.log('DB: Opening a new database connection to dev.db');
            sqlite = new Database('dev.db');
          } else {
            console.log('DB: Database module not available');
            return undefined;
          }
          
          // Get sentence directly
          const stmt = sqlite.prepare(`
            SELECT 
              sentence_id as sentenceId,
              sentence,
              translation,
              notes,
              difficulty_level as difficultyLevel,
              tags,
              furigana_data as furiganaData,
              created_at as createdAt,
              llm_processed as llmProcessed
            FROM sentences
            WHERE sentence_id = ?
          `);
          
          const row = stmt.get(id);
          
          // Close the connection only if we created a new one
          if (sqlite !== globalDb && sqlite.close) {
            sqlite.close();
          }
          
          if (row) {
            console.log('DB: Retrieved sentence via direct connection:', row.sentenceId);
            console.log('DB: Raw sentence data:', JSON.stringify(row, null, 2));
            
            // Create a properly structured Sentence object
            const sentenceObj = {
              sentenceId: row.sentenceId,
              sentence: row.sentence,
              translation: row.translation || null,
              notes: row.notes || null,
              difficultyLevel: typeof row.difficultyLevel === 'number' ? row.difficultyLevel : parseInt(row.difficultyLevel) || 1,
              tags: row.tags || null,
              furiganaData: row.furiganaData || null,
              createdAt: row.createdAt ? new Date(row.createdAt) : new Date(),
              llmProcessed: !!row.llmProcessed
            };
            
            console.log('DB: Returning formatted sentence:', JSON.stringify(sentenceObj, null, 2));
            return sentenceObj;
          } else {
            console.log('DB: No sentence found with ID:', id);
          }
        } catch (directError) {
          console.error('DB: Error with direct connection:', directError);
        }
      } else if (browser) {
        console.log('DB: Running in browser, direct SQLite connection not available');
      }
      
      console.log('DB: Sentence not found in the database');
      return undefined;
    }
  } catch (error) {
    console.error('DB: Error in getSentenceById:', error);
    return undefined;
  }
}

/**
 * Get a sentence with its related vocabulary words
 */
export async function getSentenceWithWords(id: number): Promise<SentenceWithWords | undefined> {
  console.log('DB: Getting sentence with words for ID:', id);
  
  const sentence = await getSentenceById(id);
  
  if (!sentence) {
    console.log('DB: Sentence not found for ID:', id);
    return undefined;
  }
  
  // First try with ORM
  type WordInstanceWithVocab = any; // Simplified type for word instances
  
  const wordInstancesResult = await db.query.wordInstances.findMany({
    where: eq(wordInstances.sentenceId, id),
    with: {
      vocabulary: true,
    },
  });
  
  // If we have word instances from ORM, use them
  if (wordInstancesResult && wordInstancesResult.length > 0) {
    console.log(`DB: Found ${wordInstancesResult.length} word instances via ORM`);
    return {
      sentence,
      words: wordInstancesResult,
    };
  }
  
  // If ORM didn't return anything, but we're not in browser, set empty word instances
  console.log('DB: No word instances found. Returning sentence without words.');
  return {
    sentence,
    words: []
  };
}

/**
 * Create a new sentence
 */
export async function createSentence(data: Omit<Sentence, 'sentenceId' | 'createdAt' | 'llmProcessed'>): Promise<Sentence> {
  console.log('DB: Creating sentence with data:', data);
  
  // Get the max sentence ID first to handle the case where the ORM uses an existing ID
  let nextId = 0;
  if (!browser) {
    try {
      // Try to get the global connection
      let sqlite;
      const globalDb = typeof global !== 'undefined' && 
                      (global as any)?.__sveltekit_dev?.dbConnection;
      
      if (globalDb) {
        console.log('DB: Using global database connection from __sveltekit_dev to determine next ID');
        sqlite = globalDb;
      } else if (Database) {
        console.log('DB: Opening a new database connection to dev.db to determine next ID');
        sqlite = new Database('dev.db');
      }
      
      if (sqlite) {
        // Get the max ID to ensure we don't create duplicates
        const maxIdStmt = sqlite.prepare('SELECT MAX(sentence_id) as maxId FROM sentences');
        const maxIdResult = maxIdStmt.get();
        nextId = (maxIdResult?.maxId || 0) + 1;
        console.log('DB: Next sentence ID should be:', nextId);
        
        // Close if not global
        if (sqlite !== globalDb && sqlite.close) {
          sqlite.close();
        }
      }
    } catch (e) {
      console.error('DB: Error determining next ID:', e);
    }
  }
  
  try {
    // Always use direct SQLite connection for creation to ensure proper ID handling
    if (!browser) {
      try {
        // Try to get the global connection first if it exists
        let sqlite;
        const globalDb = typeof global !== 'undefined' && 
                        (global as any)?.__sveltekit_dev?.dbConnection;
        
        if (globalDb) {
          console.log('DB: Using global database connection from __sveltekit_dev');
          sqlite = globalDb;
        } else if (Database) {
          console.log('DB: Opening a new database connection to dev.db');
          sqlite = new Database('dev.db');
        } else {
          console.log('DB: Database module not available');
          throw new Error('Database module not available');
        }
        
        // If we didn't get nextId earlier, get it now
        if (nextId === 0) {
          const maxIdStmt = sqlite.prepare('SELECT MAX(sentence_id) as maxId FROM sentences');
          const maxIdResult = maxIdStmt.get();
          nextId = (maxIdResult?.maxId || 0) + 1;
        }
        
        console.log('DB: Using next sentence ID:', nextId);
        
        // Prepare the insert statement
        const insertStmt = sqlite.prepare(`
          INSERT INTO sentences (
            sentence_id, 
            sentence, 
            translation, 
            difficulty_level, 
            tags, 
            created_at, 
            llm_processed
          ) VALUES (?, ?, ?, ?, ?, datetime('now'), 0)
        `);
        
        // Execute the insert
        const insertResult = insertStmt.run(
          nextId,
          data.sentence,
          data.translation || null,
          data.difficultyLevel || 1,
          data.tags || null
        );
        
        console.log('DB: Direct insert result:', insertResult);
        
        if (insertResult.changes > 0) {
          // Fetch the newly created sentence
          const getStmt = sqlite.prepare(`
            SELECT 
              sentence_id as sentenceId,
              sentence,
              translation,
              notes,
              difficulty_level as difficultyLevel,
              tags,
              furigana_data as furiganaData,
              created_at as createdAt,
              llm_processed as llmProcessed
            FROM sentences
            WHERE sentence_id = ?
          `);
          
          const newSentence = getStmt.get(nextId);
          
          // Close the connection only if we created a new one
          if (sqlite !== globalDb && sqlite.close) {
            sqlite.close();
          }
          
          if (newSentence) {
            console.log('DB: Created sentence with direct connection, ID:', newSentence.sentenceId);
            return {
              ...newSentence,
              createdAt: new Date(newSentence.createdAt),
              llmProcessed: !!newSentence.llmProcessed
            };
          }
        }
        
        // Close the connection if we haven't already
        if (sqlite !== globalDb && sqlite.close) {
          sqlite.close();
        }
      } catch (directError) {
        console.error('DB: Error with direct connection for insert:', directError);
        throw directError;
      }
    } else {
      console.log('DB: Browser Mock DB: Cannot insert in browser environment');
    }
    
    // Fall back to ORM if direct connection failed or we're in browser
    // This likely won't work in production but keeping for development fallback
    console.log('DB: Falling back to ORM for sentence creation');
    const result = await db.insert(sentences).values({
      ...data,
      llmProcessed: false,
    }).returning();
    
    if (result && result.length > 0) {
      console.log('DB: Sentence created successfully with ID via ORM:', result[0].sentenceId);
      return result[0];
    }
    
    throw new Error('Failed to create sentence properly');
  } catch (error) {
    console.error('DB: Error in createSentence:', error);
    throw error;
  }
}

/**
 * Update a sentence
 */
export async function updateSentence(id: number, data: Partial<Omit<Sentence, 'sentenceId' | 'createdAt'>>): Promise<Sentence | undefined> {
  console.log('DB: Updating sentence with ID:', id, 'with data:', data);
  
  try {
    // First try using the ORM
    const result = await db.update(sentences)
      .set(data)
      .where(eq(sentences.sentenceId, id))
      .returning();
      
    if (result && result.length > 0) {
      console.log('DB: Updated sentence via ORM:', result[0].sentenceId);
      return result[0];
    } else {
      console.log('DB: Sentence not updated via ORM, trying direct SQLite connection');
      
      // If ORM didn't return results, try direct connection (server-side only)
      if (!browser) {
        try {
          // Try to get the global connection first if it exists
          let sqlite;
          const globalDb = typeof global !== 'undefined' && 
                          (global as any)?.__sveltekit_dev?.dbConnection;
          
          if (globalDb) {
            console.log('DB: Using global database connection from __sveltekit_dev');
            sqlite = globalDb;
          } else if (Database) {
            console.log('DB: Opening a new database connection to dev.db');
            sqlite = new Database('dev.db');
          } else {
            console.log('DB: Database module not available');
            return undefined;
          }
          
          // First check if the sentence exists
          const checkStmt = sqlite.prepare('SELECT sentence_id FROM sentences WHERE sentence_id = ?');
          const exists = checkStmt.get(id);
          
          if (!exists) {
            console.log('DB: Sentence not found for update:', id);
            return undefined;
          }
          
          // Build update statement dynamically based on provided data
          const updateFields = [];
          const params = [];
          
          if ('sentence' in data) {
            updateFields.push('sentence = ?');
            params.push(data.sentence);
          }
          
          if ('translation' in data) {
            updateFields.push('translation = ?');
            params.push(data.translation);
          }
          
          if ('difficultyLevel' in data) {
            updateFields.push('difficulty_level = ?');
            params.push(data.difficultyLevel);
          }
          
          if ('tags' in data) {
            updateFields.push('tags = ?');
            params.push(data.tags);
          }
          
          if ('furiganaData' in data) {
            updateFields.push('furigana_data = ?');
            params.push(data.furiganaData);
          }
          
          if ('llmProcessed' in data) {
            updateFields.push('llm_processed = ?');
            params.push(data.llmProcessed ? 1 : 0);
          }
          
          if (updateFields.length === 0) {
            console.log('DB: No fields to update');
            
            // Just retrieve and return the existing sentence
            const getStmt = sqlite.prepare(`
              SELECT 
                sentence_id as sentenceId,
                sentence,
                translation,
                difficulty_level as difficultyLevel,
                tags,
                furigana_data as furiganaData,
                created_at as createdAt,
                llm_processed as llmProcessed
              FROM sentences
              WHERE sentence_id = ?
            `);
            
            const row = getStmt.get(id);
            
            // Close the connection only if we created a new one
            if (sqlite !== globalDb && sqlite.close) {
              sqlite.close();
            }
            
            if (row) {
              return {
                ...row,
                createdAt: new Date(row.createdAt)
              };
            }
            return undefined;
          }
          
          // Perform the update
          const updateSql = `UPDATE sentences SET ${updateFields.join(', ')} WHERE sentence_id = ?`;
          params.push(id);
          
          const updateStmt = sqlite.prepare(updateSql);
          const result = updateStmt.run(...params);
          
          console.log('DB: Updated sentence via direct connection:', id, 'Changes:', result.changes);
          
          // Get the updated sentence
          const getStmt = sqlite.prepare(`
            SELECT 
              sentence_id as sentenceId,
              sentence,
              translation,
              difficulty_level as difficultyLevel,
              tags,
              furigana_data as furiganaData,
              created_at as createdAt,
              llm_processed as llmProcessed
            FROM sentences
            WHERE sentence_id = ?
          `);
          
          const row = getStmt.get(id);
          
          // Close the connection only if we created a new one
          if (sqlite !== globalDb && sqlite.close) {
            sqlite.close();
          }
          
          if (row) {
            return {
              ...row,
              createdAt: new Date(row.createdAt)
            };
          }
        } catch (directError) {
          console.error('DB: Error with direct connection for update:', directError);
        }
      } else if (browser) {
        console.log('DB: Running in browser, direct SQLite connection not available');
      }
      
      console.log('DB: Sentence could not be updated');
      return undefined;
    }
  } catch (error) {
    console.error('DB: Error in updateSentence:', error);
    return undefined;
  }
}

/**
 * Delete a sentence
 */
export async function deleteSentence(id: number): Promise<boolean> {
  console.log(`DB: Attempting to delete sentence with ID: ${id}`);
  
  try {
    if (browser) {
      console.error('DB: Cannot delete sentence in browser environment');
      return false;
    }
    
    // Delete the sentence using direct SQL (more reliable)
    return deleteWithDirectSQL(id);
  } catch (error) {
    console.error('DB: Error deleting sentence:', error);
    return false;
  }
}

/**
 * Helper function to delete a sentence with direct SQL
 */
async function deleteWithDirectSQL(id: number): Promise<boolean> {
  if (browser) {
    console.error('DB: Cannot delete sentence in browser environment');
    return false;
  }
  
  try {
    // Try to get the global connection first if it exists
    let sqlite;
    const globalDb = typeof global !== 'undefined' && 
                    (global as any)?.__sveltekit_dev?.dbConnection;
    
    if (globalDb) {
      console.log('DB: Using global database connection for deletion');
      sqlite = globalDb;
    } else if (Database) {
      console.log('DB: Opening a new database connection for deletion');
      sqlite = new Database('dev.db');
    } else {
      console.log('DB: Database module not available for deletion');
      return false;
    }
    
    // Verify the sentence exists before attempting deletion
    const checkStmt = sqlite.prepare(`
      SELECT sentence_id FROM sentences
      WHERE sentence_id = ?
    `);
    const existingRow = checkStmt.get(id);
    
    if (!existingRow) {
      console.log(`DB: Sentence with ID ${id} does not exist`);
      return true; // Return true as there's nothing to delete
    }
    
    try {
      // Just delete the sentence directly
      const deleteSentenceStmt = sqlite.prepare(`
        DELETE FROM sentences
        WHERE sentence_id = ?
      `);
      deleteSentenceStmt.run(id);
      
      // Verify the deletion was successful
      const verifyStmt = sqlite.prepare(`
        SELECT COUNT(*) as count FROM sentences
        WHERE sentence_id = ?
      `);
      const checkResult = verifyStmt.get(id);
      
      // Close the connection only if we created a new one
      if (sqlite !== globalDb && sqlite.close) {
        sqlite.close();
      }
      
      if (checkResult.count === 0) {
        console.log(`DB: Successfully deleted sentence ID: ${id} via direct connection`);
        return true;
      } else {
        console.error(`DB: Failed to delete sentence ID: ${id} via direct connection`);
        return false;
      }
    } catch (err) {
      console.error('DB: Error with delete operation:', err);
      
      // Close the connection only if we created a new one
      if (sqlite !== globalDb && sqlite.close) {
        sqlite.close();
      }
      
      throw err;
    }
  } catch (directError) {
    console.error('DB: Error with direct delete connection:', directError);
    return false;
  }
}

/**
 * Parse furigana data from JSON string
 */
export function parseFuriganaData(furiganaData: string | null | undefined): FuriganaItem[] {
  if (!furiganaData) {
    console.log('No furigana data to parse, returning empty array');
    return [];
  }
  
  try {
    console.log('Parsing furigana data:', furiganaData);
    if (typeof furiganaData !== 'string') {
      console.warn('Expected string for furigana data but got:', typeof furiganaData);
      return [];
    }
    
    // Handle empty arrays or whitespace
    if (furiganaData.trim() === '' || furiganaData === '[]') {
      console.log('Empty furigana data, returning empty array');
      return [];
    }
    
    const parsed = JSON.parse(furiganaData) as FuriganaItem[];
    
    // Validate the parsed data
    if (!Array.isArray(parsed)) {
      console.warn('Parsed furigana data is not an array:', parsed);
      return [];
    }
    
    console.log(`Successfully parsed ${parsed.length} furigana items`);
    return parsed;
  } catch (error) {
    console.error('Error parsing furigana data:', error);
    console.error('Raw furigana data that failed to parse:', furiganaData);
    return [];
  }
} 