<script lang="ts">
  import type { FuriganaItem } from '$lib/db/types';
  import { parseFuriganaData } from '$lib/db/queries/sentences';
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';
  
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
  let copyFeedback = '';
  let feedbackTimeout: ReturnType<typeof setTimeout> | null = null;
  
  // Function to copy text to clipboard
  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      console.log('Copied to clipboard:', text);
      
      // Show feedback message
      copyFeedback = `"${text}" copied`;
      
      // Clear any existing timeout
      if (feedbackTimeout) {
        clearTimeout(feedbackTimeout);
      }
      
      // Hide feedback after 2 seconds
      feedbackTimeout = setTimeout(() => {
        copyFeedback = '';
      }, 2000);
    })
    .catch(err => {
      console.error('Failed to copy text: ', err);
    });
  }
  
  // Clean up on unmount
  onMount(() => {
    return () => {
      if (feedbackTimeout) {
        clearTimeout(feedbackTimeout);
      }
    };
  });
  
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
      return text; // No furigana data, so return plain text without any clickable elements
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
      
      // Get the smart furigana representation with the whole word clickable
      const processedText = applySmartFurigana(originalText, item.reading);
      
      // Replace the text
      result = `${before}${processedText}${after}`;
    }
    
    return result;
  }
  
  // Apply furigana to words and make the entire word clickable
  function applySmartFurigana(word: string, reading: string | undefined): string {
    if (!word || !reading) return word;
    
    // If there are no kanji in the word, return the original word
    if (!Array.from(word).some(isKanji)) return word;
    
    // Make the entire word clickable by wrapping it in a span
    // For any word with kanji, apply the reading to the entire word
    return `<ruby><span class="kanji-clickable" onclick="document.dispatchEvent(new CustomEvent('copyKanji', {detail: '${word}'}))">
      ${word}</span><rt>${reading}</rt></ruby>`;
  }
  
  // Set up event listener for kanji copy events
  onMount(() => {
    const handleCopyKanji = (event: CustomEvent<string>) => {
      const kanji = event.detail;
      copyToClipboard(kanji);
    };
    
    document.addEventListener('copyKanji', handleCopyKanji as EventListener);
    
    return () => {
      document.removeEventListener('copyKanji', handleCopyKanji as EventListener);
    };
  });
</script>

{#if parsedFuriganaData.length > 0}
  <span class="furigana-text">
    {@html renderFurigana(text, parsedFuriganaData)}
  </span>
{:else}
  <span class="plain-text">
    {text}
  </span>
{/if}

{#if copyFeedback}
  <div class="copy-feedback" transition:fade={{ duration: 200 }}>
    {copyFeedback}
  </div>
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
  
  :global(.kanji-clickable) {
    cursor: pointer;
    color: #4a6fa5;
    transition: background-color 0.2s, color 0.2s;
    border-radius: 2px;
    display: inline-block;
  }
  
  :global(.kanji-clickable:hover) {
    background-color: #e7f2ff;
    color: #1a4a8e;
  }
  
  .copy-feedback {
    position: fixed;
    bottom: 20px;
    right: 20px;
    background-color: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 8px 16px;
    border-radius: 4px;
    font-size: 14px;
    z-index: 1000;
    pointer-events: none;
  }
</style> 