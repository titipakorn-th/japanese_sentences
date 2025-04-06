import { browser } from '$app/environment';
import { building, dev } from '$app/environment';

// Only import Node.js modules on the server
let Database: any;
let drizzle: any;
let migrate: any;
let path: any;
let fs: any;

// Only initialize database on the server
let mockDbConnection: any = null;

// Define our global interface for SvelteKit
interface SvelteKitGlobal {
  __sveltekit_dev?: {
    dbConnection?: any;
  };
}

// Server-side initialization - will be stripped out during client bundling
if (!browser) {
  // Only import these in server context
  const importDatabase = async () => {
    try {
      Database = (await import('better-sqlite3')).default;
      drizzle = (await import('drizzle-orm/better-sqlite3')).drizzle;
      migrate = (await import('drizzle-orm/better-sqlite3/migrator')).migrate;
      path = await import('node:path');
      fs = await import('node:fs');
      console.log('SQLite and DB modules loaded successfully');
    } catch (error) {
      console.error('Error loading database modules:', error);
    }
  };

  // Execute the import (this won't run in the browser)
  importDatabase();
}

// Import schema (safe for browser and server)
import * as schema from './schema/index.js';
import { eq } from 'drizzle-orm';

// Define types for our where conditions
interface WhereCondition {
  _eq?: Array<{column?: string, value: any}>;
}

interface QueryOptions {
  where?: WhereCondition;
  limit?: number;
  offset?: number;
  orderBy?: any[];
}

// Define our mockDb implementation for browser
const mockDb = {
  query: {
    vocabulary: {
      findFirst: async () => null,
      findMany: async () => []
    },
    furiganaCache: {
      findFirst: async () => null,
      findMany: async () => []
    },
    sentences: {
      findFirst: async ({ where }: {where?: WhereCondition} = {}) => {
        // In browser, we return null for empty mock data
        return null;
      },
      findMany: async ({ limit = 50, offset = 0, orderBy = [] } = {}) => {
        console.log('Browser Mock DB: No data available in browser');
        return [];
      }
    },
    wordInstances: {
      findMany: async ({ where }: QueryOptions = {}) => {
        // In browser, we return empty array
        return [];
      }
    }
  },
  insert: () => ({
    values: (data: any) => ({
      returning: async () => {
        console.log('Browser Mock DB: Cannot insert in browser environment');
        // Return a mock with ID 1 in browser context
        return [{
          ...data,
          sentenceId: 1,
          createdAt: new Date(),
        }];
      },
    }),
  }),
  update: () => ({
    set: (data: any) => ({
      where: (condition: any) => ({
        returning: async () => {
          console.log('Browser Mock DB: Cannot update in browser environment');
          return [];
        },
      }),
    }),
  }),
  delete: () => ({
    where: (condition: any): any => {
      console.log('Browser Mock DB: Cannot delete in browser environment');
    }
  })
};

// Database with SQLite persistence (for server in development mode)
const mockDbWithPersistence = {
  query: {
    vocabulary: {
      findFirst: async () => null,
      findMany: async () => []
    },
    furiganaCache: {
      findFirst: async () => null,
      findMany: async () => []
    },
    sentences: {
      findFirst: async ({ where }: {where?: WhereCondition} = {}) => {
        // Check for the global connection first
        const globalObj = global as unknown as SvelteKitGlobal;
        const globalDb = typeof global !== 'undefined' && 
                          globalObj.__sveltekit_dev && 
                          globalObj.__sveltekit_dev.dbConnection;
        
        // Use global connection if available, otherwise use mockDbConnection
        const dbConn = globalDb || mockDbConnection;
        
        if (!dbConn) {
          console.log('No database connection available, using in-memory mock');
          return mockDb.query.sentences.findFirst({ where });
        }
        
        try {
          // Find a specific sentence by ID
          if (where && where._eq) {
            const idFilter = where._eq.find(c => c && c.value !== undefined);
            if (idFilter && idFilter.value) {
              const stmt = dbConn.prepare('SELECT * FROM sentences WHERE sentence_id = ?');
              const row = stmt.get(idFilter.value);
              
              if (row) {
                return {
                  sentenceId: row.sentence_id,
                  sentence: row.sentence,
                  translation: row.translation,
                  notes: row.notes,
                  difficultyLevel: row.difficulty_level,
                  tags: row.tags,
                  furiganaData: row.furigana_data,
                  createdAt: new Date(row.created_at),
                  llmProcessed: !!row.llm_processed
                };
              }
              return null;
            }
          }
          
          // Default: return first sentence
          const stmt = dbConn.prepare('SELECT * FROM sentences ORDER BY sentence_id DESC LIMIT 1');
          const row = stmt.get();
          
          if (row) {
            return {
              sentenceId: row.sentence_id,
              sentence: row.sentence,
              translation: row.translation,
              notes: row.notes,
              difficultyLevel: row.difficulty_level,
              tags: row.tags,
              furiganaData: row.furigana_data,
              createdAt: new Date(row.created_at),
              llmProcessed: !!row.llm_processed
            };
          }
          return null;
        } catch (e) {
          console.error('Error in mockDbWithPersistence.findFirst:', e);
          return mockDb.query.sentences.findFirst({ where });
        }
      },
      findMany: async ({ limit = 50, offset = 0, orderBy = [] } = {}) => {
        // Check for the global connection first
        const globalObj = global as unknown as SvelteKitGlobal;
        const globalDb = typeof global !== 'undefined' && 
                        globalObj.__sveltekit_dev && 
                        globalObj.__sveltekit_dev.dbConnection;
        
        // Use global connection if available, otherwise use mockDbConnection
        const dbConn = globalDb || mockDbConnection;
        
        if (!dbConn) {
          console.log('No database connection available, using in-memory mock');
          return mockDb.query.sentences.findMany({ limit, offset, orderBy });
        }
        
        try {
          console.log('DB (Persistent): Returning sentences from SQLite', { limit, offset });
          
          const stmt = dbConn.prepare(
            'SELECT * FROM sentences ORDER BY created_at DESC LIMIT ? OFFSET ?'
          );
          const rows = stmt.all(limit, offset);
          
          console.log(`DB (Persistent): Found ${rows.length} sentences in database`);
          
          if (rows.length > 0) {
            console.log('DB (Persistent): First sentence ID:', rows[0].sentence_id);
          }
          
          return rows.map((row: any) => ({
            sentenceId: row.sentence_id,
            sentence: row.sentence,
            translation: row.translation,
            notes: row.notes,
            difficultyLevel: row.difficulty_level,
            tags: row.tags,
            furiganaData: row.furigana_data,
            createdAt: new Date(row.created_at),
            llmProcessed: !!row.llm_processed
          }));
        } catch (e) {
          console.error('Error in mockDbWithPersistence.findMany:', e);
          return mockDb.query.sentences.findMany({ limit, offset, orderBy });
        }
      }
    },
    wordInstances: {
      findMany: async (options: QueryOptions = {}) => mockDb.query.wordInstances.findMany(options)
    }
  },
  insert: () => ({
    values: (data: any) => ({
      returning: async () => {
        try {
          // Check for the global connection first
          const globalObj = global as unknown as SvelteKitGlobal;
          const globalDb = typeof global !== 'undefined' && 
                            globalObj.__sveltekit_dev && 
                            globalObj.__sveltekit_dev.dbConnection;
          
          // Use global connection if available, otherwise use mockDbConnection
          const dbConn = globalDb || mockDbConnection;
          
          if (!dbConn) {
            console.log('No database connection available, using in-memory mock');
            return mockDb.insert().values(data).returning();
          }
          
          // Generate a timestamp for createdAt
          const now = new Date();
          const nowIso = now.toISOString();
          
          // For sqlite insert, we need to convert the data to match the schema
          try {
            // Let SQLite handle the auto-increment for sentence_id
            const insertStmt = dbConn.prepare(`
              INSERT INTO sentences 
              (sentence, translation, notes, difficulty_level, tags, furigana_data, created_at, llm_processed)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `);
            
            // Insert data, excluding sentenceId (let SQLite assign it)
            const result = insertStmt.run(
              data.sentence,
              data.translation || null,
              data.notes || null,
              data.difficultyLevel || 1,
              data.tags || null,
              data.furiganaData || null,
              nowIso,
              data.llmProcessed ? 1 : 0
            );
            
            console.log('DB INSERT: Successfully inserted into dev.db');
            console.log('DB INSERT: Last inserted row ID:', result.lastInsertRowid);
            
            // Get the auto-assigned ID from SQLite
            const insertedId = result.lastInsertRowid;
            
            // Get the full inserted record
            const selectStmt = dbConn.prepare('SELECT * FROM sentences WHERE sentence_id = ?');
            const insertedRow = selectStmt.get(insertedId);
            
            if (!insertedRow) {
              console.error('DB INSERT: Could not retrieve inserted row');
              throw new Error('Failed to retrieve inserted row');
            }
            
            // Create the sentence object with the correct ID from the database
            const newSentence = {
              sentenceId: insertedRow.sentence_id,
              sentence: insertedRow.sentence,
              translation: insertedRow.translation,
              notes: insertedRow.notes,
              difficultyLevel: insertedRow.difficulty_level,
              tags: insertedRow.tags,
              furiganaData: insertedRow.furigana_data,
              createdAt: nowIso,
              llmProcessed: !!insertedRow.llm_processed
            };
            
            console.log('DB INSERT: Created sentence with ID:', newSentence.sentenceId);
            
            // Return the new sentence with the ID from SQLite
            return [{
              ...newSentence,
              createdAt: new Date(nowIso)
            }];
          } catch (insertError) {
            console.error('DB INSERT ERROR:', insertError);
            throw insertError;
          }
        } catch (e) {
          console.error('Error in mockDbWithPersistence.insert:', e);
          return mockDb.insert().values(data).returning();
        }
      }
    })
  }),
  update: () => ({
    set: (data: any) => ({
      where: (condition: any) => ({
        returning: async () => {
          try {
            if (!mockDbConnection) return mockDb.update().set(data).where(condition).returning();
            
            const sentenceId = condition.sentenceId.value;
            
            // First check if the sentence exists
            const checkStmt = mockDbConnection.prepare('SELECT sentence_id FROM sentences WHERE sentence_id = ?');
            const exists = checkStmt.get(sentenceId);
            
            if (!exists) {
              console.warn('Mock DB (Persistent): Sentence not found for update', sentenceId);
              return [];
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
            
            if ('notes' in data) {
              updateFields.push('notes = ?');
              params.push(data.notes);
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
              console.warn('Mock DB (Persistent): No fields to update');
              
              // Just return the existing sentence
              const getStmt = mockDbConnection.prepare('SELECT * FROM sentences WHERE sentence_id = ?');
              const row = getStmt.get(sentenceId);
              
              return [{
                sentenceId: row.sentence_id,
                sentence: row.sentence,
                translation: row.translation,
                notes: row.notes,
                difficultyLevel: row.difficulty_level,
                tags: row.tags,
                furiganaData: row.furigana_data,
                createdAt: new Date(row.created_at),
                llmProcessed: !!row.llm_processed
              }];
            }
            
            // Perform the update
            const updateSql = `UPDATE sentences SET ${updateFields.join(', ')} WHERE sentence_id = ?`;
            params.push(sentenceId);
            
            const updateStmt = mockDbConnection.prepare(updateSql);
            updateStmt.run(...params);
            
            console.log('Mock DB (Persistent): Updated sentence', sentenceId);
            
            // Get the updated sentence
            const getStmt = mockDbConnection.prepare('SELECT * FROM sentences WHERE sentence_id = ?');
            const row = getStmt.get(sentenceId);
            
            return [{
              sentenceId: row.sentence_id,
              sentence: row.sentence,
              translation: row.translation,
              notes: row.notes,
              difficultyLevel: row.difficulty_level,
              tags: row.tags,
              furiganaData: row.furigana_data,
              createdAt: new Date(row.created_at),
              llmProcessed: !!row.llm_processed
            }];
          } catch (e) {
            console.error('Error in mockDbWithPersistence.update:', e);
            return mockDb.update().set(data).where(condition).returning();
          }
        }
      })
    })
  }),
  delete: () => ({
    where: (condition: any): any => {
      try {
        if (!mockDbConnection) return mockDb.delete().where(condition);
        
        const sentenceId = condition.sentenceId.value;
        
        // Delete from SQLite
        const stmt = mockDbConnection.prepare('DELETE FROM sentences WHERE sentence_id = ?');
        const result = stmt.run(sentenceId);
        
        if (result.changes > 0) {
          console.log('Mock DB (Persistent): Deleted sentence', sentenceId);
        }
        
        // Return result for consistency
        return { changes: result.changes };
      } catch (e) {
        console.error('Error in mockDbWithPersistence.delete:', e);
        return mockDb.delete().where(condition);
      }
    }
  })
};

// Initialize the development database connection if we're in server context
function initMockDatabase() {
  // This function should never be called in browser context
  if (browser) {
    console.log('Skipping database initialization: in browser context');
    return null;
  }
  
  if (!dev) {
    console.log('Skipping mock database initialization: not in development mode');
    return null;
  }
  
  if (!Database) {
    console.log('Skipping database initialization: Database module not loaded');
    return null;
  }
  
  try {
    // Use dev.db consistently for development instead of mock.db
    const dbPath = 'dev.db';
    console.log(`Initializing development database at ${dbPath}`);
    
    // Check if database file exists (only on server)
    let isNewDb = false;
    try {
      isNewDb = !fs.existsSync(dbPath);
      console.log(`Database file exists: ${!isNewDb}`);
    } catch (fsError) {
      console.error('Error checking if database file exists:', fsError);
      // Continue anyway, Database will create the file if needed
    }
    
    // Try to open the database with explicit error logging
    let sqlite;
    try {
      sqlite = new Database(dbPath, { verbose: console.log });
      console.log('Successfully opened database connection');
    } catch (dbError) {
      console.error('Failed to open database connection:', dbError);
      return null;
    }
    
    // Initialize the database with tables if it doesn't exist yet
    if (isNewDb) {
      console.log('Creating database tables for new database');
      
      try {
        sqlite.exec(`
          CREATE TABLE IF NOT EXISTS sentences (
            sentence_id INTEGER PRIMARY KEY,
            sentence TEXT NOT NULL,
            translation TEXT,
            notes TEXT,
            difficulty_level INTEGER DEFAULT 1,
            tags TEXT,
            furigana_data TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            llm_processed BOOLEAN DEFAULT FALSE
          )
        `);
        console.log('Successfully created sentences table');
      } catch (tableError) {
        console.error('Failed to create sentences table:', tableError);
      }
      
      // Verify table was created
      try {
        const tableCheck = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='sentences'").get();
        if (tableCheck) {
          console.log('Sentences table exists in database');
        } else {
          console.error('Sentences table was not created properly');
        }
      } catch (verifyError) {
        console.error('Error verifying table creation:', verifyError);
      }
      
      // Insert initial sample data if this is a new database
      try {
        // Default initial sentences for a new database
        const initialSentences = [
          {
            sentenceId: 1,
            sentence: 'これは新しい文章です。',
            translation: 'This is a new sentence.',
            notes: 'Example sentence',
            difficultyLevel: 1,
            tags: 'basic,example',
            furiganaData: null,
            createdAt: new Date().toISOString(),
            llmProcessed: false
          }
        ];
        
        const stmt = sqlite.prepare(`
          INSERT INTO sentences 
          (sentence_id, sentence, translation, notes, difficulty_level, tags, furigana_data, created_at, llm_processed)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        for (const s of initialSentences) {
          stmt.run(
            s.sentenceId,
            s.sentence,
            s.translation,
            s.notes,
            s.difficultyLevel,
            s.tags,
            s.furiganaData,
            s.createdAt,
            s.llmProcessed ? 1 : 0
          );
        }
        
        console.log('Initialized database with sample data');
      } catch (dataError) {
        console.error('Failed to insert sample data:', dataError);
      }
    } else {
      console.log('Using existing database');
      
      // Verify the sentences table exists in the existing database
      try {
        const tableCheck = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='sentences'").get();
        if (tableCheck) {
          console.log('Sentences table exists in database');
          
          // Count number of rows to ensure database is properly working
          const rowCount = sqlite.prepare('SELECT COUNT(*) as count FROM sentences').get();
          console.log(`Database contains ${rowCount.count} sentences`);
        } else {
          console.error('Existing database does not have sentences table - creating it');
          
          // Create the table if it doesn't exist
          sqlite.exec(`
            CREATE TABLE IF NOT EXISTS sentences (
              sentence_id INTEGER PRIMARY KEY,
              sentence TEXT NOT NULL,
              translation TEXT,
              notes TEXT,
              difficulty_level INTEGER DEFAULT 1,
              tags TEXT,
              furigana_data TEXT,
              created_at TEXT DEFAULT CURRENT_TIMESTAMP,
              llm_processed BOOLEAN DEFAULT FALSE
            )
          `);
        }
      } catch (existingDbError) {
        console.error('Error checking existing database:', existingDbError);
      }
    }
    
    return sqlite;
  } catch (e) {
    console.error('Failed to initialize development database:', e);
    return null;
  }
}

// Create a real DB connection on the server, or use mock in browser
export const db = browser 
  ? mockDb  // Browser always uses in-memory mock
  : (() => {
      // Get the global dbConnection if we're in a SvelteKit environment
      // Define the global object shape with __sveltekit_dev property
      interface SvelteKitGlobal {
        __sveltekit_dev?: {
          dbConnection?: any;
        };
      }
      
      const globalObj = global as unknown as SvelteKitGlobal;
      const globalDb = typeof global !== 'undefined' && 
                      globalObj.__sveltekit_dev && 
                      globalObj.__sveltekit_dev.dbConnection;

      if (globalDb) {
        console.log('Using global dbConnection from SvelteKit');
        return mockDbWithPersistence;
      }
      
      if (!Database) {
        console.log('Database module not available, using mockDb');
        return mockDb;
      }
      
      try {
        if (dev) {
          // In development, always use dev.db with our mock interface
          console.log('Using development database: dev.db');
          
          // Initialize the database connection
          if (!mockDbConnection) {
            console.log('Initializing new mockDbConnection');
            mockDbConnection = initMockDatabase();
          }
          
          if (mockDbConnection) {
            console.log('Connected to development database with mockDbWithPersistence');
            
            // Log database info
            try {
              const rowCount = mockDbConnection.prepare('SELECT COUNT(*) as count FROM sentences').get();
              console.log('Database query executed successfully');
              console.log(`Database contains ${rowCount.count} sentences`);
              
              if (rowCount.count > 0) {
                const firstRow = mockDbConnection.prepare('SELECT sentence_id FROM sentences ORDER BY sentence_id DESC LIMIT 1').get();
                console.log(`Found ${rowCount.count} sentences in dev.db`);
                console.log('Latest sentence ID:', firstRow.sentence_id);
              } else {
                console.log('No sentences found in database');
              }
            } catch (error) {
              console.error('Error checking database:', error);
            }
            
            return mockDbWithPersistence;
          } else {
            console.log('Failed to connect to development database, using in-memory mock');
            return mockDb;
          }
        } else {
          // In production, use the production database with drizzle
          const dbFile = 'japanese_learning.db';
          console.log(`Using production database file: ${dbFile}`);
          
          // Check if the file exists
          try {
            if (fs && fs.existsSync && fs.existsSync(dbFile)) {
              console.log(`Found existing production database file: ${dbFile}`);
              const sqlite = new Database(dbFile);
              return drizzle(sqlite, { schema });
            } else {
              console.log(`Production database file not found: ${dbFile}, using in-memory mock`);
              return mockDb;
            }
          } catch (fsError) {
            console.error('Error checking if production database file exists:', fsError);
            return mockDb;
          }
        }
      } catch (e) {
        console.error('Failed to initialize database:', e);
        return mockDb;
      }
    })();

// Export named exports together
export { mockDb, mockDbWithPersistence };

// Run migrations when the app starts (in production, server-side only)
export function runMigrations() {
  // Skip in browser - early return
  if (browser) {
    console.log('Migrations skipped in browser environment');
    return;
  }
  
  // Skip if we don't have the required modules
  if (!path || !migrate) {
    console.log('Migrations skipped: modules not loaded');
    return;
  }
  
  // Skip in development mode
  if (dev) {
    console.log('Running in development mode, using dev.db database');
    return;
  }
  
  // Only run migrations in production, on the server
  try {
    const migrationsFolder = path.join(process.cwd(), 'src/lib/db/migrations');
    migrate(db, { migrationsFolder });
    console.log('Migrations completed');
  } catch (e) {
    console.error('Failed to run migrations:', e);
  }
}