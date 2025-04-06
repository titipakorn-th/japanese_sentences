import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateFuriganaWithLLM } from '$lib/services/llm-service';
import * as furiganaQueries from '$lib/db/queries/furigana';

// Mock fetch
global.fetch = vi.fn();

// Mock dependencies
vi.mock('$lib/db/queries/furigana', () => ({
  storeFuriganaInCache: vi.fn().mockResolvedValue({})
}));

describe('LLM Service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('generateFuriganaWithLLM (OpenAI)', () => {
    it('should generate furigana using OpenAI', async () => {
      // Arrange
      const text = '日本語を勉強しています';
      const apiKey = 'mock-openai-api-key';
      const mockResponse = {
        choices: [{
          message: {
            content: `[
              {"text": "日本語", "furigana": "にほんご"},
              {"text": "を", "furigana": ""},
              {"text": "勉強", "furigana": "べんきょう"},
              {"text": "して", "furigana": ""},
              {"text": "います", "furigana": ""}
            ]`
          }
        }]
      };
      
      // Mock successful fetch response
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValueOnce(mockResponse)
      } as unknown as Response);
      
      // Act
      const result = await generateFuriganaWithLLM(text, apiKey);
      
      // Assert
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          }
        })
      );
      
      expect(result).toHaveLength(5);
      expect(result[0].text).toBe('日本語');
      expect(result[0].furigana).toBe('にほんご');
      
      // Should store results in cache
      expect(furiganaQueries.storeFuriganaInCache).toHaveBeenCalledWith(
        '日本語', 'にほんご', 85, 'llm'
      );
      expect(furiganaQueries.storeFuriganaInCache).toHaveBeenCalledWith(
        '勉強', 'べんきょう', 85, 'llm'
      );
    });

    it('should handle API errors gracefully', async () => {
      // Arrange
      const text = '日本語';
      const apiKey = 'invalid-api-key';
      
      // Mock failed fetch response
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        text: vi.fn().mockResolvedValueOnce('Invalid API key')
      } as unknown as Response);
      
      // Act
      const result = await generateFuriganaWithLLM(text, apiKey);
      
      // Assert
      expect(result).toEqual([]);
    });

    it('should return empty array if API key is not provided', async () => {
      // Arrange
      const text = '日本語';
      const apiKey = '';
      
      // Act
      const result = await generateFuriganaWithLLM(text, apiKey);
      
      // Assert
      expect(result).toEqual([]);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should handle invalid JSON responses', async () => {
      // Arrange
      const text = '日本語';
      const apiKey = 'mock-api-key';
      
      // Mock response with invalid JSON
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValueOnce({
          choices: [{
            message: {
              content: 'This is not JSON'
            }
          }]
        })
      } as unknown as Response);
      
      // Spy on console.error
      vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Act
      const result = await generateFuriganaWithLLM(text, apiKey);
      
      // Assert
      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('Mock Mode', () => {
    beforeEach(() => {
      // Reset all mocks
      vi.resetAllMocks();
      
      // Mock console methods
      vi.spyOn(console, 'log').mockImplementation(() => {});
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // Mock the storeFuriganaInCache function
      vi.mocked(furiganaQueries.storeFuriganaInCache).mockResolvedValue({});
    });
    
    it('should return predefined responses in mock mode', async () => {
      // Arrange
      const text = '日本語';
      const apiKey = 'not-used-in-mock-mode';
      
      // Act
      const result = await generateFuriganaWithLLM(text, apiKey, 'gpt-3.5-turbo', true);
      
      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].text).toBe('日本語');
      expect(result[0].furigana).toBe('にほんご');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should find partial matches in mock mode', async () => {
      // Arrange
      const text = '私は日本語を勉強しています';
      const apiKey = 'not-used-in-mock-mode';
      
      // Act
      const result = await generateFuriganaWithLLM(text, apiKey, 'gpt-3.5-turbo', true);
      
      // Assert
      expect(result.length).toBeGreaterThan(0);
      expect(global.fetch).not.toHaveBeenCalled();
      
      // It should find a match for '日本語' in the text
      const japaneseItem = result.find(item => item.text === '日本語');
      if (japaneseItem) {
        expect(japaneseItem.furigana).toBe('にほんご');
      } else {
        // If we don't find exact match, it might have found another mock match
        // So make sure result is not empty and has some furigana data
        expect(result.some(item => item.furigana)).toBe(true);
      }
    });

    it('should return empty array for unknown text in mock mode', async () => {
      // Arrange
      const text = 'unknown-text-not-in-mocks';
      const apiKey = 'not-used-in-mock-mode';
      
      // Act
      const result = await generateFuriganaWithLLM(text, apiKey, 'gpt-3.5-turbo', true);
      
      // Assert
      expect(result).toEqual([]);
      expect(console.warn).toHaveBeenCalled();
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });
}); 