import type { FuriganaItem } from '$lib/db/types';

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
    const response = await fetch('/api/furigana/generate', {
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
 * Update furigana reading via API
 */
export async function updateFuriganaViaApi(
  text: string,
  reading: string,
  correctedReading: string
): Promise<boolean> {
  try {
    const response = await fetch('/api/furigana/update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        reading,
        correctedReading,
      } as UpdateFuriganaRequest),
    });

    if (!response.ok) {
      throw new Error('Failed to update furigana');
    }

    const data = await response.json() as UpdateFuriganaResponse;
    return data.success;
  } catch (error) {
    console.error('Error updating furigana:', error);
    return false;
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
    const response = await fetch(`/api/sentences/${sentenceId}/furigana`, {
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
    
    const response = await fetch(`/api/sentences/${sentenceId}/furigana`, {
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