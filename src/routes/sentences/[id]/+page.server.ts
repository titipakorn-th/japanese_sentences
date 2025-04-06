import { getSentenceWithWords, deleteSentence, getSentenceById } from '$lib/db/queries/sentences';
import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  const sentenceId = parseInt(params.id);
  
  if (isNaN(sentenceId)) {
    throw error(400, 'Invalid sentence ID');
  }
  
  const sentenceWithWords = await getSentenceWithWords(sentenceId);
  
  if (!sentenceWithWords) {
    throw error(404, 'Sentence not found');
  }
  
  return {
    sentenceWithWords
  };
};

export const actions: Actions = {
  delete: async ({ params }) => {
    const sentenceId = parseInt(params.id);
    
    if (isNaN(sentenceId)) {
      console.error('Invalid sentence ID for deletion:', params.id);
      return fail(400, { error: 'Invalid sentence ID' });
    }
    
    console.log('Server: Attempting to delete sentence with ID:', sentenceId);
    
    try {
      const success = await deleteSentence(sentenceId);
      
      if (!success) {
        console.error('Server: Database returned failure for delete operation on ID:', sentenceId);
        return fail(500, { error: 'Failed to delete sentence' });
      }
      
      console.log('Server: Successfully deleted sentence with ID:', sentenceId);
      
      // Verify the deletion by trying to get the sentence
      const sentenceStillExists = await getSentenceById(sentenceId);
      if (sentenceStillExists) {
        console.error('Server: Sentence still exists after deletion:', sentenceId);
        return fail(500, { 
          error: 'Failed to delete sentence', 
          details: 'Sentence still exists after deletion'
        });
      }
      
      console.log('Server: Verified deletion, redirecting to sentences list');
      
      // Use redirect status code properly
      return {
        status: 303,
        location: '/sentences'
      };
    } catch (error) {
      console.error('Server: Error deleting sentence:', error);
      
      // If the item no longer exists, consider it a success
      try {
        const sentenceStillExists = await getSentenceById(sentenceId);
        if (!sentenceStillExists) {
          console.log('Server: Sentence no longer exists after error, redirecting anyway');
          return {
            status: 303,
            location: '/sentences'
          };
        }
      } catch (checkError) {
        console.error('Server: Error checking if sentence exists:', checkError);
      }
      
      // Return a failure response
      return fail(500, { 
        error: 'Error deleting sentence',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }
}; 