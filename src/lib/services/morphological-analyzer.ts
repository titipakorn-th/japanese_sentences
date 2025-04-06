import { browser } from '$app/environment';
import { storeFuriganaInCache } from '$lib/db/queries/furigana';

// Import the actual kuromoji only if we're on the server
let kuromoji: any;
if (!browser) {
  // This import will only run on the server
  import('kuromoji').then(module => {
    kuromoji = module.default;
  });
}

// Define type for tokenizer
type Tokenizer = {
  tokenize: (text: string) => Token[];
};

// Define type for token
export type Token = {
  word_id: number;
  word_type: string;
  word_position: number;
  surface_form: string;
  pos: string;
  pos_detail_1: string;
  pos_detail_2: string;
  pos_detail_3: string;
  conjugated_type: string;
  conjugated_form: string;
  basic_form: string;
  reading: string;
  pronunciation: string;
};

// Singleton instance
let tokenizerInstance: Tokenizer | null = null;

// Mock tokenizer with predefined responses
const mockTokenizer: Tokenizer = {
  tokenize: (text: string): Token[] => {
    // Predefined responses for common Japanese words
    if (text.includes('日本語')) {
      return [{
        word_id: 1,
        word_type: 'KNOWN',
        word_position: text.indexOf('日本語'),
        surface_form: '日本語',
        pos: '名詞',
        pos_detail_1: '一般',
        pos_detail_2: '',
        pos_detail_3: '',
        conjugated_type: '',
        conjugated_form: '',
        basic_form: '日本語',
        reading: 'ニホンゴ',
        pronunciation: 'ニホンゴ'
      }];
    }
    
    if (text.includes('勉強')) {
      return [{
        word_id: 2,
        word_type: 'KNOWN',
        word_position: text.indexOf('勉強'),
        surface_form: '勉強',
        pos: '名詞',
        pos_detail_1: '一般',
        pos_detail_2: '',
        pos_detail_3: '',
        conjugated_type: '',
        conjugated_form: '',
        basic_form: '勉強',
        reading: 'ベンキョウ',
        pronunciation: 'ベンキョウ'
      }];
    }
    
    if (text.includes('東京')) {
      return [{
        word_id: 3,
        word_type: 'KNOWN',
        word_position: text.indexOf('東京'),
        surface_form: '東京',
        pos: '名詞',
        pos_detail_1: '固有名詞',
        pos_detail_2: '地域',
        pos_detail_3: '',
        conjugated_type: '',
        conjugated_form: '',
        basic_form: '東京',
        reading: 'トウキョウ',
        pronunciation: 'トウキョウ'
      }];
    }
    
    if (text.includes('行き')) {
      return [{
        word_id: 4,
        word_type: 'KNOWN',
        word_position: text.indexOf('行き'),
        surface_form: '行き',
        pos: '動詞',
        pos_detail_1: '自立',
        pos_detail_2: '',
        pos_detail_3: '',
        conjugated_type: '五段・カ行促音便',
        conjugated_form: '連用形',
        basic_form: '行く',
        reading: 'イキ',
        pronunciation: 'イキ'
      }];
    }
    
    // Simple segmentation for other text
    const tokens: Token[] = [];
    let position = 0;
    
    // Very simple mock segmentation - just for testing purposes
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (/[\u4e00-\u9faf]/.test(char)) { // If it's a kanji
        tokens.push({
          word_id: 1000 + i,
          word_type: 'UNKNOWN',
          word_position: position,
          surface_form: char,
          pos: '名詞',
          pos_detail_1: '一般',
          pos_detail_2: '',
          pos_detail_3: '',
          conjugated_type: '',
          conjugated_form: '',
          basic_form: char,
          reading: '', // No reading for unknown kanji
          pronunciation: ''
        });
      }
      position++;
    }
    
    return tokens;
  }
};

/**
 * Initialize the tokenizer
 */
export function initializeTokenizer(): Promise<Tokenizer> {
  return new Promise((resolve, reject) => {
    // If we're in the browser, return the mock tokenizer
    if (browser) {
      tokenizerInstance = mockTokenizer;
      resolve(mockTokenizer);
      return;
    }
    
    // If we already have an instance, return it
    if (tokenizerInstance) {
      resolve(tokenizerInstance);
      return;
    }

    // Server-side initialization
    if (kuromoji) {
      kuromoji.builder({ dicPath: 'node_modules/kuromoji/dict' }).build((err: Error, tokenizer: Tokenizer) => {
        if (err) {
          console.error('Error initializing tokenizer:', err);
          reject(err);
          return;
        }

        tokenizerInstance = tokenizer;
        resolve(tokenizer);
      });
    } else {
      // Fallback to mock if kuromoji is not available for some reason
      tokenizerInstance = mockTokenizer;
      resolve(mockTokenizer);
    }
  });
}

/**
 * Get tokenizer instance (initialize if needed)
 */
export async function getTokenizer(): Promise<Tokenizer> {
  if (!tokenizerInstance) {
    return initializeTokenizer();
  }
  return tokenizerInstance;
}

/**
 * Analyze Japanese text and get morphemes
 */
export async function analyzeText(text: string): Promise<Token[]> {
  try {
    const tokenizer = await getTokenizer();
    return tokenizer.tokenize(text);
  } catch (error) {
    console.error('Error analyzing text:', error);
    return [];
  }
}

/**
 * Extract readings from analyzed tokens
 */
export function extractReadings(tokens: Token[]): { word: string; reading: string }[] {
  return tokens
    .filter(token => 
      // Filter out tokens that don't have readings or are not meaningful
      token.reading && 
      token.surface_form && 
      token.pos !== '記号' && // Symbols
      token.pos !== '助詞' && // Particles
      token.pos !== '助動詞' // Auxiliary verbs
    )
    .map(token => ({
      word: token.surface_form,
      reading: kataToHira(token.reading)
    }));
}

/**
 * Convert katakana to hiragana
 */
export function kataToHira(str: string): string {
  return str.replace(/[\u30A1-\u30F6]/g, match => {
    const chr = match.charCodeAt(0) - 0x60;
    return String.fromCharCode(chr);
  });
}

/**
 * Segment text using morphological analysis
 */
export async function segmentText(text: string): Promise<string[]> {
  const tokens = await analyzeText(text);
  return tokens.map(token => token.surface_form);
}

/**
 * Get furigana from morphological analysis
 */
export async function getFuriganaFromMorphology(
  text: string
): Promise<{ word: string; reading: string; confidence: number }[]> {
  const tokens = await analyzeText(text);
  const readings = extractReadings(tokens);
  
  // Store readings in cache with medium confidence
  const results = [];
  for (const { word, reading } of readings) {
    if (word !== reading && reading) { // Only process words that have different readings (i.e., contain kanji)
      await storeFuriganaInCache(word, reading, 70, 'morphology');
      results.push({ word, reading, confidence: 70 });
    }
  }
  
  return results;
} 