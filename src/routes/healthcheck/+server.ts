import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async () => {
  // You could add database connectivity checks here
  return json({ status: 'ok', timestamp: new Date().toISOString() });
}; 