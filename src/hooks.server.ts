import { building, dev } from '$app/environment';
import { runMigrations } from '$lib/db';
import type { Handle } from '@sveltejs/kit';

// Server-side only imports
// These won't be bundled for the client 
import Database from 'better-sqlite3';

// Define custom platform interface with our dbConnection
interface CustomPlatform {
  dbConnection?: any;
  [key: string]: any;
}

// Global variable to hold the SQLite connection
let dbConnection: any = null;

// Make it available to the rest of the app via a global property
// This helps ensure we have a single database connection
declare global {
  // eslint-disable-next-line no-var
  var __sveltekit_dev: {
    dbConnection?: any;
  };
}

// Initialize the global
global.__sveltekit_dev = global.__sveltekit_dev || {};

// This file only runs on the server

// Initialize the database when the server starts (but not during build)
if (!building) {
  console.log('Server starting - initializing database...');
  
  try {
    // For development mode, ensure we have a persistent dev.db file
    if (dev) {
      // Only import fs when needed in development mode
      const fs = await import('node:fs');
      const devDbPath = 'dev.db';
      
      // Check if this is the first time (no db file exists)
      if (!fs.existsSync(devDbPath)) {
        console.log('Creating development database:', devDbPath);
        
        // Create a new database
        const db = new Database(devDbPath);
        dbConnection = db;
        
        // Also set in global for access from db module
        global.__sveltekit_dev.dbConnection = dbConnection;
        
        // Create basic tables
        db.exec(`
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
        
        // Add initial sentences
        const initialSentences = [
          {
            sentence: '私は日本語を勉強しています。',
            translation: 'I am studying Japanese.',
            notes: 'Basic present progressive tense',
            difficulty: 1,
            tags: 'beginner,grammar,verb',
          },
          {
            sentence: '明日は東京に行きます。',
            translation: 'I will go to Tokyo tomorrow.',
            notes: 'Future tense with に particle',
            difficulty: 2,
            tags: 'intermediate,travel,verb',
          },
          {
            sentence: '彼女は本を読んでいました。',
            translation: 'She was reading a book.',
            notes: 'Past progressive tense',
            difficulty: 2,
            tags: 'intermediate,grammar,verb',
          }
        ];
        
        // Insert sample data
        const stmt = db.prepare(`
          INSERT INTO sentences 
          (sentence, translation, notes, difficulty_level, tags)
          VALUES (?, ?, ?, ?, ?)
        `);
        
        for (const s of initialSentences) {
          stmt.run(
            s.sentence,
            s.translation,
            s.notes,
            s.difficulty,
            s.tags
          );
        }
        
        console.log('Initialized development database with sample data');
      } else {
        console.log('Using existing development database:', devDbPath);
        
        try {
          // Open the existing database
          dbConnection = new Database(devDbPath);
          
          // Also set in global for access from db module
          global.__sveltekit_dev.dbConnection = dbConnection;
          
          // Check if table exists and has data
          const rowCount = dbConnection.prepare('SELECT COUNT(*) as count FROM sentences').get();
          console.log(`Found ${rowCount.count} sentences in existing database`);
          
          if (rowCount.count > 0) {
            const first = dbConnection.prepare('SELECT sentence_id FROM sentences ORDER BY sentence_id DESC LIMIT 1').get();
            console.log('Latest sentence ID:', first.sentence_id);
          }
        } catch (err) {
          console.error('Error connecting to existing database:', err);
        }
      }
    }
    
    // Ensure database is properly initialized in lib/db/index.ts
    console.log('Running migrations...');
    runMigrations();
  } catch (error) {
    console.error('Failed to initialize database:', error);
  }
}

// Handle function for SvelteKit, called for each request
export const handle: Handle = async ({ event, resolve }) => {
  // Make the database connection available to the app
  if (dbConnection) {
    console.log('Adding dbConnection to event.platform');
    // Attach to platform so it can be accessed in routes
    event.platform = {
      ...event.platform,
      dbConnection
    } as CustomPlatform;
  }
  
  return await resolve(event);
};