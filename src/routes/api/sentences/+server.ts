import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createSentence } from '$lib/db/queries/sentences';

export const POST: RequestHandler = async ({ request }) => {
  try {
    // Parse JSON request body
    const data = await request.json();
    
    // Extract required fields
    const { sentence, translation, difficultyLevel, tags, source } = data;
    
    // Validate input
    if (!sentence || typeof sentence !== 'string' || !sentence.trim()) {
      return json({ 
        success: false, 
        error: 'Sentence text is required'
      }, { status: 400 });
    }
    
    // Create the sentence in the database
    const newSentence = await createSentence({
      sentence,
      translation,
      difficultyLevel: difficultyLevel || 1,
      tags,
      source: source || 'api'
    });
    
    // Return success response
    return json({
      success: true,
      sentenceId: newSentence.sentenceId,
      sentence: newSentence
    });
  } catch (error) {
    console.error('API Error creating sentence:', error);
    
    // Return error response
    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error creating sentence'
    }, { status: 500 });
  }
}; 