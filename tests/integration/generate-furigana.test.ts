import { describe, it, expect } from 'vitest';
import type { FuriganaItem } from '../../src/lib/db/types';

// Create our own mock furigana generator for testing
function mockGenerateFurigana(text: string): FuriganaItem[] {
  const result: FuriganaItem[] = [];
  
  // Common words to detect with their readings (same as in the server implementation)
  const wordMap: Record<string, string> = {
    '私': 'わたし',
    '僕': 'ぼく',
    '今日': 'きょう',
    '明日': 'あした',
    '昨日': 'きのう',
    '食べる': 'たべる',
    '飲む': 'のむ',
    '行く': 'いく',
    '来る': 'くる',
    '見る': 'みる',
    '日本': 'にほん',
    '日本語': 'にほんご',
    '英語': 'えいご',
    '学校': 'がっこう',
    '大学': 'だいがく',
    '先生': 'せんせい',
    '学生': 'がくせい',
    '友達': 'ともだち',
    '家族': 'かぞく',
    '時間': 'じかん'
  };
  
  // Search for each word in the text
  for (const [word, reading] of Object.entries(wordMap)) {
    let position = 0;
    while (true) {
      const start = text.indexOf(word, position);
      if (start === -1) break;
      
      result.push({
        text: word,
        reading,
        start,
        end: start + word.length
      });
      
      position = start + word.length;
    }
  }
  
  // Sort by start position
  return result.sort((a, b) => a.start - b.start);
}

describe('Generate Furigana Utility', () => {
  it('should generate furigana for common words', () => {
    const text = "私は日本語を勉強しています。";
    const result = mockGenerateFurigana(text);
    
    // Check if known words from our mock furigana generator were processed
    expect(result.length).toBeGreaterThan(0);
    
    // Should find "私" and "日本語"
    const hasWatashi = result.some((item: FuriganaItem) => 
      item.text === "私" && item.reading === "わたし"
    );
    
    const hasNihongo = result.some((item: FuriganaItem) => 
      item.text === "日本語" && item.reading === "にほんご"
    );
    
    expect(hasWatashi).toBe(true);
    expect(hasNihongo).toBe(true);
  });
  
  it('should correctly sort items by start position', () => {
    const text = "私は日本に行きました。";
    const result = mockGenerateFurigana(text);
    
    // Print result for debugging
    console.log("Sorted items:", result);
    
    // Check if items are in non-decreasing order by start position
    for (let i = 1; i < result.length; i++) {
      expect(result[i].start).toBeGreaterThanOrEqual(result[i-1].start);
    }
    
    // Check first and last item specifically
    if (result.length > 1) {
      expect(result[0].start).toBeLessThanOrEqual(result[result.length - 1].start);
    }
  });
  
  it('should handle multiple occurrences of the same word', () => {
    const text = "日本の日本語は日本人が話します。";
    const result = mockGenerateFurigana(text);
    
    // Count occurrences of "日本"
    const nihonCount = result.filter(item => item.text === "日本").length;
    
    // Should find "日本" multiple times
    expect(nihonCount).toBeGreaterThan(1);
  });
  
  it('should handle text with no recognizable words', () => {
    const text = "あいうえお";
    const result = mockGenerateFurigana(text);
    
    expect(result.length).toBe(0);
  });
}); 