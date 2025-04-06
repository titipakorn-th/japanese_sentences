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

// Internal type with metadata
type FuriganaWithMetadata = FuriganaItem & {
  confidence: number;
  source: FuriganaSource;
};

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
  
  // Step 2: If no results from dictionary/cache, try morphological analysis
  if (results.length === 0) {
    const morphologyResults = await getFuriganaFromMorphology(text);
    
    if (Array.isArray(morphologyResults)) {
      for (const result of morphologyResults) {
        const textIndex = text.indexOf(result.word);
        if (textIndex === -1) continue;
        
        const textEnd = textIndex + result.word.length;
        
        results.push({
          text: result.word,
          reading: result.reading,
          confidence: CONFIDENCE.MORPHOLOGY,
          source: 'morphology',
          start: textIndex,
          end: textEnd
        });
        
        processedRanges.push({ start: textIndex, end: textEnd });
      }
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
 * Apply a correction to furigana
 */
export async function applyFuriganaCorrection(
  text: string,
  originalReading: string,
  correctedReading: string
): Promise<FuriganaWithMetadata> {
  // Import here to avoid circular dependency
  const { storeFuriganaInCache } = await import('$lib/db/queries/furigana');
  
  // Store the correction in cache with maximum confidence
  const result = await storeFuriganaInCache(
    text,
    correctedReading,
    CONFIDENCE.VOCABULARY, // User corrections get maximum confidence
    'user'
  );
  
  // Return the result with metadata
  return {
    text,
    reading: correctedReading,
    confidence: result.confidence,
    source: 'user',
    start: 0,
    end: text.length
  };
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
    // If this range overlaps with an existing one
    if (
      (start >= range.start && start < range.end) ||
      (end > range.start && end <= range.end) ||
      (start <= range.start && end >= range.end)
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Check if there are still unprocessed kanji in the text
 */
function hasUnprocessedKanji(
  text: string,
  processedRanges: { start: number; end: number }[]
): boolean {
  for (let i = 0; i < text.length; i++) {
    // Check if this character is a kanji
    if (/[\u4e00-\u9faf]/.test(text[i])) {
      // Check if this position is in a processed range
      let isProcessed = false;
      for (const range of processedRanges) {
        if (i >= range.start && i < range.end) {
          isProcessed = true;
          break;
        }
      }
      if (!isProcessed) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Get text that hasn't been processed yet
 */
function getUnprocessedText(
  text: string,
  processedRanges: { start: number; end: number }[]
): string {
  // If nothing has been processed, return the entire text
  if (processedRanges.length === 0) {
    return text;
  }
  
  // Sort ranges by start position
  const sortedRanges = [...processedRanges].sort((a, b) => a.start - b.start);
  
  // Collect unprocessed segments
  let result = '';
  let currentPos = 0;
  
  for (const range of sortedRanges) {
    if (range.start > currentPos) {
      // Add the unprocessed segment
      result += text.substring(currentPos, range.start);
    }
    currentPos = Math.max(currentPos, range.end);
  }
  
  // Add any remaining text
  if (currentPos < text.length) {
    result += text.substring(currentPos);
  }
  
  return result;
} 