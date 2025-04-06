import { runMigrations } from '../src/lib/db/index.js';

// Run migrations
console.log('Running database migrations...');
runMigrations();
console.log('Migrations completed successfully.'); 