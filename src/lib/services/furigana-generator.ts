import { getFuriganaFromCache, getFuriganaFromVocabulary } from '$lib/db/queries/furigana';
import { getFuriganaFromMorphology, segmentText } from './morphological-analyzer';
import { generateFuriganaWithLLM, type FuriganaResult } from './llm-service';
import type { FuriganaItem } from '$lib/db/types';

// Define source confidence levels
const CONFIDENCE = {
  VOCABULARY: 100, // Highest confidence for direct vocabulary matches
  CACHE_HIGH: 90,  // High confidence cached entries (user corrected)
  LLM: 85,         // LLM-generated readings
  MORPHOLOGY: 70,  // Morphological analysis
  CACHE_LOW: 50    // Lower confidence cached entries
};

// Define FuriganaSource type
export type FuriganaSource = 'vocabulary' | 'cache' | 'morphology' | 'llm' | 'user';

// Define FuriganaWithMetadata type
export interface FuriganaWithMetadata {
  text: string;
  reading: string;
  confidence: number;
  source: FuriganaSource;
  start: number;
  end: number;
}

/**
 * Generate furigana for text with multilayered approach
 */
export async function generateFurigana(
  text: string,
  llmApiKey?: string,
  useMockLLM = false
): Promise<FuriganaItem[]> {
  // First, segment the text into words
  const segments = await segmentText(text);
  
  // Results array
  const results: FuriganaWithMetadata[] = [];
  
  // Track which parts of the text have been processed
  const processedRanges: { start: number; end: number }[] = [];
  
  // Process segments
  let currentIndex = 0;
  
  // Step 1: Check local vocabulary and cache first
  for (const segment of segments) {
    const segmentIndex = text.indexOf(segment, currentIndex);
    if (segmentIndex === -1) continue;
    
    const segmentEnd = segmentIndex + segment.length;
    
    // Skip if this segment is hiragana or katakana only (no kanji)
    if (!/[\u4e00-\u9faf]/.test(segment)) {
      currentIndex = segmentEnd;
      continue;
    }
    
    // Layer 1: Check vocabulary database
    const vocabReading = await getFuriganaFromVocabulary(segment);
    if (vocabReading) {
      results.push({
        text: segment,
        reading: vocabReading,
        confidence: CONFIDENCE.VOCABULARY,
        source: 'vocabulary',
        start: segmentIndex,
        end: segmentEnd
      });
      
      processedRanges.push({ start: segmentIndex, end: segmentEnd });
      currentIndex = segmentEnd;
      continue;
    }
    
    // Layer 1: Check furigana cache
    const cachedFurigana = await getFuriganaFromCache(segment);
    if (cachedFurigana) {
      results.push({
        text: segment,
        reading: cachedFurigana.reading,
        confidence: cachedFurigana.confidence,
        source: 'cache',
        start: segmentIndex,
        end: segmentEnd
      });
      
      processedRanges.push({ start: segmentIndex, end: segmentEnd });
      currentIndex = segmentEnd;
      continue;
    }
    
    // Move to next segment if not found in vocabulary or cache
    currentIndex = segmentEnd;
  }
  
  // Step 2: Apply morphological analysis to remaining unprocessed parts
  if (processedRanges.length === 0 || hasUnprocessedRanges(text.length, processedRanges)) {
    const morphologyResults = await getFuriganaFromMorphology(text);
    
    for (const result of morphologyResults) {
      const resultIndex = text.indexOf(result.word);
      if (resultIndex === -1) continue;
      
      const resultEnd = resultIndex + result.word.length;
      
      // Skip if this range is already processed
      if (isRangeProcessed(resultIndex, resultEnd, processedRanges)) continue;
      
      results.push({
        text: result.word,
        reading: result.reading,
        confidence: result.confidence,
        source: 'morphology',
        start: resultIndex,
        end: resultEnd
      });
      
      processedRanges.push({ start: resultIndex, end: resultEnd });
    }
  }
  
  // Step 3: If there are still unprocessed parts with kanji and we have an API key, use LLM
  if (llmApiKey && (processedRanges.length === 0 || hasUnprocessedKanji(text, processedRanges))) {
    // Get remaining text that hasn't been processed
    const remainingText = getUnprocessedText(text, processedRanges);
    
    // Use LLM service with mock mode if enabled
    const llmResults = await generateFuriganaWithLLM(
      remainingText, 
      llmApiKey, 
      'gpt-3.5-turbo', 
      useMockLLM
    );
    
    // Add LLM results
    for (const result of llmResults) {
      if (!result.furigana) continue; // Skip entries without furigana
      
      // Find this text in the original
      const textIndex = text.indexOf(result.text);
      if (textIndex === -1) continue;
      
      const textEnd = textIndex + result.text.length;
      
      // Skip if this range is already processed
      if (isRangeProcessed(textIndex, textEnd, processedRanges)) continue;
      
      results.push({
        text: result.text,
        reading: result.furigana,
        confidence: CONFIDENCE.LLM,
        source: 'llm',
        start: textIndex,
        end: textEnd
      });
      
      processedRanges.push({ start: textIndex, end: textEnd });
    }
  }
  
  // Sort results by start position
  results.sort((a, b) => a.start - b.start);
  
  // Convert to FuriganaItem[]
  return results.map(item => ({
    text: item.text,
    reading: item.reading,
    start: item.start,
    end: item.end
  }));
}

/**
 * Check if there are unprocessed ranges in the text
 */
function hasUnprocessedRanges(
  textLength: number, 
  processedRanges: { start: number; end: number }[]
): boolean {
  if (processedRanges.length === 0) return true;
  
  // Sort ranges by start position
  const sorted = [...processedRanges].sort((a, b) => a.start - b.start);
  
  // Check if there's a gap at the beginning
  if (sorted[0].start > 0) return true;
  
  // Check if there are gaps between ranges
  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i].end < sorted[i + 1].start) return true;
  }
  
  // Check if there's a gap at the end
  return sorted[sorted.length - 1].end < textLength;
}

/**
 * Check if a range is already processed
 */
function isRangeProcessed(
  start: number, 
  end: number, 
  processedRanges: { start: number; end: number }[]
): boolean {
  for (const range of processedRanges) {
    // Check if this range overlaps with any processed range
    if (
      (start >= range.start && start < range.end) || // Start is within a processed range
      (end > range.start && end <= range.end) || // End is within a processed range
      (start <= range.start && end >= range.end) // This range completely contains a processed range
    ) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check if there are unprocessed kanji characters
 */
function hasUnprocessedKanji(
  text: string, 
  processedRanges: { start: number; end: number }[]
): boolean {
  // Get unprocessed text
  const unprocessed = getUnprocessedText(text, processedRanges);
  
  // Check if it contains kanji
  return /[\u4e00-\u9faf]/.test(unprocessed);
}

/**
 * Get unprocessed text
 */
function getUnprocessedText(
  text: string, 
  processedRanges: { start: number; end: number }[]
): string {
  if (processedRanges.length === 0) return text;
  
  // Sort ranges by start position
  const sorted = [...processedRanges].sort((a, b) => a.start - b.start);
  
  let result = '';
  let currentPos = 0;
  
  for (const range of sorted) {
    // Add text before this range
    if (range.start > currentPos) {
      result += text.substring(currentPos, range.start);
    }
    
    // Move current position to the end of this range
    currentPos = range.end;
  }
  
  // Add any remaining text
  if (currentPos < text.length) {
    result += text.substring(currentPos);
  }
  
  return result;
}

/**
 * Apply user correction to furigana
 */
export async function applyFuriganaCorrection(
  text: string,
  reading: string,
  correctedReading: string
): Promise<FuriganaWithMetadata> {
  // Import the function dynamically to avoid circular dependency
  const { storeFuriganaInCache } = await import('$lib/db/queries/furigana');
  
  // Store in cache with maximum confidence
  const cacheResult = await storeFuriganaInCache(text, correctedReading, 100, 'user');
  
  return {
    text,
    reading: correctedReading,
    confidence: 100,
    source: 'user',
    start: 0,
    end: text.length
  };
} 