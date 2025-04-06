import { describe, it, expect } from 'vitest';
import type { FuriganaItem } from '../../src/lib/db/types';

// Extract the renderFurigana function's logic for testing
function renderFurigana(text: string, data: FuriganaItem[]): string {
  if (!data || data.length === 0) {
    return text;
  }
  
  // Handle overlapping annotations:
  // 1. Filter out items with no reading
  // 2. Sort by start position (ascending), then by length (descending) to prioritize longer matches
  // 3. Keep track of processed segments to avoid overlaps
  
  const validData = data.filter(item => !!item.reading);
  
  // Sort by start (ascending) and then by length (descending)
  const sortedData = [...validData].sort((a, b) => {
    if (a.start !== b.start) {
      return a.start - b.start; // ascending start position
    }
    return (b.end - b.start) - (a.end - a.start); // descending length
  });
  
  // Keep track of which character positions have been processed
  const processedRanges: {start: number, end: number}[] = [];
  
  // Create a list of non-overlapping annotations
  const nonOverlappingItems: FuriganaItem[] = [];
  
  for (const item of sortedData) {
    // Check if this item overlaps with any already processed range
    const hasOverlap = processedRanges.some(range => 
      (item.start < range.end && item.end > range.start)
    );
    
    if (!hasOverlap) {
      nonOverlappingItems.push(item);
      processedRanges.push({start: item.start, end: item.end});
    }
  }
  
  // Sort by end position (descending) to process from end to start
  // This prevents position shifts as we insert HTML
  nonOverlappingItems.sort((a, b) => b.end - a.end);
  
  // Apply furigana for non-overlapping items
  let result = text;
  for (const item of nonOverlappingItems) {
    const before = result.slice(0, item.start);
    const target = result.slice(item.start, item.end);
    const after = result.slice(item.end);
    
    result = `${before}<ruby>${target}<rt>${item.reading}</rt></ruby>${after}`;
  }
  
  return result;
}

describe('Furigana Rendering Utility', () => {
  it('should return plain text when no furigana data is provided', () => {
    const text = 'こんにちは';
    const result = renderFurigana(text, []);
    
    expect(result).toBe('こんにちは');
  });
  
  it('should wrap text with ruby tags when furigana data is provided', () => {
    const text = '今日はいい天気です';
    const furiganaData: FuriganaItem[] = [
      { text: '今日', reading: 'きょう', start: 0, end: 2 }
    ];
    
    const result = renderFurigana(text, furiganaData);
    
    // Check if the first part of the text has been wrapped with ruby tags
    expect(result).toContain('<ruby>今日<rt>きょう</rt></ruby>');
    // Check if the rest of the text is unchanged
    expect(result).toContain('はいい天気です');
  });
  
  it('should handle multiple furigana items correctly', () => {
    const text = '今日はいい天気です';
    const furiganaData: FuriganaItem[] = [
      { text: '今日', reading: 'きょう', start: 0, end: 2 },
      { text: '天気', reading: 'てんき', start: 5, end: 7 }
    ];
    
    const result = renderFurigana(text, furiganaData);
    
    // Check if both parts of the text have been wrapped with ruby tags
    expect(result).toContain('<ruby>今日<rt>きょう</rt></ruby>');
    expect(result).toContain('<ruby>天気<rt>てんき</rt></ruby>');
  });
  
  it('should handle overlapping furigana items correctly', () => {
    // This test verifies that when two items overlap, we prioritize the longer one
    const text = '日本語を勉強しています';
    const furiganaData: FuriganaItem[] = [
      { text: '日本', reading: 'にほん', start: 0, end: 2 },
      { text: '日本語', reading: 'にほんご', start: 0, end: 3 }
    ];
    
    // We should sort data so longer items are processed first when they share the same start
    const result = renderFurigana(text, furiganaData);
    
    // Should prioritize the longer match (日本語), not the shorter one (日本)
    expect(result).toContain('<ruby>日本語<rt>にほんご</rt></ruby>');
    expect(result).not.toContain('<ruby>日本<rt>にほん</rt></ruby>');
    
    // The rest of the text should be preserved
    expect(result).toContain('を勉強しています');
  });
  
  it('should skip items with undefined or empty readings', () => {
    const text = '今日はいい天気です';
    const furiganaData: FuriganaItem[] = [
      { text: '今日', reading: 'きょう', start: 0, end: 2 },
      { text: '天気', reading: undefined, start: 5, end: 7 }
    ];
    
    const result = renderFurigana(text, furiganaData);
    
    // The first item should be wrapped with ruby tags
    expect(result).toContain('<ruby>今日<rt>きょう</rt></ruby>');
    // The second item should be left as is
    expect(result).not.toContain('<ruby>天気<rt>');
  });
}); 