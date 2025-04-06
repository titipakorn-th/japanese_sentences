import { getAllSentences } from '$lib/db/queries/sentences';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, depends }) => {
  // Use the depends function to track dependencies
  depends('sentences:list');
  
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = 20;
  const offset = (page - 1) * limit;
  const tag = url.searchParams.get('tag') || '';
  
  console.log('Loading sentences page', { page, limit, offset, tag });
  const sentences = await getAllSentences(limit, offset, tag);
  console.log(`Retrieved ${sentences.length} sentences`);
  
  return {
    sentences,
    pagination: {
      page,
      limit,
      activeTag: tag
    }
  };
}; 