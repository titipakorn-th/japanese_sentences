import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

// Database path
const dbPath = path.join(rootDir, 'japanese_learning.db');

// Delete the existing database if it exists
console.log('Checking for existing database...');
if (fs.existsSync(dbPath)) {
  console.log(`Found existing database at ${dbPath}. Deleting...`);
  fs.unlinkSync(dbPath);
  console.log('Existing database deleted.');
} else {
  console.log('No existing database found. Creating a new one.');
}

// Initialize the database with schema
console.log('\nInitializing database...');
try {
  execSync('npm run db:init', { stdio: 'inherit', cwd: rootDir });
  console.log('Database initialized successfully.');
} catch (error) {
  console.error('Error initializing database:', error);
  process.exit(1);
}

// Seed the database with example data
console.log('\nSeeding database with example data...');
try {
  execSync('npm run db:seed', { stdio: 'inherit', cwd: rootDir });
  console.log('Database seeded successfully.');
} catch (error) {
  console.error('Error seeding database:', error);
  process.exit(1);
}

console.log('\n✓ Database setup completed successfully!');
console.log('You can now run the app with: npm run dev'); 