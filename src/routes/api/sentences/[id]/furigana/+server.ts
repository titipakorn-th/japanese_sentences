import { json } from '@sveltejs/kit';
import { generateFurigana } from '$lib/services/furigana-generator';
import { getSentenceById, updateSentence } from '$lib/db/queries/sentences';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { sql } from '$lib/db/client';

export const POST: RequestHandler = async ({ params, request }) => {
  try {
    const sentenceId = parseInt(params.id);
    
    if (isNaN(sentenceId)) {
      return json({ success: false, error: 'Invalid sentence ID' }, { status: 400 });
    }
    
    const body = await request.json();
    
    if (!body.furiganaData) {
      return json({ success: false, error: 'No furigana data provided' }, { status: 400 });
    }
    
    const furiganaData = body.furiganaData;
    let furiganaDataString: string;
    
    // Convert to string if it's an object/array
    if (typeof furiganaData === 'object') {
      furiganaDataString = JSON.stringify(furiganaData);
    } else if (typeof furiganaData === 'string') {
      furiganaDataString = furiganaData;
    } else {
      return json({ success: false, error: 'Invalid furigana data format' }, { status: 400 });
    }
    
    // Check if the sentence exists
    const sentenceExists = await sql`
      SELECT 1 FROM sentences WHERE sentence_id = ${sentenceId}
    `;
    
    if (sentenceExists.length === 0) {
      return json({ success: false, error: 'Sentence not found' }, { status: 404 });
    }
    
    // Update the sentence with the new furigana data - remove updated_at which doesn't exist
    await sql`
      UPDATE sentences
      SET furigana_data = ${furiganaDataString}
      WHERE sentence_id = ${sentenceId}
    `;
    
    return json({ success: true });
  } catch (error) {
    console.error('Error updating sentence furigana:', error);
    return json({ 
      success: false, 
      error: 'Failed to update furigana data', 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}; 