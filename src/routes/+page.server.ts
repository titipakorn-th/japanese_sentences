import { getAllSentences } from '$lib/db/queries/sentences';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ depends }) => {
  // Use the depends function to track dependencies
  depends('sentences:list');
  
  // Get all sentences for the visualization
  // No paging for the cloud visualization - we want all sentences
  const limit = 100; // Reasonable limit to avoid performance issues
  const sentences = await getAllSentences(limit, 0);
  
  console.log(`Home page: Retrieved ${sentences.length} sentences for visualization`);
  
  return {
    sentences
  };
}; 