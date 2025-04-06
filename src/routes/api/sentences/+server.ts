import { json } from '@sveltejs/kit';
import { createSentence } from '$lib/db/queries/sentences';
import type { RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const formData = await request.formData();
    
    const sentenceText = formData.get('sentence')?.toString() || '';
    const translation = formData.get('translation')?.toString() || undefined;
    const difficultyLevel = parseInt(formData.get('difficultyLevel')?.toString() || '1');
    const tags = formData.get('tags')?.toString() || undefined;
    
    // Validate input
    if (!sentenceText.trim()) {
      console.error('Validation error: Sentence text is empty');
      return json({ error: 'Sentence text is required' }, { status: 400 });
    }
    
    console.log('Creating sentence:', { sentenceText, translation, difficultyLevel, tags });
    
    // Create the sentence in the database
    const newSentence = await createSentence({
      sentence: sentenceText,
      translation,
      difficultyLevel,
      tags,
      source: 'user',
    });
    
    console.log('Sentence created successfully:', newSentence);
    
    // Ensure we have a sentence ID for the redirect
    if (!newSentence || !newSentence.sentenceId) {
      console.error('Error: Created sentence is missing ID', newSentence);
      return json({ 
        error: 'Failed to create sentence properly' 
      }, { status: 500 });
    }
    
    return json(newSentence, { status: 201 });
  } catch (error) {
    console.error('Error creating sentence:', error);
    return json({ 
      error: 'Failed to create sentence',
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}; 