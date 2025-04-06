import { json } from '@sveltejs/kit';
import { generateFurigana } from '$lib/services/furigana-generator';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { text, useMockLLM = false, apiKey: clientApiKey } = await request.json();
    
    if (!text) {
      return json({ error: 'Text is required' }, { status: 400 });
    }
    
    // Use client-provided API key if available, otherwise fall back to environment variable
    const apiKey = clientApiKey || env.OPENAI_API_KEY;
    
    if (!apiKey) {
      return json({ 
        error: 'No API key provided. Please set one in the settings page or in the server environment.' 
      }, { status: 400 });
    }
    
    // Generate furigana
    const furigana = await generateFurigana(text, apiKey, useMockLLM);
    
    return json({ furigana });
  } catch (error) {
    console.error('Error generating furigana:', error);
    return json({ error: 'Failed to generate furigana' }, { status: 500 });
  }
}; 