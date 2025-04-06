<script lang="ts">
  import type { FuriganaItem } from '$lib/db/types';
  import { parseFuriganaData } from '$lib/db/queries/sentences';
  
  export let text: string;
  export let furiganaData: string | FuriganaItem[] = [];
  
  // Parse furigana data if it's a string (JSON)
  $: {
    console.log('Furigana component received data:', furiganaData);
    if (typeof furiganaData === 'string') {
      parsedFuriganaData = parseFuriganaData(furiganaData);
      console.log('Parsed furigana data from JSON string:', parsedFuriganaData);
    } else if (Array.isArray(furiganaData)) {
      parsedFuriganaData = furiganaData;
      console.log('Using array furigana data directly:', parsedFuriganaData);
    } else {
      console.warn('Unexpected furigana data format:', typeof furiganaData);
      parsedFuriganaData = [];
    }
  }
  
  let parsedFuriganaData: FuriganaItem[] = [];
  
  // Check if a character is a kanji
  function isKanji(char: string): boolean {
    const code = char.charCodeAt(0);
    // CJK Unified Ideographs range for common kanji
    return (code >= 0x4E00 && code <= 0x9FFF);
  }
  
  // Check if a character is hiragana
  function isHiragana(char: string): boolean {
    const code = char.charCodeAt(0);
    return code >= 0x3040 && code <= 0x309F;
  }
  
  // Function to render text with furigana
  function renderFurigana(text: string, data: FuriganaItem[]): string {
    if (!data || data.length === 0) {
      console.log('No furigana data to render, returning plain text');
      return text;
    }
    
    console.log('Rendering furigana for text:', text, 'with data:', data);
    
    // Filter out items with no reading
    const validData = data.filter(item => !!item.reading);
    
    // Sort by start position (ascending) and then by length (descending)
    const sortedData = [...validData].sort((a, b) => {
      if (a.start !== b.start) {
        return a.start - b.start; // ascending start position
      }
      return (b.end - b.start) - (a.end - a.start); // descending length
    });
    
    // Keep track of processed ranges to avoid overlaps
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
      const originalText = text.slice(item.start, item.end);
      const before = result.slice(0, item.start);
      const after = result.slice(item.end);
      
      // Get the smart furigana representation
      const processedText = applySmartFurigana(originalText, item.reading);
      
      // Replace the text
      result = `${before}${processedText}${after}`;
    }
    
    return result;
  }
  
  // Apply furigana only to kanji characters in a word
  function applySmartFurigana(word: string, reading: string | undefined): string {
    if (!word || !reading) return word;
    
    // If there are no kanji in the word, return the original word
    if (!Array.from(word).some(isKanji)) return word;
    
    // If the word is a single kanji, directly apply furigana
    if (word.length === 1 && isKanji(word)) {
      return `<ruby>${word}<rt>${reading}</rt></ruby>`;
    }
    
    // Convert to character arrays
    const chars = Array.from(word);
    
    // Special case for words with kanji separated by hiragana like "引っ越す"
    // We need to match individual kanji with their correct readings
    const kanjiPositions = chars.map((char, idx) => isKanji(char) ? idx : -1).filter(pos => pos !== -1);
    
    // If there are multiple kanji but they're not consecutive, we need special handling
    if (kanjiPositions.length > 1 && 
        (kanjiPositions[kanjiPositions.length-1] - kanjiPositions[0]) > kanjiPositions.length - 1) {
      
      // This is a case like "引っ越せる" where kanji are separated
      
      // For cases like "引っ越せる" -> "ひっこせる"
      // We need to split the reading appropriately
      if (word.includes('っ') && reading && reading.includes('っ')) {
        // In a pattern like 引っ越す (hikkosu), we know:
        // - 引 is likely "hi"
        // - っ is the small tsu
        // - 越 is likely "ko"
        // - す is the verb ending
        
        const result = [];
        const readingChars = Array.from(reading);
        
        // Find positions of 'っ' in both the word and reading
        const tsuPositionInWord = word.indexOf('っ');
        const tsuPositionInReading = reading.indexOf('っ');
        
        // For a pattern like "引っ越す" (hikkosu):
        // - First kanji (引) gets reading up to っ ("hi")
        // - Second kanji (越) gets reading after っ up to any hiragana endings
        
        if (tsuPositionInWord > 0 && tsuPositionInReading > 0) {
          // Process each character
          for (let i = 0; i < chars.length; i++) {
            const char = chars[i];
            
            if (isKanji(char)) {
              // This is a kanji - determine its reading based on position
              
              // First kanji (before っ)
              if (i < tsuPositionInWord) {
                const firstKanjiReading = reading.substring(0, tsuPositionInReading);
                result.push(`<ruby>${char}<rt>${firstKanjiReading}</rt></ruby>`);
              } 
              // Second kanji (after っ)
              else {
                // Extract appropriate reading portion
                // Find the hiragana suffix in the word after this kanji
                const kanjiEndPosition = i + 1;
                const hiraganaEnding = chars.slice(kanjiEndPosition).join('');
                
                // If hiragana ending exists and is in the reading
                if (hiraganaEnding && reading.endsWith(hiraganaEnding)) {
                  // Extract everything from after っ to before the hiragana ending
                  const endingStartInReading = reading.length - hiraganaEnding.length;
                  const secondKanjiReading = reading.substring(
                    tsuPositionInReading + 1, 
                    endingStartInReading
                  );
                  result.push(`<ruby>${char}<rt>${secondKanjiReading}</rt></ruby>`);
                } else {
                  // No matching hiragana suffix - use everything after っ
                  const secondKanjiReading = reading.substring(tsuPositionInReading + 1);
                  result.push(`<ruby>${char}<rt>${secondKanjiReading}</rt></ruby>`);
                }
              }
            } else {
              // For hiragana, just add the character as is
              result.push(char);
            }
          }
          
          return result.join('');
        }
        
        // Fallback for more complex patterns - previous implementation
        const result2 = [];
        let readingIdx = 0;
        let readingChars2 = Array.from(reading);
        
        // Process each character in the original word
        for (let i = 0; i < chars.length; i++) {
          const char = chars[i];
          
          if (isKanji(char)) {
            // This is a kanji - we need to determine its reading
            
            // Special logic for first kanji
            if (i === kanjiPositions[0]) {
              // For the first kanji, use characters up to the っ
              const tsuPosition = reading.indexOf('っ');
              if (tsuPosition > 0) {
                const firstKanjiReading = reading.substring(0, tsuPosition);
                result2.push(`<ruby>${char}<rt>${firstKanjiReading}</rt></ruby>`);
                readingIdx = tsuPosition;
                continue;
              }
            }
            
            // For other kanji, try to estimate based on position
            // This is a simplified approach that won't work for all cases
            
            // Find how many non-kanji characters until the next kanji
            let nextKanjiPosition = -1;
            for (let j = i + 1; j < chars.length; j++) {
              if (isKanji(chars[j])) {
                nextKanjiPosition = j;
                break;
              }
            }
            
            let kanjiReading;
            if (nextKanjiPosition === -1) {
              // This is the last kanji - use the rest of the reading minus any
              // hiragana endings that match the word endings
              
              const remainingOriginal = chars.slice(i + 1).join('');
              const remainingReading = readingChars2.slice(readingIdx + 1).join('');
              
              if (remainingOriginal.length > 0 && 
                  remainingReading.endsWith(remainingOriginal)) {
                // The remaining hiragana in the word matches the end of the reading
                const hiraganaLength = remainingOriginal.length;
                kanjiReading = remainingReading.slice(0, -hiraganaLength);
              } else {
                // Just use the next character of the reading as a fallback
                kanjiReading = readingChars2[readingIdx + 1] || '';
                readingIdx += 1;
              }
            } else {
              // There's another kanji later - use one character of reading for now
              // This is a very simplified approach
              kanjiReading = readingChars2[readingIdx + 1] || '';
              readingIdx += 1;
            }
            
            result2.push(`<ruby>${char}<rt>${kanjiReading}</rt></ruby>`);
          } else {
            // For hiragana, just add the character
            result2.push(char);
            
            // Skip past this character in the reading if it matches
            if (readingIdx < readingChars2.length && char === readingChars2[readingIdx]) {
              readingIdx++;
            }
          }
        }
        
        return result2.join('');
      }
    }
    
    // For words with mixed kanji and hiragana:
    // 1. For simple cases like "新しい" (atarashii), we extract the kanji part
    const onlyKanji = chars.filter(isKanji);
    
    // If there's only one kanji, we can identify its reading more easily
    if (onlyKanji.length === 1) {
      const kanjiChar = onlyKanji[0];
      const kanjiIndex = word.indexOf(kanjiChar);
      
      // Apply furigana only to the kanji character
      // For 新しい with reading あたらしい, we only apply あたら to 新
      const hiragana = Array.from(reading);
      
      // Try to guess the reading for the single kanji
      let kanjiReading = "";
      
      // Simple approach: find the position where hiragana in the word matches 
      // the hiragana in the reading, then use the prefix as kanji reading
      const hiraInWord = chars.filter(isHiragana).join('');
      
      // Look for the hiragana part in the full reading
      const hiraIndex = reading.indexOf(hiraInWord);
      
      if (hiraIndex > 0) {
        // If hiragana is found in the reading after some characters,
        // those first characters are likely the kanji reading
        kanjiReading = reading.substring(0, hiraIndex);
      } else {
        // Fallback: use the full reading
        kanjiReading = reading;
      }
      
      // Replace the kanji with ruby annotation
      const result = [...chars];
      result[kanjiIndex] = `<ruby>${kanjiChar}<rt>${kanjiReading}</rt></ruby>`;
      return result.join('');
    } 
    
    // For compound words with multiple kanji like "今月", "自分":
    // Group consecutive kanji together and apply the reading to the group
    
    // First, identify sequences of consecutive kanji
    const result = [];
    let currentKanjiGroup = [];
    let currentKanjiStartIndex = -1;
    
    for (let i = 0; i < chars.length; i++) {
      const char = chars[i];
      if (isKanji(char)) {
        if (currentKanjiGroup.length === 0) {
          // Start of a new kanji group
          currentKanjiStartIndex = i;
        }
        currentKanjiGroup.push(char);
      } else {
        // Not a kanji - if we were collecting a kanji group, finish it
        if (currentKanjiGroup.length > 0) {
          // We have a kanji group to process
          const kanjiGroup = currentKanjiGroup.join('');
          // For compound kanji, apply the reading to the entire group
          result.push(`<ruby>${kanjiGroup}<rt>${reading}</rt></ruby>`);
          currentKanjiGroup = [];
        }
        // Add the non-kanji character as is
        result.push(char);
      }
    }
    
    // Handle any remaining kanji group at the end
    if (currentKanjiGroup.length > 0) {
      const kanjiGroup = currentKanjiGroup.join('');
      result.push(`<ruby>${kanjiGroup}<rt>${reading}</rt></ruby>`);
    }
    
    return result.join('');
  }
</script>

{#if parsedFuriganaData.length > 0}
  <span class="furigana-text">
    {@html renderFurigana(text, parsedFuriganaData)}
  </span>
{:else}
  <span class="plain-text">{text}</span>
{/if}

<style>
  .furigana-text, .plain-text {
    font-family: 'Noto Sans JP', sans-serif;
    line-height: 1.8;
  }
  
  :global(ruby) {
    ruby-position: over;
    ruby-align: center;
  }
  
  :global(rt) {
    font-size: 0.5em;
    color: #6c757d;
    line-height: 1;
  }
</style> 