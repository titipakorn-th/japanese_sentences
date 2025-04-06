import { browser } from '$app/environment';
import Database from 'better-sqlite3';

// Global type declarations
interface SvelteKitGlobal {
  __sveltekit_dev?: {
    dbConnection?: any;
  };
}

/**
 * SQL template tag for executing SQL queries using the global database connection
 * This allows for safe parameterized queries
 */
export const sql = (strings: TemplateStringsArray, ...values: any[]) => {
  if (browser) {
    console.warn('SQL queries cannot be executed in the browser');
    return [];
  }

  try {
    // Get the global connection first if it exists
    let db;
    const globalObj = global as unknown as SvelteKitGlobal;
    const globalDb = typeof global !== 'undefined' && 
                    globalObj.__sveltekit_dev && 
                    globalObj.__sveltekit_dev.dbConnection;
    
    if (globalDb) {
      console.log('DB: Using global database connection from __sveltekit_dev');
      db = globalDb;
    } else {
      console.log('DB: Opening a new database connection to dev.db');
      db = new Database('dev.db');
    }

    // Prepare the SQL query by merging strings and parameters
    let query = strings[0];
    for (let i = 0; i < values.length; i++) {
      query += '?' + strings[i + 1];
    }

    // Create and execute the prepared statement
    const stmt = db.prepare(query.trim());
    const result = stmt.all(...values);
    
    // Close connection if we created a new one
    if (db !== globalDb && db.close) {
      db.close();
    }
    
    return result;
  } catch (error) {
    console.error('Error executing SQL query:', error);
    throw error;
  }
}; 