import { getSentenceById, updateSentence } from '$lib/db/queries/sentences';
import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { base } from '$app/paths';

export const load: PageServerLoad = async ({ params, fetch }) => {
  console.log('Edit page load function called with params:', params);
  const sentenceId = parseInt(params.id);
  
  if (isNaN(sentenceId)) {
    console.error('Invalid sentence ID:', params.id);
    throw error(400, 'Invalid sentence ID');
  }
  
  console.log('Attempting to fetch sentence with ID:', sentenceId);
  try {
    const sentence = await getSentenceById(sentenceId);
    
    if (!sentence) {
      console.error('Sentence not found with ID:', sentenceId);
      throw error(404, 'Sentence not found');
    }
    
    console.log('Successfully loaded sentence:', sentenceId);
    
    // Verify the sentence object structure
    if (!sentence.sentence) {
      console.error('Loaded sentence has invalid structure:', sentence);
      throw error(500, 'Sentence data is invalid');
    }
    
    return {
      sentence
    };
  } catch (err) {
    console.error('Error loading sentence:', err);
    throw error(500, 
      err instanceof Error ? err.message : 'Failed to load sentence'
    );
  }
};

export const actions: Actions = {
  default: async ({ request, params }) => {
    const sentenceId = parseInt(params.id);
    
    if (isNaN(sentenceId)) {
      return fail(400, { error: 'Invalid sentence ID' });
    }
    
    const formData = await request.formData();
    
    const sentenceText = formData.get('sentence')?.toString() || '';
    const translation = formData.get('translation')?.toString() || undefined;
    const difficultyLevelRaw = formData.get('difficultyLevel')?.toString() || '1';
    
    // Ensure difficultyLevel is properly parsed as a number between 1-5
    let difficultyLevel: number;
    try {
      difficultyLevel = parseInt(difficultyLevelRaw);
      // Validate range
      if (isNaN(difficultyLevel) || difficultyLevel < 1 || difficultyLevel > 5) {
        difficultyLevel = 1; // Default to 1 if invalid
        console.warn('Invalid difficulty level received:', difficultyLevelRaw, 'defaulting to 1');
      }
    } catch (e) {
      difficultyLevel = 1; // Default to 1 if parsing fails
      console.error('Error parsing difficulty level:', e);
    }
    
    const tags = formData.get('tags')?.toString() || undefined;
    
    console.log('Form data received:', {
      sentenceId,
      sentenceText,
      translation,
      difficultyLevelRaw,
      difficultyLevel,
      tags
    });
    
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
    
    try {
      // Update the sentence in the database
      const updatedSentence = await updateSentence(sentenceId, {
        sentence: sentenceText,
        translation,
        difficultyLevel,
        tags
      });
      
      console.log('Sentence updated successfully with difficulty level:', difficultyLevel);
      
      if (!updatedSentence) {
        console.error('Update operation returned no sentence');
        return fail(404, { error: 'Sentence not found or could not be updated' });
      }
      
      // Log the updated sentence for debugging
      console.log('Updated sentence details:', {
        id: updatedSentence.sentenceId,
        text: updatedSentence.sentence,
        difficultyLevel: updatedSentence.difficultyLevel
      });
      
    } catch (error) {
      console.error('Error updating sentence:', error);
      
      return fail(500, { 
        error: 'Failed to update sentence',
        details: error instanceof Error ? error.message : String(error)
      });
    }
    
    console.log(`Redirecting to ${base}/sentences/${sentenceId}`);
    // Redirect to the sentence view page
    throw redirect(303, `${base}/sentences/${sentenceId}`);
  }
}; 