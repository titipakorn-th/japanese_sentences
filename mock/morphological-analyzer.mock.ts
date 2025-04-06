/**
 * Mock implementation of morphological analyzer for testing
 */

export interface Token {
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
}

// Mock tokenize function that returns predefined responses
export function tokenize(text: string): Token[] {
  // Japanese word "日本語"
  if (text === '日本語') {
    return [{
      word_id: 1,
      word_type: 'KNOWN',
      word_position: 0,
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
  
  // Verb "食べる" (to eat)
  if (text === '食べる') {
    return [{
      word_id: 2,
      word_type: 'KNOWN',
      word_position: 0,
      surface_form: '食べ',
      pos: '動詞',
      pos_detail_1: '自立',
      pos_detail_2: '',
      pos_detail_3: '',
      conjugated_type: '一段',
      conjugated_form: '連用形',
      basic_form: '食べる',
      reading: 'タベ',
      pronunciation: 'タベ'
    }, {
      word_id: 3,
      word_type: 'KNOWN',
      word_position: 2,
      surface_form: 'る',
      pos: '動詞',
      pos_detail_1: '接尾',
      pos_detail_2: '',
      pos_detail_3: '',
      conjugated_type: '一段',
      conjugated_form: '基本形',
      basic_form: 'る',
      reading: 'ル',
      pronunciation: 'ル'
    }];
  }
  
  // Default response for any other text
  return [];
}

// Convert katakana to hiragana
export function kataToHira(str: string): string {
  return str.replace(/[\u30A1-\u30F6]/g, match => {
    const chr = match.charCodeAt(0) - 0x60;
    return String.fromCharCode(chr);
  });
}

// Mock interface for tests
export const mockMorphologicalAnalyzer = {
  segmentText: async (text: string): Promise<string[]> => {
    return tokenize(text).map(token => token.surface_form);
  },
  
  analyzeText: async (text: string): Promise<Token[]> => {
    return tokenize(text);
  },
  
  getFuriganaFromMorphology: async (text: string): Promise<{ word: string; reading: string; confidence: number }[]> => {
    const tokens = tokenize(text);
    return tokens
      .filter(token => 
        token.reading && 
        token.surface_form && 
        token.pos !== '記号' && 
        token.pos !== '助詞' && 
        token.pos !== '助動詞'
      )
      .map(token => ({
        word: token.surface_form,
        reading: kataToHira(token.reading),
        confidence: 70
      }));
  },
  
  extractReadings: (tokens: Token[]): { word: string; reading: string }[] => {
    return tokens
      .filter(token => 
        token.reading && 
        token.surface_form && 
        token.pos !== '記号' && 
        token.pos !== '助詞' && 
        token.pos !== '助動詞'
      )
      .map(token => ({
        word: token.surface_form,
        reading: kataToHira(token.reading)
      }));
  }
};
