import { json } from '@sveltejs/kit';
import { applyFuriganaCorrection } from '$lib/services/furigana-generator';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { text, reading, correctedReading } = await request.json();
    
    if (!text || !correctedReading) {
      return json({ 
        error: 'Text and correctedReading are required' 
      }, { status: 400 });
    }
    
    // Apply correction
    await applyFuriganaCorrection(text, reading || '', correctedReading);
    
    return json({ success: true });
  } catch (error) {
    console.error('Error updating furigana:', error);
    return json({ 
      error: 'Failed to update furigana' 
    }, { status: 500 });
  }
}; 