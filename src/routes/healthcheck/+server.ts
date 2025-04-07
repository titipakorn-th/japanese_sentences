import { json } from '@sveltejs/kit';
import { browser } from '$app/environment';
import type { RequestHandler } from './$types';

// Simple health check endpoint for container health checking and diagnostics
export const GET: RequestHandler = async () => {
  // Check if database is accessible
  let dbStatus = 'unknown';
  let dbMessage = '';
  
  // Only check DB on server
  if (!browser) {
    try {
      // Try to access the global database connection
      const globalObj = global as any;
      const globalDb = typeof global !== 'undefined' && 
                      globalObj.__sveltekit_dev && 
                      globalObj.__sveltekit_dev.dbConnection;
      
      if (globalDb) {
        // Try to run a simple query
        try {
          const result = globalDb.prepare('SELECT 1 as test').get();
          if (result && result.test === 1) {
            dbStatus = 'connected';
            
            // Also check if sentences table exists and has data
            try {
              const tableCheck = globalDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='sentences'").get();
              if (tableCheck) {
                const rowCount = globalDb.prepare('SELECT COUNT(*) as count FROM sentences').get();
                dbMessage = `Database connected with ${rowCount.count} sentences`;
              } else {
                dbMessage = 'Database connected but sentences table missing';
              }
            } catch (tableError) {
              dbMessage = `Database connected but error checking tables: ${tableError instanceof Error ? tableError.message : String(tableError)}`;
            }
          } else {
            dbStatus = 'error';
            dbMessage = 'Database query returned unexpected result';
          }
        } catch (queryError) {
          dbStatus = 'error';
          dbMessage = `Database query error: ${queryError instanceof Error ? queryError.message : String(queryError)}`;
        }
      } else {
        // Try to load better-sqlite3 directly
        try {
          // Use dynamic import instead of require
          const betterSqlite3Import = await import('better-sqlite3');
          const BetterSQLite3 = betterSqlite3Import.default || betterSqlite3Import;
          
          const dbPaths = ['japanese_learning.db', 'dev.db'];
          
          let connected = false;
          for (const dbPath of dbPaths) {
            try {
              const sqlite = new BetterSQLite3(dbPath);
              const result = sqlite.prepare('SELECT 1 as test').get() as { test: number };
              if (result && result.test === 1) {
                dbStatus = 'connected-direct';
                dbMessage = `Direct connection to ${dbPath} successful`;
                connected = true;
                sqlite.close();
                break;
              }
              sqlite.close();
            } catch (dbPathError) {
              // Continue to next path
            }
          }
          
          if (!connected) {
            dbStatus = 'error';
            dbMessage = 'Failed to connect to any database file';
          }
        } catch (requireError) {
          dbStatus = 'unavailable';
          dbMessage = `better-sqlite3 module not available: ${requireError instanceof Error ? requireError.message : String(requireError)}`;
        }
      }
    } catch (dbError) {
      dbStatus = 'error';
      dbMessage = `Database error: ${dbError instanceof Error ? dbError.message : String(dbError)}`;
    }
  } else {
    dbStatus = 'browser';
    dbMessage = 'Running in browser context, no database check performed';
  }
  
  // Return a JSON response with health info
  return json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: {
      status: dbStatus,
      message: dbMessage
    },
    environment: process.env.NODE_ENV || 'unknown'
  });
}; 