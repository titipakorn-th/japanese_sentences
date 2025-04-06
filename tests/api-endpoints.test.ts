import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST as generateFuriganaHandler } from '$lib/../routes/api/furigana/generate/+server';
import { POST as updateFuriganaHandler } from '$lib/../routes/api/furigana/update/+server';
import { POST as sentenceFuriganaHandler } from '$lib/../routes/api/sentences/[id]/furigana/+server';
import * as furiganaGenerator from '$lib/services/furigana-generator';
import * as sentenceQueries from '$lib/db/queries/sentences';
import { json } from '@sveltejs/kit';

// Mock modules
vi.mock('$lib/services/furigana-generator', () => ({
  generateFurigana: vi.fn(),
  applyFuriganaCorrection: vi.fn()
}));

vi.mock('$lib/db/queries/sentences', () => ({
  getSentenceById: vi.fn(),
  updateSentence: vi.fn()
}));

vi.mock('@sveltejs/kit', () => ({
  json: vi.fn(data => data)
}));

vi.mock('$env/dynamic/private', () => ({
  env: {
    OPENAI_API_KEY: 'test-openai-key'
  }
}));

describe('API Endpoints', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /api/furigana/generate', () => {
    it('should generate furigana and return it as JSON', async () => {
      // Arrange
      const mockRequest = {
        json: vi.fn().mockResolvedValue({
          text: '日本語'
        })
      };
      
      const mockFuriganaResult = [
        { text: '日本語', reading: 'にほんご', start: 0, end: 3 }
      ];
      
      vi.mocked(furiganaGenerator.generateFurigana).mockResolvedValueOnce(mockFuriganaResult);
      
      // Act
      const response = await generateFuriganaHandler({ request: mockRequest } as any);
      
      // Assert
      expect(furiganaGenerator.generateFurigana).toHaveBeenCalledWith(
        '日本語', 'test-openai-key', false
      );
      expect(json).toHaveBeenCalledWith({ furigana: mockFuriganaResult });
      expect(response).toEqual({ furigana: mockFuriganaResult });
    });

    it('should use mock mode when specified', async () => {
      // Arrange
      const mockRequest = {
        json: vi.fn().mockResolvedValue({
          text: '日本語',
          useMockLLM: true
        })
      };
      
      const mockFuriganaResult = [
        { text: '日本語', reading: 'にほんご', start: 0, end: 3 }
      ];
      
      vi.mocked(furiganaGenerator.generateFurigana).mockResolvedValueOnce(mockFuriganaResult);
      
      // Act
      const response = await generateFuriganaHandler({ request: mockRequest } as any);
      
      // Assert
      expect(furiganaGenerator.generateFurigana).toHaveBeenCalledWith(
        '日本語', 'test-openai-key', true
      );
      expect(response).toEqual({ furigana: mockFuriganaResult });
    });

    it('should return 400 error if text is missing', async () => {
      // Arrange
      const mockRequest = {
        json: vi.fn().mockResolvedValue({
          useMockLLM: true
        })
      };
      
      vi.mocked(json).mockImplementationOnce((data, options) => {
        return { ...data, status: options?.status };
      });
      
      // Act
      const response = await generateFuriganaHandler({ request: mockRequest } as any);
      
      // Assert
      expect(response).toEqual({
        error: 'Text is required',
        status: 400
      });
    });
  });

  describe('POST /api/furigana/update', () => {
    it('should apply corrections to furigana', async () => {
      // Arrange
      const mockRequest = {
        json: vi.fn().mockResolvedValue({
          text: '漢字',
          reading: 'かんじ',
          correctedReading: 'かんじ'
        })
      };
      
      vi.mocked(furiganaGenerator.applyFuriganaCorrection).mockResolvedValueOnce({
        text: '漢字',
        reading: 'かんじ',
        confidence: 100,
        source: 'user',
        start: 0,
        end: 2
      });
      
      // Act
      const response = await updateFuriganaHandler({ request: mockRequest } as any);
      
      // Assert
      expect(furiganaGenerator.applyFuriganaCorrection).toHaveBeenCalledWith(
        '漢字', 'かんじ', 'かんじ'
      );
      expect(json).toHaveBeenCalledWith({ success: true });
      expect(response).toEqual({ success: true });
    });

    it('should return 400 error if required fields are missing', async () => {
      // Arrange
      const mockRequest = {
        json: vi.fn().mockResolvedValue({
          text: '漢字'
          // Missing correctedReading
        })
      };
      
      vi.mocked(json).mockImplementationOnce((data, options) => {
        return { ...data, status: options?.status };
      });
      
      // Act
      const response = await updateFuriganaHandler({ request: mockRequest } as any);
      
      // Assert
      expect(response).toEqual({
        error: 'Text and correctedReading are required',
        status: 400
      });
    });
  });

  describe('POST /api/sentences/[id]/furigana', () => {
    it('should generate furigana for a sentence and save it', async () => {
      // Arrange
      const mockParams = { id: '1' };
      const mockRequest = {
        json: vi.fn().mockResolvedValue({})
      };
      
      const mockSentence = {
        sentenceId: 1,
        sentence: '日本語を勉強しています',
        translation: 'I am studying Japanese',
        furiganaData: undefined,
        createdAt: new Date(),
        llmProcessed: false
      };
      
      const mockFuriganaResult = [
        { text: '日本語', reading: 'にほんご', start: 0, end: 3 },
        { text: '勉強', reading: 'べんきょう', start: 4, end: 6 }
      ];
      
      vi.mocked(sentenceQueries.getSentenceById).mockResolvedValueOnce(mockSentence);
      vi.mocked(furiganaGenerator.generateFurigana).mockResolvedValueOnce(mockFuriganaResult);
      vi.mocked(sentenceQueries.updateSentence).mockResolvedValueOnce({
        ...mockSentence,
        furiganaData: JSON.stringify(mockFuriganaResult),
        llmProcessed: true
      });
      
      // Act
      const response = await sentenceFuriganaHandler({ 
        params: mockParams, 
        request: mockRequest 
      } as any);
      
      // Assert
      expect(sentenceQueries.getSentenceById).toHaveBeenCalledWith(1);
      expect(furiganaGenerator.generateFurigana).toHaveBeenCalledWith(
        '日本語を勉強しています', 'test-openai-key', false
      );
      expect(sentenceQueries.updateSentence).toHaveBeenCalledWith(
        1,
        {
          furiganaData: JSON.stringify(mockFuriganaResult),
          llmProcessed: true
        }
      );
      expect(response).toEqual({
        success: true,
        sentenceId: 1,
        furigana: mockFuriganaResult
      });
    });

    it('should use mock mode when specified', async () => {
      // Arrange
      const mockParams = { id: '1' };
      const mockRequest = {
        json: vi.fn().mockResolvedValue({
          useMockLLM: true
        })
      };
      
      const mockSentence = {
        sentenceId: 1,
        sentence: '日本語を勉強しています',
        translation: 'I am studying Japanese',
        furiganaData: undefined,
        createdAt: new Date(),
        llmProcessed: false
      };
      
      const mockFuriganaResult = [
        { text: '日本語', reading: 'にほんご', start: 0, end: 3 },
        { text: '勉強', reading: 'べんきょう', start: 4, end: 6 }
      ];
      
      vi.mocked(sentenceQueries.getSentenceById).mockResolvedValueOnce(mockSentence);
      vi.mocked(furiganaGenerator.generateFurigana).mockResolvedValueOnce(mockFuriganaResult);
      vi.mocked(sentenceQueries.updateSentence).mockResolvedValueOnce({
        ...mockSentence,
        furiganaData: JSON.stringify(mockFuriganaResult),
        llmProcessed: true
      });
      
      // Act
      const response = await sentenceFuriganaHandler({ 
        params: mockParams, 
        request: mockRequest 
      } as any);
      
      // Assert
      expect(furiganaGenerator.generateFurigana).toHaveBeenCalledWith(
        '日本語を勉強しています', 'test-openai-key', true
      );
      expect(response).toEqual({
        success: true,
        sentenceId: 1,
        furigana: mockFuriganaResult
      });
    });

    it('should return 400 error if sentence ID is invalid', async () => {
      // Arrange
      const mockParams = { id: 'not-a-number' };
      const mockRequest = {
        json: vi.fn().mockResolvedValue({})
      };
      
      vi.mocked(json).mockImplementationOnce((data, options) => {
        return { ...data, status: options?.status };
      });
      
      // Act
      const response = await sentenceFuriganaHandler({ 
        params: mockParams, 
        request: mockRequest 
      } as any);
      
      // Assert
      expect(response).toEqual({
        error: 'Invalid sentence ID',
        status: 400
      });
    });

    it('should return 404 error if sentence is not found', async () => {
      // Arrange
      const mockParams = { id: '999' };
      const mockRequest = {
        json: vi.fn().mockResolvedValue({})
      };
      
      vi.mocked(sentenceQueries.getSentenceById).mockResolvedValueOnce(undefined);
      vi.mocked(json).mockImplementationOnce((data, options) => {
        return { ...data, status: options?.status };
      });
      
      // Act
      const response = await sentenceFuriganaHandler({ 
        params: mockParams, 
        request: mockRequest 
      } as any);
      
      // Assert
      expect(response).toEqual({
        error: 'Sentence not found',
        status: 404
      });
    });
  });
}); 