import { storeFuriganaInCache } from '$lib/db/queries/furigana';

export interface FuriganaResult {
  text: string;
  furigana: string;
}

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAIRequest {
  model: string;
  messages: OpenAIMessage[];
  temperature: number;
  max_tokens?: number;
}

/**
 * Mock response for testing
 */
const MOCK_RESPONSES: Record<string, FuriganaResult[]> = {
  '日本語': [{ text: '日本語', furigana: 'にほんご' }],
  '漢字': [{ text: '漢字', furigana: 'かんじ' }],
  '勉強': [{ text: '勉強', furigana: 'べんきょう' }],
  '日本語を勉強しています': [
    { text: '日本語', furigana: 'にほんご' },
    { text: 'を', furigana: '' },
    { text: '勉強', furigana: 'べんきょう' },
    { text: 'して', furigana: '' },
    { text: 'います', furigana: '' }
  ],
  '難しい言葉': [
    { text: '難しい', furigana: 'むずかしい' },
    { text: '言葉', furigana: 'ことば' }
  ],
  '東京に行きました': [
    { text: '東京', furigana: 'とうきょう' },
    { text: 'に', furigana: '' },
    { text: '行き', furigana: 'いき' },
    { text: 'ました', furigana: '' }
  ]
};

/**
 * Generate furigana using LLM (OpenAI)
 * @param mockMode If true, returns predefined mock responses instead of calling the API
 */
export async function generateFuriganaWithLLM(
  text: string, 
  apiKey: string,
  model = 'gpt-3.5-turbo',
  mockMode = false
): Promise<FuriganaResult[]> {
  // If in mock mode, return mock response if available
  if (mockMode) {
    try {
      // Try exact match first
      if (MOCK_RESPONSES[text]) {
        console.log('Using mock response for:', text);
        const results = MOCK_RESPONSES[text];
        
        // Store results in cache with high confidence
        for (const result of results) {
          if (result.text && result.furigana && result.text !== result.furigana) {
            await storeFuriganaInCache(result.text, result.furigana, 85, 'llm');
          }
        }
        
        return results;
      }
      
      // Try to find the closest mock response
      for (const key of Object.keys(MOCK_RESPONSES)) {
        if (text.includes(key)) {
          console.log('Using partial mock response for:', key);
          const results = MOCK_RESPONSES[key];
          
          // Store results in cache with high confidence
          for (const result of results) {
            if (result.text && result.furigana && result.text !== result.furigana) {
              await storeFuriganaInCache(result.text, result.furigana, 85, 'llm');
            }
          }
          
          return results;
        }
      }
      
      // If no match found, return empty array to simulate error
      console.warn('No mock response found for:', text);
      return [];
    } catch (error) {
      console.error('Error in mock mode:', error);
      return [];
    }
  }
  
  // If API key is not provided, return empty result
  if (!apiKey) {
    console.error('API key not provided for OpenAI service');
    return [];
  }
  
  try {
    const systemPrompt = `
      Generate the hiragana reading (furigana) for each kanji character in the Japanese text. 
      Format your response as a JSON array where each element contains a "text" field (the original text) 
      and a "furigana" field (the reading in hiragana). Only include furigana for kanji characters.
      Analyze the grammatical context and choose appropriate readings for words with multiple possible readings.
      Response must be valid JSON.
    `;

    const userPrompt = `Text: "${text}"
    
    Example format:
    [
      {"text": "日本語", "furigana": "にほんご"},
      {"text": "を", "furigana": ""},
      {"text": "勉強", "furigana": "べんきょう"},
      {"text": "して", "furigana": ""},
      {"text": "います", "furigana": ""}
    ]`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
        max_tokens: 1000
      } as OpenAIRequest)
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
      return [];
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // Extract JSON array from response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error('Could not parse OpenAI response:', content);
      return [];
    }
    
    // Parse the JSON response
    const furiganaResults = JSON.parse(jsonMatch[0]) as FuriganaResult[];
    
    // Store results in cache with high confidence
    for (const result of furiganaResults) {
      if (result.text && result.furigana && result.text !== result.furigana) {
        await storeFuriganaInCache(result.text, result.furigana, 85, 'llm');
      }
    }
    
    return furiganaResults;
  } catch (error) {
    console.error('Error generating furigana with OpenAI:', error);
    return [];
  }
} 