import type { FuriganaItem } from '$lib/db/types';
import { base } from '$app/paths';

interface GenerateFuriganaRequest {
  text: string;
  useMockLLM?: boolean;
}

interface GenerateFuriganaResponse {
  furigana: FuriganaItem[];
}

interface UpdateFuriganaRequest {
  text: string;
  reading: string;
  correctedReading: string;
}

interface UpdateFuriganaResponse {
  success: boolean;
}

/**
 * Generate furigana via API
 */
export async function generateFuriganaViaApi(
  text: string,
  useMockLLM = false
): Promise<FuriganaItem[]> {
  try {
    const response = await fetch(`${base}/api/furigana/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        useMockLLM,
      } as GenerateFuriganaRequest),
    });

    if (!response.ok) {
      throw new Error('Failed to generate furigana');
    }

    const data = await response.json() as GenerateFuriganaResponse;
    return data.furigana;
  } catch (error) {
    console.error('Error generating furigana:', error);
    return [];
  }
}

/**
 * Updates furigana reading via API
 * @param text The text that needs furigana (the kanji word)
 * @param originalReading Original reading
 * @param correctedReading New reading
 * @returns Promise<boolean> True if successful
 */
export async function updateFuriganaViaApi(
  text: string,
  originalReading: string,
  correctedReading: string
): Promise<boolean> {
  try {
    // Log update attempt for debugging
    console.log('Attempting to update furigana:', {
      text,
      originalReading,
      correctedReading
    });
    
    // Call the correct API endpoint
    const response = await fetch(`${base}/api/furigana/update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text,
        reading: originalReading,
        correctedReading
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('API error updating furigana:', errorData);
      throw new Error(errorData.error || `API error: ${response.status}`);
    }
    
    const result = await response.json();
    return result.success === true;
  } catch (error) {
    console.error('Failed to update furigana:', error);
    throw error;
  }
}

/**
 * Apply furigana to a sentence via API
 */
export async function applyFuriganaToSentenceViaApi(
  sentenceId: number,
  text: string
): Promise<boolean> {
  try {
    const response = await fetch(`${base}/api/sentences/${sentenceId}/furigana`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to apply furigana to sentence');
    }

    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('Error applying furigana to sentence:', error);
    return false;
  }
}

/**
 * Updates the furigana data for a specific sentence
 * @param sentenceId The ID of the sentence to update
 * @param furiganaData The updated furigana data
 * @returns A promise that resolves to true if the operation was successful, false otherwise
 */
export async function updateSentenceFurigana(sentenceId: number, furiganaData: any): Promise<boolean> {
  try {
    console.log(`Updating furigana for sentence ID: ${sentenceId}`);
    
    const response = await fetch(`${base}/api/sentences/${sentenceId}/furigana`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ furiganaData })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to update sentence furigana: ${errorText}`);
      return false;
    }

    const result = await response.json();
    return result.success === true;
  } catch (error) {
    console.error('Error updating sentence furigana:', error);
    return false;
  }
}

/**
 * Creates a new sentence via the API endpoint
 */
export async function createSentenceViaApi(data: {
  sentence: string;
  translation?: string;
  difficultyLevel?: number;
  tags?: string;
}): Promise<any> {
  try {
    // Call the API endpoint
    const response = await fetch(`${base}/api/sentences`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...data,
        source: 'api-client'
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('API error creating sentence:', errorData);
      throw new Error(errorData.error || `API error: ${response.status}`);
    }
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Failed to create sentence via API:', error);
    throw error;
  }
} 