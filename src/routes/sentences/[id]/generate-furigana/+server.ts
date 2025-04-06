import { json, error } from '@sveltejs/kit';
import { getSentenceById, updateSentence } from '$lib/db/queries/sentences';
import type { RequestHandler } from '@sveltejs/kit';
import type { FuriganaItem } from '$lib/db/types';
import { generateFurigana } from '$lib/services/furigana-generator';
import { env } from '$env/dynamic/private';

export const POST: RequestHandler = async ({ params, request }) => {
  try {
    const sentenceId = parseInt(params.id || '');
    
    if (isNaN(sentenceId)) {
      console.error('Invalid sentence ID:', params.id);
      throw error(400, 'Invalid sentence ID');
    }
    
    console.log('Generating furigana for sentence ID:', sentenceId);
    
    // Get request body with potential API key
    const requestBody = await request.json().catch(() => ({}));
    const clientApiKey = requestBody.apiKey;
    
    // Get the sentence
    const sentence = await getSentenceById(sentenceId);
    
    if (!sentence) {
      console.error('Sentence not found with ID:', sentenceId);
      throw error(404, 'Sentence not found');
    }
    
    console.log('Found sentence:', sentence.sentence);
    
    // Use client-provided API key if available, otherwise fall back to environment variable
    const apiKey = clientApiKey || env.OPENAI_API_KEY;
    
    if (!apiKey) {
      console.error('No OpenAI API key provided in environment variables or request');
      throw error(500, 'API key not configured for LLM service');
    }
    
    // Generate furigana using the advanced service
    const furiganaItems = await generateFurigana(sentence.sentence, apiKey, false);
    
    // Save the furigana data to the database
    const furiganaData = JSON.stringify(furiganaItems);
    console.log('Saving furigana data to database:', furiganaData);
    
    const updatedSentence = await updateSentence(sentenceId, {
      furiganaData,
      llmProcessed: true
    });
    
    console.log('Successfully updated sentence with furigana data');
    
    return json({
      success: true,
      sentence: updatedSentence,
      furiganaItems
    });
  } catch (e) {
    console.error('Error generating furigana:', e);
    return json({
      success: false,
      error: e instanceof Error ? e.message : 'Unknown error'
    }, { status: 500 });
  }
}; 