import { fail, redirect } from '@sveltejs/kit';
import { createSentence } from '$lib/db/queries/sentences';
import type { Actions } from './$types';

export const actions: Actions = {
  default: async ({ request }) => {
    const formData = await request.formData();
    
    const sentenceText = formData.get('sentence')?.toString() || '';
    const translation = formData.get('translation')?.toString() || undefined;
    const difficultyLevel = parseInt(formData.get('difficultyLevel')?.toString() || '1');
    const tags = formData.get('tags')?.toString() || undefined;
    
    // Validate input
    if (!sentenceText.trim()) {
      return fail(400, { 
        error: 'Sentence text is required',
        sentence: sentenceText,
        translation,
        difficultyLevel,
        tags
      });
    }
    
    // Declare newSentence outside the try block
    let newSentence;
    
    try {
      console.log('Creating sentence via form action:', { sentenceText, translation, difficultyLevel, tags });
      
      // Create the sentence in the database
      newSentence = await createSentence({
        sentence: sentenceText,
        translation,
        difficultyLevel,
        tags,
        source: 'user',
      });
      
      console.log('Sentence created successfully:', newSentence);
      
      // If we get here without a sentenceId, report an error
      if (!newSentence || !newSentence.sentenceId) {
        return fail(500, { 
          error: 'Failed to create sentence properly',
          details: 'The sentence was created but no ID was returned'
        });
      }
    } catch (error) {
      console.error('Error creating sentence:', error);
      
      return fail(500, { 
        error: 'Failed to create sentence',
        details: error instanceof Error ? error.message : String(error)
      });
    }
    
    // If we get here, the sentence was created successfully - redirect outside the try/catch
    throw redirect(303, `/sentences/${newSentence.sentenceId}`);
  }
}; 