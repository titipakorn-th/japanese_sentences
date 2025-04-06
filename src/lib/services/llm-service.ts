import { storeFuriganaInCache } from '$lib/db/queries/furigana';

// Define types for OpenAI API response
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

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

// Define FuriganaResult type
export interface FuriganaResult {
  text: string;
  furigana: string;
}

/**
 * Mock response for testing
 */
const MOCK_RESPONSES: Record<string, FuriganaResult[]> = {
  '日本語': [{ text: '日本語', furigana: 'にほんご' }],
  '漢字': [{ text: '漢字', furigana: 'かんじ' }],
  '勉強': [{ text: '勉強', furigana: 'べんきょう' }],
  '新しい': [{ text: '新しい', furigana: 'あたら' }],
  '日本語を勉強しています': [
    { text: '日本語', furigana: 'にほんご' },
    { text: 'を', furigana: '' },
    { text: '勉強', furigana: 'べんきょう' },
    { text: 'して', furigana: '' },
    { text: 'います', furigana: '' }
  ],
  '難しい言葉': [
    { text: '難しい', furigana: 'むずか' },
    { text: '言葉', furigana: 'ことば' }
  ],
  '東京に行きました': [
    { text: '東京', furigana: 'とうきょう' },
    { text: 'に', furigana: '' },
    { text: '行き', furigana: 'い' },
    { text: 'ました', furigana: '' }
  ],
  '引っ越せる': [
    { text: '引', furigana: 'ひ' },
    { text: 'っ', furigana: '' },
    { text: '越せる', furigana: 'こ' }
  ],
  '引っ越す': [
    { text: '引', furigana: 'ひ' },
    { text: 'っ', furigana: '' },
    { text: '越す', furigana: 'こ' }
  ],
  '今月14日に自分の部屋に引っ越せるんだ': [
    { text: '今月', furigana: 'こんげつ' },
    { text: '14', furigana: '' },
    { text: '日', furigana: 'にち' },
    { text: 'に', furigana: '' },
    { text: '自分', furigana: 'じぶん' },
    { text: 'の', furigana: '' },
    { text: '部屋', furigana: 'へや' },
    { text: 'に', furigana: '' },
    { text: '引', furigana: 'ひ' },
    { text: 'っ', furigana: '' },
    { text: '越せる', furigana: 'こ' },
    { text: 'んだ', furigana: '' }
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
    console.error('API key not provided for LLM service');
    return [];
  }
  
  try {
    const systemPrompt = `
      Generate the hiragana reading (furigana) for Japanese text. Follow these rules carefully:
      1. Only provide readings for kanji characters or kanji compounds.
      2. Do NOT include readings for hiragana or katakana that are already in the text.
      3. For words that mix kanji and hiragana (like "新しい"), only provide the reading for the kanji part.
      4. Group consecutive kanji together and provide a single reading for the group.
      5. Format your response as a JSON array where each element contains:
         - "text" field (the original text segment with kanji)
         - "furigana" field (the reading in hiragana)
      6. For non-kanji segments, either omit them or set an empty furigana value.
      
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
    ]
    
    For words mixing kanji and hiragana like "新しい", only provide reading for the kanji:
    {"text": "新しい", "furigana": "あたら"}  // Only reading for 新, not for しい
    
    For compound kanji like "今月":
    {"text": "今月", "furigana": "こんげつ"}  // Single reading for the entire compound
    `;

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
        temperature: 0.1, // Lower temperature for more deterministic responses
        max_tokens: 1000
      } as OpenAIRequest)
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('LLM API error:', error);
      return [];
    }

    const data = await response.json() as OpenAIResponse;
    const content = data.choices[0]?.message?.content || '';
    
    // Extract JSON array from response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error('Could not parse LLM response:', content);
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
    console.error('Error generating furigana with LLM:', error);
    return [];
  }
}

/**
 * Generate furigana using LLM (Anthropic Claude)
 */
export async function generateFuriganaWithClaude(
  text: string, 
  apiKey: string,
  model = 'claude-3-haiku-20240307'
): Promise<FuriganaResult[]> {
  // If API key is not provided, return empty result
  if (!apiKey) {
    console.error('API key not provided for Claude service');
    return [];
  }
  
  try {
    const systemPrompt = `
      Generate the hiragana reading (furigana) for Japanese text. Follow these rules carefully:
      1. Only provide readings for kanji characters or kanji compounds.
      2. Do NOT include readings for hiragana or katakana that are already in the text.
      3. For words that mix kanji and hiragana (like "新しい"), only provide the reading for the kanji part.
      4. Group consecutive kanji together and provide a single reading for the group.
      5. Format your response as a JSON array where each element contains:
         - "text" field (the original text segment with kanji)
         - "furigana" field (the reading in hiragana)
      6. For non-kanji segments, either omit them or set an empty furigana value.
      
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
    ]
    
    For words mixing kanji and hiragana like "新しい", only provide reading for the kanji:
    {"text": "新しい", "furigana": "あたら"}  // Only reading for 新, not for しい
    
    For compound kanji like "今月":
    {"text": "今月", "furigana": "こんげつ"}  // Single reading for the entire compound
    `;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Claude API error:', error);
      return [];
    }

    const data = await response.json();
    const content = data.content?.[0]?.text || '';
    
    // Extract JSON array from response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error('Could not parse Claude response:', content);
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
    console.error('Error generating furigana with Claude:', error);
    return [];
  }
} 