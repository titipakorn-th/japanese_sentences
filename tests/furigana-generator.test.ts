import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateFurigana, applyFuriganaCorrection } from '$lib/services/furigana-generator';
import * as furiganaQueries from '$lib/db/queries/furigana';
import * as morphologicalAnalyzer from '$lib/services/morphological-analyzer';
import * as llmService from '$lib/services/llm-service';

// Mock the dependencies
vi.mock('$lib/db/queries/furigana', () => ({
  getFuriganaFromCache: vi.fn(),
  getFuriganaFromVocabulary: vi.fn(),
  storeFuriganaInCache: vi.fn().mockImplementation(async (word, reading, confidence, source) => ({
    cacheId: 1,
    word,
    reading,
    confidence,
    source,
    createdAt: new Date(),
    lastUsedAt: new Date(),
    usageCount: 1
  }))
}));

vi.mock('$lib/services/morphological-analyzer', () => ({
  segmentText: vi.fn(),
  getFuriganaFromMorphology: vi.fn(),
  analyzeText: vi.fn(),
  extractReadings: vi.fn()
}));

vi.mock('$lib/services/llm-service', () => ({
  generateFuriganaWithLLM: vi.fn()
}));

describe('Furigana Generator', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Layer 1: Local Dictionary', () => {
    it('should prioritize vocabulary readings', async () => {
      // Arrange
      const text = '日本語';
      const expectedReading = 'にほんご';
      
      vi.mocked(morphologicalAnalyzer.segmentText).mockResolvedValueOnce(['日本語']);
      vi.mocked(furiganaQueries.getFuriganaFromVocabulary).mockResolvedValueOnce(expectedReading);
      
      // Act
      const result = await generateFurigana(text);
      
      // Assert
      expect(furiganaQueries.getFuriganaFromVocabulary).toHaveBeenCalledWith('日本語');
      expect(result).toEqual([{
        text: '日本語',
        reading: expectedReading,
        start: 0,
        end: 3
      }]);
    });

    it('should use cache readings if vocabulary lookup fails', async () => {
      // Arrange
      const text = '勉強';
      const expectedReading = 'べんきょう';
      
      vi.mocked(morphologicalAnalyzer.segmentText).mockResolvedValueOnce(['勉強']);
      vi.mocked(furiganaQueries.getFuriganaFromVocabulary).mockResolvedValueOnce(undefined);
      vi.mocked(furiganaQueries.getFuriganaFromCache).mockResolvedValueOnce({
        cacheId: 1,
        word: '勉強',
        reading: expectedReading,
        confidence: 85,
        source: 'llm',
        createdAt: new Date(),
        lastUsedAt: new Date(),
        usageCount: 5
      });
      
      // Act
      const result = await generateFurigana(text);
      
      // Assert
      expect(furiganaQueries.getFuriganaFromVocabulary).toHaveBeenCalledWith('勉強');
      expect(furiganaQueries.getFuriganaFromCache).toHaveBeenCalledWith('勉強');
      expect(result).toEqual([{
        text: '勉強',
        reading: expectedReading,
        start: 0,
        end: 2
      }]);
    });
  });

  describe('Layer 2: Morphological Analysis', () => {
    it('should use morphological analysis if local dictionary fails', async () => {
      // Arrange
      const text = '食べます';
      
      vi.mocked(morphologicalAnalyzer.segmentText).mockResolvedValueOnce(['食べます']);
      vi.mocked(furiganaQueries.getFuriganaFromVocabulary).mockResolvedValueOnce(undefined);
      vi.mocked(furiganaQueries.getFuriganaFromCache).mockResolvedValueOnce(undefined);
      vi.mocked(morphologicalAnalyzer.getFuriganaFromMorphology).mockResolvedValueOnce([
        { word: '食べ', reading: 'たべ', confidence: 70 }
      ]);
      
      // Act
      const result = await generateFurigana(text);
      
      // Assert
      expect(morphologicalAnalyzer.getFuriganaFromMorphology).toHaveBeenCalledWith(text);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].reading).toBe('たべ');
    });
  });

  describe('Layer 3: LLM Integration', () => {
    it('should use OpenAI LLM if other layers fail', async () => {
      // Arrange
      const text = '難しい言葉';
      const apiKey = 'test-api-key';
      
      vi.mocked(morphologicalAnalyzer.segmentText).mockResolvedValueOnce(['難しい', '言葉']);
      vi.mocked(furiganaQueries.getFuriganaFromVocabulary).mockResolvedValue(undefined);
      vi.mocked(furiganaQueries.getFuriganaFromCache).mockResolvedValue(undefined);
      vi.mocked(morphologicalAnalyzer.getFuriganaFromMorphology).mockResolvedValueOnce([]);
      vi.mocked(llmService.generateFuriganaWithLLM).mockResolvedValueOnce([
        { text: '難しい', furigana: 'むずかしい' },
        { text: '言葉', furigana: 'ことば' }
      ]);
      
      // Act
      const result = await generateFurigana(text, apiKey);
      
      // Assert
      expect(llmService.generateFuriganaWithLLM).toHaveBeenCalled();
      // Check the parameters individually
      const llmCallArgs = vi.mocked(llmService.generateFuriganaWithLLM).mock.calls[0];
      expect(llmCallArgs[0]).toBe(text); // First parameter should be text
      expect(llmCallArgs[1]).toBe(apiKey); // Second parameter should be apiKey
      expect(llmCallArgs[3]).toBe(false); // Fourth parameter should be mockMode
      
      expect(result.length).toBe(2);
      expect(result[0].reading).toBe('むずかしい');
      expect(result[1].reading).toBe('ことば');
    });

    it('should use mock mode when specified', async () => {
      // Arrange
      const text = '難しい言葉';
      const apiKey = 'test-api-key';
      
      vi.mocked(morphologicalAnalyzer.segmentText).mockResolvedValueOnce(['難しい', '言葉']);
      vi.mocked(furiganaQueries.getFuriganaFromVocabulary).mockResolvedValue(undefined);
      vi.mocked(furiganaQueries.getFuriganaFromCache).mockResolvedValue(undefined);
      vi.mocked(morphologicalAnalyzer.getFuriganaFromMorphology).mockResolvedValueOnce([]);
      vi.mocked(llmService.generateFuriganaWithLLM).mockResolvedValueOnce([
        { text: '難しい', furigana: 'むずかしい' },
        { text: '言葉', furigana: 'ことば' }
      ]);
      
      // Act
      const result = await generateFurigana(text, apiKey, true);
      
      // Assert
      expect(llmService.generateFuriganaWithLLM).toHaveBeenCalled();
      // Check the parameters individually
      const llmCallArgs = vi.mocked(llmService.generateFuriganaWithLLM).mock.calls[0];
      expect(llmCallArgs[0]).toBe(text); // First parameter should be text
      expect(llmCallArgs[1]).toBe(apiKey); // Second parameter should be apiKey
      expect(llmCallArgs[3]).toBe(true); // Fourth parameter should be mockMode
      
      expect(result.length).toBe(2);
      expect(result[0].reading).toBe('むずかしい');
      expect(result[1].reading).toBe('ことば');
    });
  });

  describe('Learning and Correction System', () => {
    it('should store corrections with maximum confidence', async () => {
      // Arrange
      const text = '漢字';
      const originalReading = 'かんじ';
      const correctedReading = 'かんじ';  // Same in this case but could be different
      
      // Act
      const result = await applyFuriganaCorrection(text, originalReading, correctedReading);
      
      // Assert
      expect(furiganaQueries.storeFuriganaInCache).toHaveBeenCalledWith(
        text, correctedReading, 100, 'user'
      );
      expect(result.confidence).toBe(100);
      expect(result.source).toBe('user');
    });
  });

  describe('Mixed Input Scenarios', () => {
    it('should handle mixed text with kanji and non-kanji', async () => {
      // Arrange
      const text = '私はすしが好きです';
      
      vi.mocked(morphologicalAnalyzer.segmentText).mockResolvedValueOnce([
        '私', 'は', 'すし', 'が', '好き', 'です'
      ]);
      
      // Mock vocabulary hits for some words
      vi.mocked(furiganaQueries.getFuriganaFromVocabulary).mockImplementation(async (word) => {
        if (word === '私') return 'わたし';
        if (word === '好き') return 'すき';
        return undefined;
      });
      
      // Mock morphology to return empty array - skip this layer
      vi.mocked(morphologicalAnalyzer.getFuriganaFromMorphology).mockResolvedValue([]);
      
      // Act
      const result = await generateFurigana(text);
      
      // Assert
      // Should only have furigana for kanji characters
      const kanjiResults = result.filter(item => item.text === '私' || item.text === '好き');
      expect(kanjiResults.length).toBe(2);
      expect(kanjiResults[0].reading).toBe('わたし');
      expect(kanjiResults[1].reading).toBe('すき');
    });

    it('should correctly position furigana in a complex sentence', async () => {
      // Arrange
      const text = '東京に行きました。';
      
      vi.mocked(morphologicalAnalyzer.segmentText).mockResolvedValueOnce([
        '東京', 'に', '行き', 'まし', 'た', '。'
      ]);
      
      vi.mocked(furiganaQueries.getFuriganaFromVocabulary).mockImplementation(async (word) => {
        if (word === '東京') return 'とうきょう';
        if (word === '行き') return 'いき';
        return undefined;
      });
      
      // Mock morphology to return empty array - skip this layer
      vi.mocked(morphologicalAnalyzer.getFuriganaFromMorphology).mockResolvedValue([]);
      
      // Act
      const result = await generateFurigana(text);
      
      // Assert
      expect(result.length).toBe(2);
      expect(result[0]).toEqual({
        text: '東京',
        reading: 'とうきょう',
        start: 0,
        end: 2
      });
      expect(result[1]).toEqual({
        text: '行き',
        reading: 'いき',
        start: 3,
        end: 5
      });
    });
  });
}); 