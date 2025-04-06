import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  getFuriganaFromCache, 
  getFuriganaFromVocabulary, 
  storeFuriganaInCache,
  updateFuriganaConfidence,
  deleteFuriganaFromCache
} from '$lib/db/queries/furigana';
import { db } from '$lib/db';

// Mock the database
vi.mock('$lib/db', () => ({
  db: {
    query: {
      furiganaCache: {
        findFirst: vi.fn()
      },
      vocabulary: {
        findFirst: vi.fn()
      }
    },
    update: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn()
  }
}));

describe('Furigana Cache Queries', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getFuriganaFromCache', () => {
    it('should return furigana from cache', async () => {
      // Arrange
      const mockResult = {
        cacheId: 1,
        word: '日本語',
        reading: 'にほんご',
        confidence: 85,
        source: 'llm',
        createdAt: new Date(),
        lastUsedAt: new Date(),
        usageCount: 5
      };
      
      vi.mocked(db.query.furiganaCache.findFirst).mockResolvedValueOnce(mockResult);
      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({})
        })
      } as any);
      
      // Act
      const result = await getFuriganaFromCache('日本語');
      
      // Assert
      expect(db.query.furiganaCache.findFirst).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });

    it('should update usage statistics when getting from cache', async () => {
      // Arrange
      const mockResult = {
        cacheId: 1,
        word: '勉強',
        reading: 'べんきょう',
        confidence: 70,
        source: 'morphology',
        createdAt: new Date(),
        lastUsedAt: new Date(),
        usageCount: 3
      };
      
      vi.mocked(db.query.furiganaCache.findFirst).mockResolvedValueOnce(mockResult);
      const setMock = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({})
      });
      vi.mocked(db.update).mockReturnValue({
        set: setMock
      } as any);
      
      // Act
      await getFuriganaFromCache('勉強');
      
      // Assert
      expect(db.update).toHaveBeenCalled();
      expect(setMock).toHaveBeenCalledWith(expect.objectContaining({
        usageCount: 4 // 3 + 1
      }));
    });
  });

  describe('getFuriganaFromVocabulary', () => {
    it('should return reading from vocabulary', async () => {
      // Arrange
      const mockResult = {
        vocabId: 1,
        word: '日本語',
        reading: 'にほんご',
        meaning: '日本の言葉',
        partOfSpeech: 'noun',
        jlptLevel: 5,
        addedAt: new Date(),
        source: 'system'
      };
      
      vi.mocked(db.query.vocabulary.findFirst).mockResolvedValueOnce(mockResult);
      
      // Act
      const result = await getFuriganaFromVocabulary('日本語');
      
      // Assert
      expect(db.query.vocabulary.findFirst).toHaveBeenCalled();
      expect(result).toBe('にほんご');
    });

    it('should return undefined if word not found in vocabulary', async () => {
      // Arrange
      vi.mocked(db.query.vocabulary.findFirst).mockResolvedValueOnce(undefined);
      
      // Act
      const result = await getFuriganaFromVocabulary('不明な単語');
      
      // Assert
      expect(result).toBeUndefined();
    });
  });

  describe('storeFuriganaInCache', () => {
    it('should update existing entry if it exists', async () => {
      // Arrange
      const existingEntry = {
        cacheId: 1,
        word: '漢字',
        reading: 'かんじ',
        confidence: 70,
        source: 'morphology',
        createdAt: new Date(),
        lastUsedAt: new Date(),
        usageCount: 2
      };
      
      const updatedEntry = {
        ...existingEntry,
        confidence: 85, // Keep highest confidence
        usageCount: 3   // Increment usage count
      };
      
      vi.mocked(db.query.furiganaCache.findFirst).mockResolvedValueOnce(existingEntry);
      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValueOnce([updatedEntry])
          })
        })
      } as any);
      
      // Act
      const result = await storeFuriganaInCache('漢字', 'かんじ', 85, 'llm');
      
      // Assert
      expect(db.update).toHaveBeenCalled();
      expect(result).toEqual(updatedEntry);
    });

    it('should create new entry if it does not exist', async () => {
      // Arrange
      const newEntry = {
        cacheId: 2,
        word: '新しい',
        reading: 'あたらしい',
        confidence: 85,
        source: 'llm',
        createdAt: new Date(),
        lastUsedAt: new Date(),
        usageCount: 1
      };
      
      vi.mocked(db.query.furiganaCache.findFirst).mockResolvedValueOnce(undefined);
      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValueOnce([newEntry])
        })
      } as any);
      
      // Act
      const result = await storeFuriganaInCache('新しい', 'あたらしい', 85, 'llm');
      
      // Assert
      expect(db.insert).toHaveBeenCalled();
      expect(result).toEqual(newEntry);
    });
  });

  describe('updateFuriganaConfidence', () => {
    it('should update confidence for existing entry', async () => {
      // Arrange
      const existingEntry = {
        cacheId: 1,
        word: '日本語',
        reading: 'にほんご',
        confidence: 85,
        source: 'llm',
        createdAt: new Date(),
        lastUsedAt: new Date(),
        usageCount: 5
      };
      
      const updatedEntry = {
        ...existingEntry,
        confidence: 100,
        source: 'user'
      };
      
      vi.mocked(db.query.furiganaCache.findFirst).mockResolvedValueOnce(existingEntry);
      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValueOnce([updatedEntry])
          })
        })
      } as any);
      
      // Act
      const result = await updateFuriganaConfidence('日本語', 'にほんご', 100, 'user');
      
      // Assert
      expect(db.update).toHaveBeenCalled();
      expect(result).toEqual(updatedEntry);
    });

    it('should return undefined if entry does not exist', async () => {
      // Arrange
      vi.mocked(db.query.furiganaCache.findFirst).mockResolvedValueOnce(undefined);
      
      // Act
      const result = await updateFuriganaConfidence('不明', 'ふめい', 100, 'user');
      
      // Assert
      expect(result).toBeUndefined();
    });
  });

  describe('deleteFuriganaFromCache', () => {
    it('should delete entry from cache', async () => {
      // Arrange
      vi.mocked(db.delete).mockReturnValue({
        where: vi.fn().mockResolvedValueOnce(undefined)
      } as any);
      
      // Act
      const result = await deleteFuriganaFromCache(1);
      
      // Assert
      expect(db.delete).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should handle errors', async () => {
      // Arrange
      vi.mocked(db.delete).mockReturnValue({
        where: vi.fn().mockImplementation(() => {
          throw new Error('Database error');
        })
      } as any);
      
      // Act
      const result = await deleteFuriganaFromCache(1);
      
      // Assert
      expect(result).toBe(false);
    });
  });
}); 