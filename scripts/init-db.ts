import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the SQL migration files
const migrationsDir = path.join(__dirname, '../src/lib/db/migrations');
const dbPath = path.join(__dirname, '../japanese_learning.db');

// Create a new database connection
const db = new Database(dbPath);

console.log('Initializing database...');

// Read migration files and execute them in order
const migrationFiles = fs.readdirSync(migrationsDir)
  .filter(file => file.endsWith('.sql'))
  .sort();

console.log(`Found ${migrationFiles.length} migration files.`);

for (const file of migrationFiles) {
  console.log(`Running migration: ${file}`);
  const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
  
  // Split SQL by statement breakpoints and execute each statement
  const statements = sql.split('-->').join('').split('statement-breakpoint');
  
  for (const statement of statements) {
    const trimmedStatement = statement.trim();
    if (trimmedStatement) {
      try {
        db.exec(trimmedStatement);
      } catch (err) {
        console.error(`Error executing SQL: ${trimmedStatement}`);
        console.error(err);
        process.exit(1);
      }
    }
  }
}

console.log('Database initialization completed successfully.');
db.close(); 