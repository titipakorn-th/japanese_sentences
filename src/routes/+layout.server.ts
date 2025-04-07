// Server-side layout setup for database initialization
import { runMigrations } from '$lib/db';
import { building } from '$app/environment';

export async function load() {
  // Only run migrations when not building
  if (!building) {
    try {
      console.log('Server: Initializing database connection from layout.server.ts');
      await runMigrations();
      console.log('Server: Database migrations completed successfully');
    } catch (error) {
      console.error('Server: Error initializing database:', error);
    }
  }
  
  // Return empty props as we don't need to pass any data to the layout
  return {};
} 