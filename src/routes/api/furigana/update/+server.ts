import { json } from '@sveltejs/kit';
import { applyFuriganaCorrection } from '$lib/services/furigana-generator';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { text, reading, correctedReading } = await request.json();
    
    // Log the incoming request parameters for debugging
    console.log('Furigana update request:', { 
      text, 
      reading: reading || '', 
      correctedReading 
    });
    
    if (!text || !correctedReading) {
      console.error('Missing required parameters for furigana update');
      return json({ 
        error: 'Text and correctedReading are required',
        success: false
      }, { status: 400 });
    }
    
    // Apply correction
    const result = await applyFuriganaCorrection(text, reading || '', correctedReading);
    
    console.log('Furigana correction applied successfully:', {
      word: text,
      originalReading: reading || '',
      newReading: correctedReading,
      confidence: result.confidence,
      source: result.source
    });
    
    return json({ success: true });
  } catch (error) {
    console.error('Error updating furigana:', error);
    return json({ 
      error: 'Failed to update furigana',
      details: error instanceof Error ? error.message : String(error),
      success: false
    }, { status: 500 });
  }
}; 