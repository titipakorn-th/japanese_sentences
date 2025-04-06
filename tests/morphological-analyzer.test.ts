import { describe, it, expect } from 'vitest';
import { kataToHira } from '$lib/services/morphological-analyzer';

// Simplified test file
describe('Morphological Analyzer', () => {
  describe('kataToHira', () => {
    it('should convert katakana to hiragana', () => {
      expect(kataToHira('カタカナ')).toBe('かたかな');
      expect(kataToHira('ニホンゴ')).toBe('にほんご');
      expect(kataToHira('タベル')).toBe('たべる');
    });

    it('should leave hiragana and other characters unchanged', () => {
      expect(kataToHira('ひらがな')).toBe('ひらがな');
      expect(kataToHira('漢字とカタカナ')).toBe('漢字とかたかな');
      expect(kataToHira('ABCカタカナ123')).toBe('ABCかたかな123');
    });
  });
}); 