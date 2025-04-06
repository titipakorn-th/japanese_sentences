import { db } from '$lib/db';
import { furiganaCache, vocabulary } from '$lib/db/schema';
import type { FuriganaCache } from '$lib/db/types';
import { eq, and, desc } from 'drizzle-orm';

/**
 * Get furigana reading for a word from cache
 */
export async function getFuriganaFromCache(word: string): Promise<FuriganaCache | undefined> {
  const result = await db.query.furiganaCache.findFirst({
    where: eq(furiganaCache.word, word),
    orderBy: [desc(furiganaCache.confidence)],
  });
  
  if (result) {
    // Update usage statistics
    await db.update(furiganaCache)
      .set({
        lastUsedAt: new Date(),
        usageCount: (result.usageCount ?? 0) + 1,
      })
      .where(eq(furiganaCache.cacheId, result.cacheId));
  }
  
  return result as FuriganaCache | undefined;
}

/**
 * Get furigana reading for a word from vocabulary
 */
export async function getFuriganaFromVocabulary(word: string): Promise<string | undefined> {
  const result = await db.query.vocabulary.findFirst({
    where: eq(vocabulary.word, word),
  });
  
  return result?.reading;
}

/**
 * Store furigana in cache
 */
export async function storeFuriganaInCache(
  word: string, 
  reading: string, 
  confidence: number = 50, 
  source: string = 'system'
): Promise<FuriganaCache> {
  // Check if entry already exists
  const existing = await db.query.furiganaCache.findFirst({
    where: and(
      eq(furiganaCache.word, word),
      eq(furiganaCache.reading, reading)
    ),
  });
  
  if (existing) {
    // Update existing entry
    const result = await db.update(furiganaCache)
      .set({
        confidence: Math.max(existing.confidence ?? 0, confidence), // Keep highest confidence
        lastUsedAt: new Date(),
        usageCount: (existing.usageCount ?? 0) + 1,
      })
      .where(eq(furiganaCache.cacheId, existing.cacheId))
      .returning();
      
    return result[0] as FuriganaCache;
  } else {
    // Create new entry
    const result = await db.insert(furiganaCache)
      .values({
        word,
        reading,
        confidence,
        source,
        createdAt: new Date(),
        lastUsedAt: new Date(),
        usageCount: 1,
      })
      .returning();
      
    return result[0] as FuriganaCache;
  }
}

/**
 * Update furigana confidence in cache
 */
export async function updateFuriganaConfidence(
  word: string,
  reading: string,
  confidence: number,
  source: string = 'user'
): Promise<FuriganaCache | undefined> {
  const existing = await db.query.furiganaCache.findFirst({
    where: and(
      eq(furiganaCache.word, word),
      eq(furiganaCache.reading, reading)
    ),
  });
  
  if (existing) {
    const result = await db.update(furiganaCache)
      .set({
        confidence,
        source,
        lastUsedAt: new Date(),
      })
      .where(eq(furiganaCache.cacheId, existing.cacheId))
      .returning();
      
    return result[0] as FuriganaCache;
  }
  
  return undefined;
}

/**
 * Delete furigana from cache
 */
export async function deleteFuriganaFromCache(cacheId: number): Promise<boolean> {
  try {
    await db.delete(furiganaCache).where(eq(furiganaCache.cacheId, cacheId));
    return true;
  } catch (error) {
    console.error('Error deleting furigana from cache:', error);
    return false;
  }
} 