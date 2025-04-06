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

interface SentenceFuriganaResponse {
  success: boolean;
  sentenceId: number;
  furigana: FuriganaItem[];
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
 * Generate furigana for a sentence via API
 */
export async function generateSentenceFuriganaViaApi(
  sentenceId: number,
  useMockLLM = false
): Promise<SentenceFuriganaResponse | null> {
  try {
    const response = await fetch(`/api/sentences/${sentenceId}/furigana`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        useMockLLM,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate sentence furigana');
    }

    return await response.json() as SentenceFuriganaResponse;
  } catch (error) {
    console.error('Error generating sentence furigana:', error);
    return null;
  }
} 